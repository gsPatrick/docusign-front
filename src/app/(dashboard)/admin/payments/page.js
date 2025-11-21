// src/app/(dashboard)/admin/payments/page.js
"use client";

import React, { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Header from "@/components/dashboard/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Importando Header e Title do Card
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    Search, 
    DollarSign, 
    Users, 
    AlertCircle, 
    CreditCard, 
    Wallet,
    ArrowUpRight
} from "lucide-react";

// --- COMPONENTE AUXILIAR: BADGE DE STATUS ---
const PaymentBadge = ({ status }) => {
    const styles = {
        ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200", // Verde suave
        PENDING: "bg-amber-50 text-amber-700 border-amber-200", // Amarelo suave
        OVERDUE: "bg-rose-50 text-rose-700 border-rose-200", // Vermelho suave
        CANCELED: "bg-slate-100 text-slate-700 border-slate-200", // Cinza
    };
    
    const labels = { 
        ACTIVE: "Em dia", 
        PENDING: "Pendente", 
        OVERDUE: "Atrasado", 
        CANCELED: "Cancelado" 
    };
    
    const currentStatus = status || 'PENDING';
    
    return (
        <Badge variant="outline" className={`font-medium ${styles[currentStatus] || styles.PENDING}`}>
            {labels[currentStatus] || currentStatus}
        </Badge>
    );
};

// --- COMPONENTE AUXILIAR: CARD DE KPI MINIMALISTA ---
const KpiCard = ({ title, value, icon: Icon, description }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
            </CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            {description && (
                <p className="text-xs text-muted-foreground mt-1">
                    {description}
                </p>
            )}
        </CardContent>
    </Card>
);

// Função para formatar moeda BRL
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value || 0);
};

export default function AdminPaymentsPage() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // --- 1. BUSCAR DADOS ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data } = await api.get('/tenants/all');
                setTenants(data);
            } catch (error) {
                console.error("Erro ao buscar dados financeiros:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- 2. CÁLCULOS DE KPI ---
    const kpis = useMemo(() => {
        let totalMRR = 0;
        let overdueAmount = 0;
        let activeCount = 0;
        let ticketTotal = 0;

        tenants.forEach(t => {
            const price = parseFloat(t.plan?.price || 0);
            const status = t.subscriptionStatus || 'PENDING';

            if (status === 'ACTIVE') {
                totalMRR += price;
                activeCount++;
                ticketTotal += price;
            }
            
            if (status === 'OVERDUE') {
                overdueAmount += price;
            }
        });

        const ticketAvg = activeCount > 0 ? (ticketTotal / activeCount) : 0;

        return {
            totalMRR,
            overdueAmount,
            activeCount,
            ticketAvg
        };
    }, [tenants]);

    // --- 3. FILTRAGEM ---
    const filteredData = useMemo(() => {
        return tenants.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                                  t.slug.toLowerCase().includes(search.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' 
                ? true 
                : (t.subscriptionStatus || 'PENDING') === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [tenants, search, statusFilter]);

    return (
        <>
            <Header leftContent={<h1 className="text-xl font-semibold text-gray-800">Financeiro</h1>} />
      
            <main className="flex-1 p-6 space-y-8 bg-slate-50/50">
        
                {/* 1. KPIs Minimalistas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard 
                        title="Receita Recorrente (MRR)" 
                        value={formatCurrency(kpis.totalMRR)} 
                        icon={DollarSign} 
                        description="Valor mensal ativo"
                    />
                    <KpiCard 
                        title="Assinantes Ativos" 
                        value={kpis.activeCount} 
                        icon={Users} 
                        description="Clientes pagantes"
                    />
                    <KpiCard 
                        title="Inadimplência" 
                        value={formatCurrency(kpis.overdueAmount)} 
                        icon={AlertCircle} 
                        description="Pagamentos atrasados"
                    />
                    <KpiCard 
                        title="Ticket Médio" 
                        value={formatCurrency(kpis.ticketAvg)} 
                        icon={Wallet} 
                        description="Média por cliente"
                    />
                </div>

                {/* 2. Seção de Tabela */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-800">Visão Geral de Assinaturas</h2>
                    </div>
            
                    {/* Filtros */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-between">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar cliente..." 
                                className="pl-9 bg-white" 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Filtrar Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="ACTIVE">Em dia</SelectItem>
                                    <SelectItem value="PENDING">Pendente</SelectItem>
                                    <SelectItem value="OVERDUE">Atrasado</SelectItem>
                                    <SelectItem value="CANCELED">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Tabela Clean */}
                    <Card className="shadow-sm border overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="w-[300px]">Empresa / Cliente</TableHead>
                                        <TableHead>Plano</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Método</TableHead>
                                        <TableHead className="text-right">Atualizado em</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : filteredData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                                                Nenhuma assinatura encontrada com os filtros atuais.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredData.map((tenant) => (
                                            <TableRow key={tenant.id} className="hover:bg-gray-50/50">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{tenant.name}</span>
                                                        <span className="text-xs text-muted-foreground">{tenant.slug}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="bg-gray-100 font-normal text-gray-700 hover:bg-gray-200">
                                                            {tenant.plan?.name || 'Free'}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-gray-700">
                                                    {formatCurrency(tenant.plan?.price)}
                                                </TableCell>
                                                <TableCell>
                                                    <PaymentBadge status={tenant.subscriptionStatus} />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                        <CreditCard className="h-3.5 w-3.5" />
                                                        <span>Asaas</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground text-sm">
                                                    {tenant.updatedAt 
                                                        ? format(new Date(tenant.updatedAt), 'dd/MM/yy HH:mm', { locale: ptBR })
                                                        : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}