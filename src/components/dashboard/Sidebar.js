// src/components/dashboard/Sidebar.js
"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { ChevronsUpDown, LogOut, Signature, User, HelpCircle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

import Navigation from "./Navigation";

export default function Sidebar() {
  const { user, logout } = useAuth();
  // URL do WhatsApp
  const WHATSAPP_URL = "https://wa.me/5511987798662";

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside className="hidden lg:flex flex-col w-[240px] h-screen bg-[#F7F9FC] border-r">
      
      {/* 
        CORREÇÃO: Removemos a div intermediária desnecessária e aplicamos flex-grow e overflow-y-auto 
        ao container de navegação para garantir que APENAS o menu role.
        
        Mantivemos a navegação e o logo separadas do profile footer.
      */}
      <div className="flex-grow flex flex-col p-4 space-y-6 overflow-y-auto">
        {/* Logo */}
        <div className="px-2 shrink-0">
          <Link href="/dashboard" aria-label="Voltar para o Dashboard">
            <Image src="/logo.png" alt="Logo Doculink" width={140} height={32} priority />
          </Link>
        </div>
        {/* Navegação */}
        <Navigation /> {/* Navigation.js já tem 'flex-grow' e 'overflow-y-auto' em sua tag <nav> */}
      </div>
      
      {/* Footer do Perfil (Fixo no bottom) */}
      <div className="p-4 border-t shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 text-left p-2 rounded-lg transition-colors hover:bg-gray-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-grow overflow-hidden">
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || 'Carregando...'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-gray-500 shrink-0" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-64 mb-2" align="end">
            <div className="flex items-center gap-3 p-2">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Signature className="mr-2 h-4 w-4" />
              <span>Área de assinatura</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/configuracoes">
                <User className="mr-2 h-4 w-4" />
                <span>Meu perfil</span>
              </Link>
            </DropdownMenuItem>
            
            {/* ALTERAÇÃO AQUI: Link direto para o WhatsApp */}
            <DropdownMenuItem asChild>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Ajuda</span>
                </a>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout} className="text-red-600 focus:bg-red-50 focus:text-red-700">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}