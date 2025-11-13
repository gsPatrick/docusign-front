// src/app/sign/[token]/page.js
"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation'; // Importa o hook para acessar parâmetros da rota
import Image from 'next/image';
import api from '@/lib/api';

// Importa os componentes de passo (exceto o Step3, que é dinâmico)
import Step1_Summary from './_components/Step1_Summary';
import Step2_Identify from './_components-Step2_Identify';
import Step4_VerifyOtp from './_components/Step4_VerifyOtp';
import Step5_Success from './_components/Step5_Success';

// Importa o componente de UI para o estado de carregamento
import { Skeleton } from '@/components/ui/skeleton'; 

// Carrega dinamicamente o Step3 para evitar erros de SSR com a biblioteca de PDF
const Step3_DrawSign = dynamic(
  () => import('./_components/Step3_DrawSign'),
  { 
    ssr: false, // Garante que este componente só renderize no cliente
    loading: () => (
      <div className="w-full max-w-3xl bg-white p-8 rounded-lg shadow-lg">
          <Skeleton className="h-8 w-1/2 mb-4" />
          <Skeleton className="h-4 w-3/4 mb-8" />
          <Skeleton className="h-96 w-full" />
      </div>
    )
  }
);

/**
 * Página principal que gerencia o fluxo de assinatura completo.
 * Usa o hook `useParams` para obter o token da URL de forma segura.
 */
export default function SignPage() {
  const params = useParams(); // Usa o hook para obter o objeto de parâmetros
  const token = params.token;   // Extrai o token do objeto de parâmetros

  const [currentStep, setCurrentStep] = useState(0); // 0: Carregando, 1-5: Passos, -1: Erro
  const [error, setError] = useState('');
  
  const [summaryData, setSummaryData] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);

  // Efeito para buscar os dados da API assim que o token estiver disponível.
  useEffect(() => {
    // Se o token ainda não foi carregado pelo hook, não faz nada.
    // O useEffect será re-executado quando o token estiver disponível.
    if (!token) {
      return; 
    }

    const fetchInitialData = async () => {
      try {
        const summaryResponse = await api.get(`/sign/${token}`);
        setSummaryData(summaryResponse.data);
        
        // Assume que a API de resumo retorna o ID do documento
        const docId = summaryResponse.data.document.id;
        if (!docId) {
            throw new Error("ID do documento não foi retornado pela API.");
        }
        
        // Busca a URL do documento para renderização
        const urlResponse = await api.get(`/documents/${docId}/download?variant=original`);
        setDocumentUrl(urlResponse.data.url);
        
        // Avança para o primeiro passo do fluxo
        setCurrentStep(1);

      } catch (err) {
        setError(err.response?.data?.message || 'Link inválido, expirado ou ocorreu um erro inesperado.');
        setCurrentStep(-1);
      }
    };

    fetchInitialData();
  }, [token]); // A dependência é a variável 'token', garantindo que a busca só ocorra quando o token for válido.
  
  // Funções de navegação do fluxo
  const goToNextStep = () => setCurrentStep(prev => prev + 1);
  const goToPrevStep = () => setCurrentStep(prev => prev - 1);

  /**
   * Renderiza o componente da etapa atual.
   */
  const renderStep = () => {
    switch (currentStep) {
      case 0: // Carregamento
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
      case 1: // Resumo
        return <Step1_Summary data={summaryData} onNext={goToNextStep} />;
      case 2: // Identificação
        return <Step2_Identify token={token} onNext={goToNextStep} onBack={goToPrevStep} />;
      case 3: // Assinatura (desenho e posicionamento)
        return <Step3_DrawSign token={token} documentUrl={documentUrl} onNext={goToNextStep} onBack={goToPrevStep} onSigned={setSignatureImage} />;
      case 4: // Verificação OTP
        return <Step4_VerifyOtp token={token} signatureImage={signatureImage} onNext={goToNextStep} onBack={goToPrevStep} />;
      case 5: // Sucesso
        return <Step5_Success />;
      case -1: // Erro
        return (
          <div className="w-full max-w-lg text-center bg-white p-10 rounded-lg shadow-lg border border-red-200">
            <h2 className="text-2xl font-bold text-red-700 mb-4">Acesso Negado</h2>
            <p className="text-gray-600">{error}</p>
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