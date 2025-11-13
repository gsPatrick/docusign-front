// src/app/sign/[token]/_components/Step4_VerifyOtp.js
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

export default function Step4_VerifyOtp({ token, signatureImage, onNext, onBack }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // --- NOVA LÓGICA DE ENVIO DE OTP ---
  // Chama a API para enviar o OTP assim que o componente é montado.
  useEffect(() => {
    const sendOtp = async () => {
        try {
            setMessage('Enviando código de verificação...');
            await api.post(`/sign/${token}/otp/start`);
            setMessage('Enviamos um código para seus canais de autenticação.');
        } catch (err) {
            setError("Falha ao enviar o código de verificação.");
        }
    };
    sendOtp();
  }, [token]); // Executa apenas uma vez quando o token está disponível

  const handleVerifyAndSign = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/sign/${token}/otp/verify`, { otp });
      
      const clientFingerprint = 'fingerprint_simulado_' + new Date().getTime();
      await api.post(`/sign/${token}/commit`, {
        signatureImage: signatureImage,
        clientFingerprint: clientFingerprint
      });

      onNext();
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido ou erro ao finalizar a assinatura.');
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white shadow-lg rounded-xl border-none p-8 text-center">
      <CardHeader className="p-0 mb-6">
        <CardTitle className="text-3xl font-bold text-[#151928]">Verificação</CardTitle>
        <p className="text-muted-foreground mt-2">{message || 'Insira o código de 6 dígitos que enviamos para o seu Email/WhatsApp.'}</p>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <Input 
          type="text" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)}
          className="text-center text-2xl tracking-[1em] h-14" placeholder="______"
        />
        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-4 p-0 mt-8">
        <Button onClick={handleVerifyAndSign} disabled={loading} className="w-full bg-[#1c4ed8] hover:bg-[#1c4ed8]/90">
          {loading ? 'Verificando...' : 'Assinar'}
        </Button>
        {/* Você pode reativar este botão com a função sendOtp do useEffect se quiser */}
        {/* <Button variant="link">Não recebeu o código? Enviar novamente</Button> */}
      </CardFooter>
    </Card>
  );
}