// src/app/(dashboard)/layout.js
"use client"; // Precisa ser um Client Component para usar o usePathname

import { usePathname } from 'next/navigation';
import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }) {
  const pathname = usePathname(); // Pega o caminho da URL atual

  return (
    <div className="flex min-h-screen w-full bg-[#F8FAFC]">
      <Sidebar />
      {/* 
        CORREÇÃO: Adicionado 'flex-col' e 'h-screen' ao main.
        O 'flex-1' faz o main preencher a largura restante.
        O 'h-screen' força o main a ter a mesma altura da sidebar.
        O 'flex-col' permite que o Header e o conteúdo de cada página se organizem em coluna.
      */}
      <main className="flex-1 flex flex-col h-screen"> 
        <div key={pathname} className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}