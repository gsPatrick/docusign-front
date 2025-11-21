// src/app/(dashboard)/admin/plans/page.js
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import api from "@/lib/api";
import Header from "@/components/dashboard/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Users, FileText, TrendingUp, AlertCircle, Check, DollarSign } from "lucide-react";

// --- 1. CONFIGURAÇÃO DOS PLANOS (DEFAULTS) ---
// Isso garante que os dados apareçam mesmo se ninguém tiver assinado o plano ainda.
// Valores baseados no seu seed.service.js
const PLAN_DEFAULTS = {
    'basico': { 
        label: 'Básico / Gratuito', 
        subtitle: 'Essencial para começar', 
        color: '#3b82f6', // Azul
        order: 1,
        // Limites Padrão (Fallback)
        limits: { userLimit: 3, documentLimit: 20 }
    },
    'profissional': { 
        label: 'Profissional', 
        subtitle: 'Para pequenas empresas', 
        color: '#10b981', // Emerald
        order: 2,
        limits: { userLimit: 5, documentLimit: 50 }
    },
    'empresa': { 
        label: 'Empresa', 
        subtitle: 'Alta escala e volume', 
        color: '#8b5cf6', // Violeta
        order: 3,
        limits: { userLimit: 10, documentLimit: 100 }
    },
    'unknown': { 
        label: 'Outros / Legado', 
        subtitle: 'Planos não listados', 
        color: '#94a3b8', // Slate
        order: 99,
        limits: { userLimit: 0, documentLimit: 0 }
    }
};

// --- 2. COMPONENTE: TOOLTIP CUSTOMIZADO DO GRÁFICO ---
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-xs">
                <p className="font-bold text-gray-800 mb-1">{payload[0].name}</p>
                <div className="space-y-1">
                    <span className="block text-gray-600">
                        Qtd: <strong>{payload[0].value}</strong>
                    </span>
                    {payload[0].payload.revenue !== undefined && (
                        <span className="block text-emerald-600">
                            Receita: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].payload.revenue)}</strong>
                        </span>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

// --- 3. COMPONENTE: CARD DE PREÇO ---
const PlanPricingCard = ({ title, subtitle, price, activeCount, totalRevenue, color, features }) => (
    <Card className="border shadow-sm relative overflow-hidden hover:shadow-md transition-all group">
        {/* Barra superior colorida */}
        <div className="absolute top-0 left-0 w-full h-1.5 transition-all group-hover:h-2" style={{ backgroundColor: color }}></div>
        
        <CardHeader className="pb-2 pt-6">
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-lg font-bold text-gray-800">{title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-50 border border-gray-100 text-gray-600 flex items-center gap-1`}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeCount > 0 ? color : '#ccc' }}></span>
                    {activeCount} Ativos
                </div>
            </div>
        </CardHeader>
        
        <CardContent className="space-y-5">
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-gray-900">
                    {price > 0 ? `R$ ${price}` : 'Grátis'}
                </span>
                <span className="text-xs text-muted-foreground font-medium">/mês</span>
            </div>

            {/* Seção de Estatísticas Financeiras do Plano */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-semibold tracking-wider">
                        <TrendingUp className="h-3 w-3" />
                        <span>MRR do Plano</span>
                    </div>
                </div>
                <div className="text-lg font-bold text-emerald-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                </div>
            </div>
            
            {/* Lista de Limites (Features) */}
            <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">Limites & Recursos</p>
                
                <div className="flex items-center justify-between text-sm group-hover:text-gray-900 transition-colors">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>Usuários</span>
                    </div>
                    <strong className="font-semibold">{features?.userLimit || 0}</strong>
                </div>
                
                <div className="flex items-center justify-between text-sm group-hover:text-gray-900 transition-colors">
                    <div className="flex items-center gap-2 text-gray-600">
                        <FileText className="h-4 w-4 text-orange-500" />
                        <span>Documentos</span>
                    </div>
                    <strong className="font-semibold">{features?.documentLimit || 0}</strong>
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function AdminPlansPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const { data } = await api.get('/tenants/all');
            setTenants(data);
        } catch (error) {
            console.error("Erro ao carregar planos:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, []);

  // --- LÓGICA DE AGREGAÇÃO DE DADOS ---
  const { chartData, revenueData, planStats } = useMemo(() => {
    const stats = {};

    // 1. Pré-popular com os DEFAULTS para garantir que os cards apareçam
    Object.keys(PLAN_DEFAULTS).forEach(slug => {
        if(slug !== 'unknown') {
            stats[slug] = {
                slug: slug,
                count: 0,
                revenue: 0,
                // Usa preço 0 inicial, se encontrar no banco atualiza
                price: slug === 'basico' ? 29.90 : (slug === 'profissional' ? 49.90 : 79.90), 
                meta: PLAN_DEFAULTS[slug],
                limits: PLAN_DEFAULTS[slug].limits // Usa limites hardcoded como base
            };
        }
    });

    // 2. Processar dados reais da API
    tenants.forEach(t => {
        const rawSlug = t.plan?.slug?.toLowerCase();
        const slug = (rawSlug && PLAN_DEFAULTS[rawSlug]) ? rawSlug : 'unknown';

        // Se for desconhecido, cria a entrada
        if (!stats[slug]) {
            stats[slug] = {
                slug: slug,
                count: 0,
                revenue: 0,
                price: Number(t.plan?.price || 0),
                meta: PLAN_DEFAULTS.unknown,
                limits: { userLimit: t.plan?.userLimit, documentLimit: t.plan?.documentLimit }
            };
        }

        // Atualiza preço real vindo do banco (caso tenha mudado)
        if (t.plan && t.plan.price) {
            stats[slug].price = Number(t.plan.price);
        }
        
        // Atualiza limites se vierem do banco (prioridade sobre o hardcoded)
        if (t.plan && t.plan.userLimit) {
            stats[slug].limits = { userLimit: t.plan.userLimit, documentLimit: t.plan.documentLimit };
        }

        stats[slug].count += 1;

        // Calcula Receita (Apenas ativos ou pendentes)
        if (t.subscriptionStatus === 'ACTIVE' || t.subscriptionStatus === 'PENDING') {
             stats[slug].revenue += Number(t.plan?.price || 0);
        }
    });

    // 3. Formatar para Gráficos
    const chartArray = Object.values(stats)
        .filter(s => s.slug !== 'unknown' || s.count > 0) // Mostra principais + desconhecidos se existirem
        .map(s => ({
            name: s.meta.label,
            value: s.count,
            revenue: s.revenue,
            color: s.meta.color
        }));

    const revenueArray = chartArray.map(s => ({
        name: s.name.split(' ')[0], // Nome curto para o eixo X
        revenue: s.revenue,
        color: s.color
    }));

    // 4. Formatar para Cards (Ordenado)
    const statsArray = Object.values(stats).sort((a, b) => (a.meta.order || 99) - (b.meta.order || 99));

    return { chartData: chartArray, revenueData: revenueArray, planStats: statsArray };
  }, [tenants]);


  return (
    <>
      <Header leftContent={<h1 className="text-xl font-semibold text-gray-800">Gestão de Planos</h1>} />
      
      <main className="flex-1 p-6 space-y-8 bg-slate-50/50">
        
        {/* SEÇÃO DE GRÁFICOS (LADO A LADO) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* GRÁFICO 1: DISTRIBUIÇÃO (Volume) */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" /> Distribuição de Clientes (Volume)
                    </CardTitle>
                    <CardDescription>Quantidade de assinaturas por tipo de plano</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {loading ? <Skeleton className="h-full w-full rounded-full" /> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={chartData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={60} outerRadius={100} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* GRÁFICO 2: RECEITA (Financeiro) */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500" /> Receita por Plano (MRR)
                    </CardTitle>
                    <CardDescription>Comparativo de faturamento mensal gerado</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {loading ? <Skeleton className="h-full w-full" /> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                                <RechartsTooltip 
                                    cursor={{fill: 'transparent'}}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white p-2 border shadow-lg rounded text-xs">
                                                    <span className="font-bold text-emerald-600">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value)}
                                                    </span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={30}>
                                    {revenueData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* LISTA DE CARDS DE PLANOS */}
        <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 ml-1">Detalhes dos Planos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-72 w-full rounded-xl" />
                    ))
                ) : (
                    planStats.map((stat) => (
                        <PlanPricingCard 
                            key={stat.slug}
                            title={stat.meta.label}
                            subtitle={stat.meta.subtitle}
                            price={stat.price.toFixed(2)}
                            activeCount={stat.count}
                            totalRevenue={stat.revenue}
                            color={stat.meta.color}
                            features={stat.limits}
                        />
                    ))
                )}
            </div>
        </div>
      </main>
    </>
  );
}