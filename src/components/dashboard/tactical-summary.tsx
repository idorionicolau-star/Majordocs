"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export const TacticalSummary = () => {
  const text = `Saudações à Diretoria. Sou o MajorAssistant, o seu Consultor Sênior de BI no MajorStockX. Com base nos dados extraídos em tempo real da aplicação, apresento o Relatório de Operações Estratégico detalhando o estado atual do negócio.

**1. Resumo Executivo de Desempenho**

O negócio apresenta uma estrutura de ativos sólida, mas com pontos de calibração necessários na rotatividade de stock e na conversão de vendas.
- **Vendas Mensais:** <span class="text-emerald-400">**165.489,00 MT**</span>
- **Ticket Médio:** **6.619,56 MT**
- **Valor Total em Inventário:** <span class="text-rose-500">3.641.067,00 MT</span>
- **Volume de Itens em Stock:** 11.058,32 unidades/m²

**2. Análise de Vendas e Rentabilidade**

Observamos um fluxo recente concentrado em produtos de infraestrutura e acabamento. As vendas de maior impacto nos últimos dias incluem:
- **Grelha 4 furos simples 20x20:** Gerou 13.000,00 MT (130 unidades).
- **Pavê osso de cão branco:** Gerou 12.474,00 MT (19,8 m²).
- **Lancil de barra:** Duas movimentações recentes totalizando 9.800,00 MT.

**3. Integridade e Calibração de Stock**

O rácio entre o Valor de Inventário (3,6M) e as Vendas Mensais (165k) sugere capital imobilizado. É crucial monitorizar os itens que atingiram níveis críticos:
- <span class="text-rose-500">**Pé de jardim:**</span> Stock atual de 16, abaixo do nível crítico de 30. **Ação Urgente Necessária.**
- <span class="text-amber-400">**Painel 3d Wave:**</span> Stock de 34, abaixo do alerta de 50.

**4. Recomendações Estratégicas**
- **Liquidez:** Criar campanhas para produtos com alto stock para libertar o capital imobilizado.
- **Reposição:** Iniciar imediatamente a produção de "Pé de jardim" e "Painel 3d Wave".`;

  return (
    <Card className="bg-[#0f172a]/50 border-slate-800 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-300">
          <Sparkles className="text-sky-400 shadow-neon-sky" strokeWidth={1.5} />
          Insights da IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 overflow-y-auto p-4 rounded-lg font-mono text-xs border border-slate-800 bg-slate-950/70 text-slate-400 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
           <ReactMarkdown
              className="prose prose-sm prose-invert max-w-none prose-p:text-slate-400 prose-strong:text-sky-400"
              components={{
                 p: ({node, ...props}) => <p {...props} className="mb-2" />,
                 strong: ({node, ...props}) => <strong {...props} className="text-sky-400" />,
                 span: ({node, ...props}) => <span {...props} />, 
              }}
              remarkPlugins={[remarkGfm]}
           >
              {text}
           </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}
