// src/app/sign/[token]/_components/Step3_DrawSign.js
"use client";

import { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Document, Page, pdfjs } from 'react-pdf';
import Draggable from 'react-draggable';
import api from '@/lib/api';

// Configuração obrigatória para o react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function Step3_DrawSign({ token, documentUrl, onNext, onBack, onSigned }) {
  const [subStep, setSubStep] = useState('capture');
  const [signatureImage, setSignatureImage] = useState(null);
  
  const canvasRef = useRef(null);
  const [signaturePad, setSignaturePad] = useState(null);
  const [typedName, setTypedName] = useState('');
  const [activeTab, setActiveTab] = useState('draw');

  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current && !signaturePad) {
      const pad = new SignaturePad(canvasRef.current, { backgroundColor: 'rgb(255, 255, 255)' });
      setSignaturePad(pad);
    }
  }, [activeTab, signaturePad]);

  const generateTypedSignatureImage = (text) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.font = "40px 'Dancing Script'"; // ✅ corrigido
    ctx.fillStyle = 'black';
    ctx.fillText(text, 10, 60);
    return canvas.toDataURL('image/png');
  };

  const handleSaveCapture = () => {
    let dataUrl;
    if (activeTab === 'draw') {
      if (signaturePad && !signaturePad.isEmpty()) {
        dataUrl = signaturePad.toDataURL('image/png');
      } else {
        return alert('Por favor, desenhe sua assinatura.');
      }
    } else {
      if (typedName) {
        dataUrl = generateTypedSignatureImage(typedName);
      } else {
        return alert('Por favor, digite seu nome.');
      }
    }
    setSignatureImage(dataUrl);
    onSigned(dataUrl);
    setSubStep('position');
  };

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfContainerSize, setPdfContainerSize] = useState({ width: 0, height: 0 });
  const pdfWrapperRef = useRef(null);

  useEffect(() => {
    if (pdfWrapperRef.current) {
      setPdfContainerSize({
        width: pdfWrapperRef.current.offsetWidth,
        height: pdfWrapperRef.current.offsetHeight,
      });
    }
  }, [subStep]);

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  const handleStopDrag = async (e, data) => {
    const position = {
      x: data.x,
      y: data.y,
      page: pageNumber,
    };
    try {
      await api.post(`/sign/${token}/position`, { position });
      onNext();
    } catch (error) {
      alert('Erro ao salvar a posição da assinatura.');
    }
  };

  if (subStep === 'capture') {
    return (
      <Card className="w-full bg-white shadow-lg rounded-xl border-none p-8">
        <CardHeader className="p-0 mb-4 flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold text-[#151928]">Assinatura do documento</CardTitle>
            <p className="text-muted-foreground mt-1">Por favor, assine abaixo</p>
          </div>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw">Desenhar</TabsTrigger>
            <TabsTrigger value="type">Digitar</TabsTrigger>
          </TabsList>
          <TabsContent value="draw">
            <canvas ref={canvasRef} className="border rounded-lg w-full h-48" />
          </TabsContent>
          <TabsContent value="type">
            <Input 
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Digite seu nome aqui"
              className="h-12 text-2xl"
              style={{ fontFamily: "'Dancing Script', cursive" }} // ✅ corrigido
            />
            <div
              className="mt-4 p-4 border rounded-lg h-36 flex items-center justify-center"
              style={{ fontFamily: "'Dancing Script', cursive", fontSize: '40px' }} // ✅ corrigido
            >
              {typedName || 'Pré-visualização'}
            </div>
          </TabsContent>
        </Tabs>
        <CardFooter className="flex justify-between items-center p-0 mt-6">
          <Button variant="outline" onClick={onBack}>Anterior</Button>
          <Button onClick={handleSaveCapture} className="bg-[#1c4ed8] hover:bg-[#1c4ed8]/90">
            Salvar e Posicionar
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (subStep === 'position') {
    return (
      <Card className="w-full bg-white shadow-lg rounded-xl border-none p-8">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-2xl font-bold text-[#151928]">Posicione sua Assinatura</CardTitle>
          <p className="text-muted-foreground mt-1">
            Arraste a sua assinatura para o local desejado no documento e clique em &quot;Próximo&quot;.
          </p>
        </CardHeader>
        <CardContent
          ref={pdfWrapperRef}
          className="p-0 relative border rounded-lg overflow-auto max-h-[70vh]"
        >
          <Document file={documentUrl} onLoadSuccess={onDocumentLoadSuccess} className="flex justify-center">
            <Page pageNumber={pageNumber} width={pdfContainerSize.width * 0.95} />
          </Document>

          <Draggable bounds="parent" onStop={handleStopDrag}>
            <img
              src={signatureImage}
              alt="Sua assinatura"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-move max-w-48"
            />
          </Draggable>
        </CardContent>
        <CardFooter className="flex justify-between items-center p-0 mt-6">
          <Button variant="outline" onClick={() => setSubStep('capture')}>
            Voltar para Assinatura
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}
