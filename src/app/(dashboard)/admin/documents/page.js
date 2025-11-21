// src/app/(dashboard)/admin/documents/page.js
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Header from "@/components/dashboard/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FileText, ExternalLink, RefreshCw } from "lucide-react";

// Componente de Badge de Status
const StatusBadge = ({ status }) => {
    const styles = {
        DRAFT: "bg-gray-100 text-gray-600 border-gray-200",
        READY: "bg-blue-100 text-blue-700 border-blue-200",
        PARTIALLY_SIGNED: "bg-yellow-100 text-yellow-700 border-yellow-200",
        SIGNED: "bg-green-100 text-green-700 border-green-200",
        EXPIRED: "bg-red-50 text-red-700 border-red-200",
        CANCELLED: "bg-red-100 text-red-800 border-red-200",
    };

    const labels = {
        DRAFT: "Rascunho",
        READY: "Aguardando",
        PARTIALLY_SIGNED: "Em Progresso",
        SIGNED: "Concluído",
        EXPIRED: "Expirado",
        CANCELLED: "Cancelado",
    };

    return (
        <Badge variant="outline" className={`border ${styles[status] || styles.DRAFT}`}>
            {labels[status] || status}
        </Badge>
    );
};

export default function AdminDocumentsPage() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // 1. Buscar Documentos da API
    const fetchDocuments = async () => {
        setLoading(true);
        try {
            // O endpoint /documents retorna os documentos do tenant atual (contexto do usuário)
            const { data } = await api.get('/documents');
            setDocuments(data);
        } catch (error) {
            console.error("Erro ao buscar documentos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    // 2. Lógica de Filtros (Client-Side)
    const filteredDocuments = useMemo(() => {
        return documents.filter(doc => {
            // Filtro de Texto (Título ou Nome do Criador)
            const matchesSearch = 
                doc.title.toLowerCase().includes(search.toLowerCase()) ||
                (doc.owner?.name || "").toLowerCase().includes(search.toLowerCase());

            // Filtro de Status
            const matchesStatus = statusFilter === "all" ? true : doc.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [documents, search, statusFilter]);

    // 3. Calcular Progresso (Assinaturas)
    const getProgress = (signers = []) => {
        if (!signers || signers.length === 0) return "N/A";
        const signedCount = signers.filter(s => s.status === 'SIGNED').length;
        return `${signedCount}/${signers.length}`;
    };

    // 4. Ação de Visualizar (Pode redirecionar para o preview ou download)
    const handleViewDocument = async (docId) => {
        try {
            const { data } = await api.get(`/documents/${docId}/download`);
            if (data.url) {
                window.open(data.url, '_blank');
            } else {
                alert("URL de visualização indisponível.");
            }
        } catch (error) {
            alert("Erro ao abrir documento: " + (error.response?.data?.message || "Erro desconhecido"));
        }
    };

    return (
        <>
            <Header 
                leftContent={
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Todos os Documentos</h1>
                        <p className="text-sm text-muted-foreground">Gerenciamento geral de documentos da organização.</p>
                    </div>
                } 
            />
            
            <main className="flex-1 p-6 space-y-6">
                
                {/* Barra de Ferramentas */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex flex-1 gap-4">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                placeholder="Buscar por título ou criador..." 
                                className="pl-10 bg-white"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] bg-white">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="SIGNED">Concluídos</SelectItem>
                                <SelectItem value="PARTIALLY_SIGNED">Em Progresso</SelectItem>
                                <SelectItem value="READY">Aguardando</SelectItem>
                                <SelectItem value="EXPIRED">Expirados</SelectItem>
                                <SelectItem value="CANCELLED">Cancelados</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="outline" onClick={fetchDocuments} title="Recarregar lista">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>

                {/* Tabela */}
                <Card className="border-none shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50">
                                    <TableHead className="font-semibold">Título</TableHead>
                                    <TableHead className="font-semibold">Criador</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="font-semibold">Criado em</TableHead>
                                    <TableHead className="font-semibold">Prazo</TableHead>
                                    <TableHead className="font-semibold">Assinaturas</TableHead>
                                    <TableHead className="text-right font-semibold">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredDocuments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <FileText className="h-8 w-8 opacity-20" />
                                                <p>Nenhum documento encontrado.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDocuments.map((doc) => (
                                        <TableRow key={doc.id}>
                                            <TableCell className="font-medium text-gray-900">
                                                {doc.title}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-gray-700">{doc.owner?.name || 'Desconhecido'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={doc.status} />
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {doc.createdAt && format(new Date(doc.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {doc.deadlineAt 
                                                    ? format(new Date(doc.deadlineAt), 'dd/MM/yyyy', { locale: ptBR })
                                                    : '-'
                                                }
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {getProgress(doc.Signers)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                    onClick={() => handleViewDocument(doc.id)}
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    Abrir
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </>
    );
}