// src/app/sign/[token]/page.js
"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api'; // Sua instância configurada do Axios

// Importa os componentes de cada passo do fluxo
import Step1_Summary from './_components/Step1_Summary';
import Step2_Identify from './_components/Step2_Identify';
import Step3_DrawSign from './_components/Step3_DrawSign';
import Step4_VerifyOtp from './_components/Step4_VerifyOtp';
import Step5_Success from './_components/Step5_Success';

// Componente para exibir um estado de carregamento
import { Skeleton } from '@/components/ui/skeleton'; 
// Componente para exibir um logo (opcional)
import Image from 'next/image';

/**
 * Página principal que gerencia o fluxo de assinatura de um documento.
 * A rota dinâmica `[token]` captura o token de acesso único do signatário.
 */
export default function SignPage({ params }) {
  const { token } = params;
  
  // Estado para controlar qual passo do fluxo é exibido
  // 0: Carregando, 1: Resumo, 2: Identificação, 3: Assinatura, 4: OTP, 5: Sucesso, -1: Erro
  const [currentStep, setCurrentStep] = useState(0); 
  const [error, setError] = useState('');
  
  // Estado para armazenar dados coletados durante o fluxo
  const [summaryData, setSummaryData] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null); // URL do PDF para renderização
  const [signatureImage, setSignatureImage] = useState(null); // Imagem da assinatura em Base64

  // Efeito executado ao carregar a página para buscar os dados iniciais do documento.
  useEffect(() => {
    if (!token) {
      setError("Token de assinatura não fornecido.");
      setCurrentStep(-1);
      return;
    }

    const fetchInitialData = async () => {
      try {
        // 1. Busca os dados de resumo do documento e do signatário.
        const summaryResponse = await api.get(`/sign/${token}`);
        setSummaryData(summaryResponse.data);
        
        // 2. Busca a URL para download/visualização do PDF.
        // Supondo que a API de resumo retorna o ID do documento.
        const docId = summaryResponse.data.document.id;
        if (!docId) {
            throw new Error("ID do documento não encontrado nos dados de resumo.");
        }
        
        const urlResponse = await api.get(`/documents/${docId}/download?variant=original`);
        setDocumentUrl(urlResponse.data.url); // A API deve retornar um objeto { url: '...' }
        
        // 3. Se tudo deu certo, avança para o primeiro passo.
        setCurrentStep(1);

      } catch (err) {
        setError(err.response?.data?.message || 'Link de assinatura inválido, expirado ou não encontrado.');
        setCurrentStep(-1); // Define o estado de erro
      }
    };

    fetchInitialData();
  }, [token]);
  
  // Funções de navegação para passar como props aos componentes filhos
  const goToNextStep = () => setCurrentStep(prev => prev + 1);
  const goToPrevStep = () => setCurrentStep(prev => prev - 1);

  /**
   * Renderiza o componente correspondente ao passo atual do fluxo.
   */
  const renderStep = () => {
    switch (currentStep) {
      case 0: // Estado de Carregamento
        return (
            <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-lg">
                <Skeleton className="h-8 w-3/4 mb-6" />
                <Skeleton className="h-4 w-1/2 mb-8" />
                <Skeleton className="h-40 w-full" />
                <div className="flex justify-end mt-8">
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
        );
      
      case 1: // Resumo do Documento
        return <Step1_Summary data={summaryData} onNext={goToNextStep} />;
      
      case 2: // Identificação (CPF, Celular, etc.)
        return <Step2_Identify token={token} onNext={goToNextStep} onBack={goToPrevStep} />;
      
      case 3: // Captura e Posicionamento da Assinatura
        return (
          <Step3_DrawSign 
            token={token}
            documentUrl={documentUrl} 
            onNext={goToNextStep} 
            onBack={goToPrevStep} 
            onSigned={setSignatureImage} 
          />
        );
      
      case 4: // Verificação com OTP
        return (
          <Step4_VerifyOtp 
            token={token} 
            signatureImage={signatureImage} 
            onNext={goToNextStep} 
            onBack={goToPrevStep} 
          />
        );
      
      case 5: // Sucesso
        return <Step5_Success />;
      
      case -1: // Estado de Erro
        return (
          <div className="w-full max-w-lg text-center bg-white p-10 rounded-lg shadow-lg border border-red-200">
            <h2 className="text-2xl font-bold text-red-700 mb-4">Ocorreu um Erro</h2>
            <p className="text-gray-600">{error}</p>
            {/* Opcional: botão para voltar à página inicial */}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <main className="flex flex-col min-h-screen w-full items-center justify-center bg-[#f1f5f9] p-4">
        <div className="absolute top-8 left-8">
            <Image src="/logo.png" alt="Doculink Logo" width={140} height={32} />
        </div>
      <div className="w-full max-w-3xl">
        {renderStep()}
      </div>
    </main>
  );
}