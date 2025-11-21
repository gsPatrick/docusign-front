// src/app/(dashboard)/plano/page.js
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/dashboard/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Zap, CreditCard, QrCode, Loader2, Copy, Check } from "lucide-react";

// --- UTILITÁRIOS DE MÁSCARA ---
const masks = {
    card: (v) => v.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim().slice(0, 19),
    expiry: (v) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").slice(0, 5),
    cpf: (v) => v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").slice(0, 14),
    phone: (v) => v.replace(/\D/g, "").replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2").slice(0, 15),
    ccv: (v) => v.replace(/\D/g, "").slice(0, 4),
    // --- NOVO: MÁSCARA DE CEP ---
    cep: (v) => v.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9)
};

// --- COMPONENTE: MODAL DE CHECKOUT ---
function CheckoutDialog({ open, onOpenChange, plan, user }) {
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("CREDIT_CARD");
    const [pixData, setPixData] = useState(null);
    const [copied, setCopied] = useState(false);
    
    // --- ATUALIZADO: Estado com CEP e Número ---
    const [formData, setFormData] = useState({
        holderName: user?.name || "",
        number: "",
        expiry: "",
        ccv: "",
        cpfCnpj: user?.cpf || "",
        phone: user?.phoneWhatsE164 || "",
        postalCode: "", // Novo campo
        addressNumber: "" // Novo campo
    });

    useEffect(() => {
        if (open) {
            setPixData(null);
            setLoading(false);
            // Resetar ou preencher dados iniciais se necessário
        }
    }, [open]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        let formattedValue = value;
        
        // Aplica máscaras
        if (id === 'number') formattedValue = masks.card(value);
        if (id === 'expiry') formattedValue = masks.expiry(value);
        if (id === 'ccv') formattedValue = masks.ccv(value);
        if (id === 'cpfCnpj') formattedValue = masks.cpf(value);
        if (id === 'phone') formattedValue = masks.phone(value);
        // --- NOVO: Máscara de CEP ---
        if (id === 'postalCode') formattedValue = masks.cep(value);

        setFormData(prev => ({ ...prev, [id]: formattedValue }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                planSlug: plan.slug,
                billingType: paymentMethod,
            };

            if (paymentMethod === 'CREDIT_CARD') {
                // Validações básicas no front antes de enviar
                if (!formData.postalCode || formData.postalCode.length < 9) {
                    alert("Por favor, preencha um CEP válido.");
                    setLoading(false);
                    return;
                }

                const [expMonth, expYear] = formData.expiry.split('/');
                
                payload.creditCard = {
                    holderName: formData.holderName,
                    number: formData.number.replace(/\s/g, ""),
                    expiryMonth: expMonth,
                    expiryYear: `20${expYear}`,
                    ccv: formData.ccv
                };
                
                // --- ATUALIZADO: Payload com CEP correto ---
                payload.creditCardHolderInfo = {
                    name: formData.holderName,
                    email: user.email,
                    cpfCnpj: formData.cpfCnpj.replace(/\D/g, ""),
                    postalCode: formData.postalCode.replace(/\D/g, ""), // Envia apenas números
                    addressNumber: formData.addressNumber || "0", // Envia o número ou 0
                    phone: formData.phone.replace(/\D/g, "")
                };
            }

            const { data } = await api.post('/subscription', payload);

            if (paymentMethod === 'CREDIT_CARD') {
                alert("Assinatura realizada com sucesso!");
                window.location.reload(); 
            } else if (paymentMethod === 'PIX') {
                if (data.pixInfo) {
                    setPixData(data.pixInfo);
                } else {
                    throw new Error("Erro ao gerar PIX: Dados não recebidos.");
                }
            }

        } catch (error) {
            console.error("Erro no pagamento:", error);
            // Melhora a mensagem de erro para o usuário
            const msg = error.response?.data?.message || "Erro ao processar pagamento.";
            alert(msg);
        } finally {
            if (paymentMethod !== 'PIX') setLoading(false); 
            else if (pixData) setLoading(false); 
            else setLoading(false);
        }
    };

    const copyPixCode = () => {
        if (pixData?.payload) {
            navigator.clipboard.writeText(pixData.payload);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Assinar Plano {plan?.name}</DialogTitle>
                    <DialogDescription>
                        Valor: <strong>R$ {plan?.price}</strong>/mês. Cobrança segura via Asaas.
                    </DialogDescription>
                </DialogHeader>

                {!pixData ? (
                    <Tabs defaultValue="CREDIT_CARD" onValueChange={setPaymentMethod} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="CREDIT_CARD">
                                <CreditCard className="w-4 h-4 mr-2" /> Cartão
                            </TabsTrigger>
                            <TabsTrigger value="PIX">
                                <QrCode className="w-4 h-4 mr-2" /> PIX
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="CREDIT_CARD" className="space-y-4">
                            {/* DADOS DO CARTÃO */}
                            <div className="grid gap-2">
                                <Label htmlFor="holderName">Nome no Cartão</Label>
                                <Input id="holderName" value={formData.holderName} onChange={handleInputChange} placeholder="Como está no cartão" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="number">Número do Cartão</Label>
                                <Input id="number" value={formData.number} onChange={handleInputChange} placeholder="0000 0000 0000 0000" maxLength={19} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="expiry">Validade (MM/AA)</Label>
                                    <Input id="expiry" value={formData.expiry} onChange={handleInputChange} placeholder="MM/AA" maxLength={5} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="ccv">CVC</Label>
                                    <Input id="ccv" value={formData.ccv} onChange={handleInputChange} placeholder="123" maxLength={4} />
                                </div>
                            </div>
                            
                            {/* SEPARADOR VISUAL */}
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Dados do Titular</span></div>
                            </div>

                            {/* DADOS DO TITULAR (CPF + CONTATO) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                                    <Input id="cpfCnpj" value={formData.cpfCnpj} onChange={handleInputChange} placeholder="000.000.000-00" maxLength={18} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Celular</Label>
                                    <Input id="phone" value={formData.phone} onChange={handleInputChange} placeholder="(11) 99999-9999" maxLength={15} />
                                </div>
                            </div>

                            {/* --- NOVO: CEP E NÚMERO --- */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="postalCode">CEP</Label>
                                    <Input id="postalCode" value={formData.postalCode} onChange={handleInputChange} placeholder="00000-000" maxLength={9} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="addressNumber">Número (Endereço)</Label>
                                    <Input id="addressNumber" value={formData.addressNumber} onChange={handleInputChange} placeholder="123" />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="PIX" className="py-4 text-center text-sm text-gray-500">
                            <p>Ao clicar em &quot;Pagar com PIX&quot;, um QR Code será gerado.</p>
                            <p>A liberação do plano ocorre em alguns instantes após o pagamento.</p>
                        </TabsContent>
                    </Tabs>
                ) : (
                    // TELA DE SUCESSO DO PIX
                    <div className="flex flex-col items-center justify-center space-y-4 py-4">
                        <div className="text-center space-y-1">
                            <h3 className="font-semibold text-lg text-green-600">QR Code Gerado!</h3>
                            <p className="text-sm text-muted-foreground">Escaneie para pagar ou use o Copia e Cola.</p>
                        </div>
                        
                        <div className="border-4 border-white shadow-lg rounded-lg overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={`data:image/png;base64,${pixData.encodedImage}`} 
                                alt="QR Code PIX" 
                                className="w-48 h-48 object-contain"
                            />
                        </div>

                        <div className="w-full max-w-xs">
                            <Label className="text-xs text-gray-500 mb-1 block text-left">Pix Copia e Cola</Label>
                            <div className="flex gap-2">
                                <Input readOnly value={pixData.payload} className="h-9 text-xs font-mono bg-gray-50" />
                                <Button size="icon" variant="outline" onClick={copyPixCode} className="shrink-0">
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        
                        <p className="text-xs text-gray-400 pt-2">
                           Aguardando confirmação do banco... <br/>
                           A tela atualizará automaticamente ou recarregue a página após pagar.
                        </p>
                    </div>
                )}

                <DialogFooter>
                    {!pixData ? (
                        <Button onClick={handleSubmit} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {paymentMethod === 'CREDIT_CARD' ? 'Confirmar Assinatura' : 'Gerar QR Code PIX'}
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                            Já realizei o pagamento
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- COMPONENTE AUXILIAR DE BARRA DE USO ---
const UsageBar = ({ label, value, total, unit }) => {
    const limit = total || 1; 
    const percentage = Math.min((value / limit) * 100, 100);
    const isLimitReached = value >= limit;

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className={`text-xs font-bold ${isLimitReached ? 'text-red-600' : 'text-gray-500'}`}>
                    {value} / {total === 999999 ? 'Ilimitado' : total} {unit}
                </span>
            </div>
            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${isLimitReached ? 'bg-red-500' : 'bg-blue-600'}`} 
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {isLimitReached && (
                <p className="text-[10px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Limite atingido. Faça upgrade.
                </p>
            )}
        </div>
    );
};

// --- DADOS DOS PLANOS ---
const AVAILABLE_PLANS = [
    {
        name: 'Básico',
        slug: 'basico',
        price: '29.90',
        features: ['Até 20 Documentos', '3 Usuários', 'Suporte via WhatsApp', 'Validade jurídica', 'Armazenamento seguro'],
        highlight: false
    },
    {
        name: 'Profissional',
        slug: 'profissional',
        price: '49.90',
        features: ['Até 50 Documentos', '5 Usuários', 'Templates personalizados', 'API básica', 'Suporte prioritário'],
        highlight: true,
        tag: 'MAIS POPULAR'
    },
    {
        name: 'Empresa',
        slug: 'empresa',
        price: '79.90',
        features: ['Até 100 Documentos', '10 Usuários', 'API completa', 'Branding completo', 'Suporte dedicado'],
        highlight: false
    }
];

// --- PÁGINA PRINCIPAL ---
export default function PlanPage() {
    const { user } = useAuth();
    const [tenantData, setTenantData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Estado para controlar o modal de checkout
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

    useEffect(() => {
        const fetchTenantData = async () => {
            try {
                const { data } = await api.get('/tenants/my');
                setTenantData(data);
            } catch (error) {
                console.error("Erro ao buscar dados do plano:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTenantData();
    }, []);

    const handleUpgradeClick = (plan) => {
        setSelectedPlan(plan);
        setCheckoutOpen(true);
    };

    const handleCancelSubscription = async () => {
        if(!confirm("Tem certeza que deseja cancelar sua assinatura? Seus limites serão reduzidos.")) return;
        
        try {
            await api.delete('/subscription');
            alert("Assinatura cancelada.");
            window.location.reload();
        } catch (error) {
            alert("Erro ao cancelar: " + (error.response?.data?.message || "Tente novamente."));
        }
    }

    const headerLeftContent = <h1 className="text-xl font-semibold text-gray-800">Meu Plano</h1>;
    const canManageBilling = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);

    if (loading) {
        return (
            <>
                <Header leftContent={headerLeftContent} actionButtonText="Enviar Documento" />
                <main className="flex-1 p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-64 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                </main>
            </>
        );
    }

    // Dados seguros com fallback
    const currentSlug = tenantData?.plan?.slug || 'basico';
    const limits = {
        documents: tenantData?.plan?.documentLimit || 20,
        users: tenantData?.plan?.userLimit || 3
    };
    const usage = {
        documents: tenantData?.usage?.documents || 0,
        users: tenantData?.usage?.users || 0
    };
    
    const isSubActive = tenantData?.subscriptionStatus === 'ACTIVE';
    const isPending = tenantData?.subscriptionStatus === 'PENDING';

    return (
        <>
            <Header leftContent={headerLeftContent} actionButtonText="Enviar Documento" />

            <main className="flex-1 p-6 space-y-8">
                
                {/* SEÇÃO DE USO ATUAL */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="bg-white shadow-sm border-l-4 border-l-blue-600 lg:col-span-3">
                        <CardHeader className="pb-2">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <CardTitle className="text-xl font-bold text-gray-800">
                                            Plano Atual: {tenantData?.plan?.name || 'Básico'}
                                        </CardTitle>
                                        {isPending && <Badge variant="outline" className="text-yellow-600 border-yellow-500">Pagamento Pendente</Badge>}
                                        {tenantData?.subscriptionStatus === 'OVERDUE' && <Badge variant="destructive">Pagamento Atrasado</Badge>}
                                    </div>
                                    <CardDescription>
                                        Renovação mensal. Gerencie seus limites abaixo.
                                    </CardDescription>
                                </div>
                                {canManageBilling && isSubActive && currentSlug !== 'basico' && (
                                    <Button 
                                        variant="ghost" 
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={handleCancelSubscription}
                                    >
                                        Cancelar Assinatura
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <UsageBar 
                                    label="Documentos Enviados" 
                                    value={usage.documents} 
                                    total={limits.documents} 
                                    unit="docs"
                                />
                                <UsageBar 
                                    label="Usuários da Equipe" 
                                    value={usage.users} 
                                    total={limits.users} 
                                    unit="usuários"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* SEÇÃO DE PLANOS DISPONÍVEIS */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Planos Disponíveis</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {AVAILABLE_PLANS.map((plan) => {
                            const isCurrent = plan.slug === currentSlug;
                            
                            return (
                                <Card 
                                    key={plan.slug} 
                                    className={`relative flex flex-col ${
                                        isCurrent 
                                        ? 'border-blue-500 ring-1 ring-blue-500 shadow-md bg-blue-50/30' 
                                        : (plan.highlight ? 'border-purple-200 shadow-md' : 'border-gray-200 shadow-sm')
                                    }`}
                                >
                                    {plan.tag && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wider">
                                            {plan.tag}
                                        </div>
                                    )}

                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-xl text-gray-900">{plan.name}</CardTitle>
                                            {isCurrent && <Badge className="bg-blue-600">Atual</Badge>}
                                        </div>
                                        <div className="mt-2">
                                            <span className="text-3xl font-bold text-gray-900">R$ {plan.price}</span>
                                            <span className="text-gray-500 text-sm">/mês</span>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="flex-1">
                                        <ul className="space-y-3">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                                    <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${isCurrent ? 'text-blue-600' : 'text-green-600'}`} />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>

                                    <CardFooter>
                                        {isCurrent ? (
                                            <Button disabled className="w-full bg-gray-200 text-gray-500 cursor-not-allowed">
                                                Plano Ativo
                                            </Button>
                                        ) : (
                                            <Button 
                                                disabled={!canManageBilling}
                                                className={`w-full font-semibold ${
                                                    plan.highlight 
                                                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                                                    : 'bg-white border border-blue-600 text-blue-600 hover:bg-blue-50'
                                                }`}
                                                onClick={() => handleUpgradeClick(plan)}
                                            >
                                                {canManageBilling ? (
                                                    <span className="flex items-center gap-2">
                                                        Fazer Upgrade <Zap className="h-4 w-4" />
                                                    </span>
                                                ) : (
                                                    "Contate o Admin"
                                                )}
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* MODAL DE PAGAMENTO */}
            <CheckoutDialog 
                open={checkoutOpen} 
                onOpenChange={setCheckoutOpen} 
                plan={selectedPlan}
                user={user}
            />
        </>
    );
}