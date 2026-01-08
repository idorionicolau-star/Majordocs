
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadCloud, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

export function DataImporter() {
  const [textData, setTextData] = useState('');
  const [fileName, setFileName] = useState('');
  const { toast } = useToast();

  const handleImportText = () => {
    if (!textData.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nenhum dado para importar',
        description: 'Por favor, cole os dados do seu catálogo na área de texto.',
      });
      return;
    }
    // Lógica de processamento do texto aqui
    console.log('Importing from text:', textData);
    toast({
      title: 'Importação Iniciada',
      description: 'O seu catálogo de produtos está a ser processado.',
    });
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setFileName(file.name);
      
      // Lógica de leitura do ficheiro aqui
      // Por exemplo, usando FileReader para ler como texto
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        console.log('File content:', content);
      };
      reader.readAsText(file);
    }
  };

  const handleImportFile = () => {
    if (!fileName) {
       toast({
        variant: 'destructive',
        title: 'Nenhum ficheiro selecionado',
        description: 'Por favor, selecione um ficheiro para carregar.',
      });
      return;
    }
     toast({
      title: 'Carregamento Iniciado',
      description: `O ficheiro "${fileName}" está a ser processado.`,
    });
  }

  return (
    <div className="space-y-4">
       <p className="text-sm text-muted-foreground">
        Selecione um método para carregar o seu catálogo de produtos. Pode colar uma lista (CSV, TSV) ou carregar um ficheiro (Excel, CSV).
      </p>
      <Tabs defaultValue="paste">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="paste">
            <FileText className="mr-2 h-4 w-4" />
            Colar Texto
          </TabsTrigger>
          <TabsTrigger value="upload">
            <UploadCloud className="mr-2 h-4 w-4" />
            Carregar Ficheiro
          </TabsTrigger>
        </TabsList>
        <TabsContent value="paste" className="mt-4">
          <div className="space-y-3">
            <Textarea
              placeholder="Cole aqui os dados do seu catálogo. Ex: Nome,Categoria,Preço,Stock..."
              className="min-h-[200px]"
              value={textData}
              onChange={(e) => setTextData(e.target.value)}
            />
            <Button onClick={handleImportText} className="w-full">Importar Catálogo de Texto</Button>
          </div>
        </TabsContent>
        <TabsContent value="upload" className="mt-4">
           <div className="space-y-3">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="catalog-file">Ficheiro do Catálogo</Label>
              <Input id="catalog-file" type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} />
            </div>
            {fileName && <p className="text-sm text-muted-foreground">Ficheiro selecionado: <strong>{fileName}</strong></p>}
            <Button onClick={handleImportFile} className="w-full">Importar Catálogo de Ficheiro</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
