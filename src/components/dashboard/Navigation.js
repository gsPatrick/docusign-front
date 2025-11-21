// src/components/dashboard/Navigation.js
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useAuth } from "@/context/AuthContext"; 
import {
  LayoutGrid, FileText, Folder, PenSquare, User, Settings, HelpCircle, ChevronDown, Shield, CreditCard, Layers, Globe
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const WHATSAPP_URL = "https://wa.me/5511987798662";

// 1. LINKS PRINCIPAIS (Operacional)
const navLinksPrimary = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { 
    label: "Documentos", 
    icon: FileText,
    basePath: "/documentos",
    sublinks: [
      { href: "/documentos/pendentes", label: "Pendentes" },
      { href: "/documentos/concluidos", label: "Concluídos" },
      { href: "/documentos/todos", label: "Todos" },
      { href: "/documentos/lixeira", label: "Lixeira" },
    ]
  },
  { href: "/pastas", label: "Pastas", icon: Folder },
  { href: "/signatarios", label: "Signatários", icon: PenSquare },
];

// 2. LINKS DE GESTÃO DA EMPRESA (Admin Local)
const navLinksTenantAdmin = [
  { href: "/admin/users", label: "Minha Equipe", icon: User },
];

// 3. LINKS DA PLATAFORMA (Super Admin Global)
const navLinksSuperAdmin = [
  { href: "/admin/users", label: "Todos Usuários", icon: User }, // Mudei a rota visualmente para não confundir com 'Minha Equipe'
  { href: "/admin/documents", label: "Todos Documentos", icon: FileText },
  { href: "/admin/payments", label: "Financeiro Global", icon: CreditCard },
  { href: "/admin/plans", label: "Planos", icon: Shield },
  { href: "/admin/settings", label: "Config. Sistema", icon: Settings },
    { href: "/admin/audit", label: "Auditoria Local", icon: Shield },

];

// 4. LINKS SECUNDÁRIOS (Conta)
const navLinksSecondary = [
  { href: "/plano", label: "Meu Plano", icon: CreditCard },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: WHATSAPP_URL, label: "Suporte", icon: HelpCircle, isExternal: true },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth(); 

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isTenantAdmin = user?.role === 'ADMIN';

  // Super Admin OU Admin veem o menu de gestão de equipe
  const canManageTenant = isSuperAdmin || isTenantAdmin;

  const isDocumentsActive = pathname.startsWith('/documentos');
  const [isDocumentsOpen, setIsDocumentsOpen] = React.useState(isDocumentsActive);

  React.useEffect(() => {
    setIsDocumentsOpen(isDocumentsActive);
  }, [isDocumentsActive]);

  return (
    <nav className="flex-grow flex flex-col space-y-6 overflow-y-auto">
      
      {/* --- 1. MENU PRINCIPAL (Todos veem) --- */}
      <div className="space-y-1">
        {navLinksPrimary.map((link) => 
          link.sublinks ? (
            <Collapsible key={link.label} open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen}>
              <CollapsibleTrigger asChild>
                <div className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all hover:bg-gray-200/60 cursor-pointer", 
                  isDocumentsActive ? "text-blue-600" : "text-gray-800"
                )}>
                  <link.icon className="h-5 w-5" />
                  <span>{link.label}</span>
                  <ChevronDown className={`ml-auto h-5 w-5 text-gray-500 transition-transform ${isDocumentsOpen ? "rotate-0" : "-rotate-90"}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-9 space-y-1 mt-1">
                {link.sublinks.map(sublink => {
                   const isActive = pathname === sublink.href;
                   return (
                     <Link key={sublink.href} href={sublink.href} className={cn(
                       "block py-1.5 text-sm font-medium transition-colors hover:text-gray-900", 
                       isActive ? "text-blue-600 font-bold" : "text-gray-600"
                     )}>
                       {sublink.label}
                     </Link>
                   );
                })}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Link key={link.href} href={link.href} className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-800 text-base font-medium transition-all hover:bg-gray-200/60", 
              pathname === link.href && "text-blue-600"
            )}>
              <link.icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          )
        )}
      </div>

      {/* --- 2. MENU GESTÃO DA EMPRESA (Admin + Super Admin) --- */}
      {canManageTenant && (
        <div className="space-y-1 pt-2 border-t border-gray-200">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Gestão da Equipe
          </p>
          {navLinksTenantAdmin.map((link) => (
            <Link key={link.href} href={link.href} className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-800 text-base font-medium transition-all hover:bg-gray-200/60", 
              pathname.startsWith(link.href) && "text-blue-600"
            )}>
              <link.icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* --- 3. MENU SUPER ADMIN (Apenas Super Admin) --- */}
      {isSuperAdmin && (
        <div className="space-y-1 pt-2 border-t border-gray-200">
          <div className="px-3 flex items-center gap-2 mb-1">
             <Globe className="h-3 w-3 text-red-600" />
             <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                Plataforma Global
             </p>
          </div>
          
          {navLinksSuperAdmin.map((link) => (
            <Link key={link.href} href={link.href} className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-800 text-base font-medium transition-all hover:bg-red-50", 
              pathname.startsWith(link.href) && "text-red-700 bg-red-50"
            )}>
              <link.icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* --- 4. MENU SECUNDÁRIO (Todos) --- */}
      <div className="space-y-1 pt-2 border-t border-gray-200">
         {navLinksSecondary.map((link) => (
          <Link 
            key={link.href} 
            href={link.href}
            target={link.isExternal ? "_blank" : undefined}
            rel={link.isExternal ? "noopener noreferrer" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-800 text-base font-medium transition-all hover:bg-gray-200/60", 
              pathname === link.href && "text-blue-600"
            )}>
            <link.icon className="h-5 w-5" />
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}