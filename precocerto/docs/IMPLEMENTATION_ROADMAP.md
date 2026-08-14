# 🚀 Plano de Implementação - Fases 15-17

## 📋 Visão Geral

Baseado nos requisitos informados e na arquitetura atual, aqui está o plano detalhado para transformar o PreçoCerto num sistema robusto de gestão multi-loja com dashboards avançados.

---

## 🎯 Requisitos a Implementar

### Requisito 1: Histórico por Loja
**Situação Atual:** Histórico genérico do utilizador
**Necessário:** Histórico consolidado mostrando dados de CADA loja

### Requisito 2: Relatórios por Loja
**Situação Atual:** Relatórios do utilizador atual
**Necessário:** Relatórios avançados filtrando por loja com comparativos

### Requisito 3: Dashboard Admin Avançado
**Situação Atual:** Dashboard simples com KPIs básicos
**Necessário:** Dashboard executivo com:
- Indicadores de desempenho por loja
- Gráficos de tendência
- Comparativos entre lojas
- Alertas de performance
- Dados para tomada de decisão

---

## 📐 Arquitetura Proposta

### Tier 1: Data Layer (Firestore)
Estrutura que JÁ EXISTE (ótimo!):
```
firestore/
├── lojas/{storeId}/
│   ├── stats/current/
│   │   ├── totalProdutos
│   │   ├── utilizadoresAtivos
│   │   ├── precoMedio
│   │   └── margemMedia
│   └── priceHistory/
│       └── {historyId}
├── priceHistory/ (global)
└── users/{userId}/
    └── activityLog/
```

**O QUE ADICIONAR:**
- Coleção `lojas/{storeId}/analytics/` para dados de performance
- Colecção `lojas/{storeId}/alerts/` para alertas automáticos
- Coleção `reports/{reportId}/` para relatórios salvos

### Tier 2: Services Layer
Já temos:
- `categoryService.ts`
- `storeService.ts` (para lojas)
- `notificationPreferencesService.ts`

**O QUE ADICIONAR:**
- `analyticsService.ts` - Coleta e calcula KPIs
- `historyService.ts` - Histórico multi-loja
- `reportService.ts` - Gera relatórios avançados
- `alertService.ts` - Sistema de alertas

### Tier 3: Components Layer

**Dashboard Admin (NOVO):**
- `AdminDashboard.tsx` - Painel principal executivo
- `AnalyticsPanel.tsx` - Gráficos e métricas
- `StorePerformanceCard.tsx` - Card individual de loja
- `AlertsPanel.tsx` - Alertas e notificações

**Histórico Avançado (REFATORAR):**
- `HistoryView.tsx` - Refatorada para multi-loja
- `HistoryFilters.tsx` - Novo: Filtros por loja/período/tipo
- `HistoryTimeline.tsx` - Visualização em timeline

**Relatórios Avançados (REFATORAR):**
- `ReportBuilder.tsx` - Já existe, expandir
- `ReportComparisonView.tsx` - NOVO: Comparar lojas
- `ReportExport.tsx` - NOVO: Exportar relatórios

---

## 📅 Fases de Implementação

### **FASE 15: Dashboard Admin Executivo**
**Duração estimada:** 2-3 semanas

#### Objetivo
Criar um dashboard completo para o admin com visão consolidada de todos os dados

#### O que implementar

**15.1 - Componentes Base**
- [ ] `AdminDashboard.tsx` - Painel principal
- [ ] `AnalyticsPanel.tsx` - Gráficos (tendências, comparativos)
- [ ] `StorePerformanceCard.tsx` - Card individual com KPIs

**15.2 - KPIs e Métricas**
- [ ] Total de lojas (ativa/inativa)
- [ ] Total de produtos consolidado
- [ ] Total de utilizadores ativos
- [ ] Preço médio geral
- [ ] Margem média geral
- [ ] Crescimento vs período anterior
- [ ] Top 3 lojas (por vendas/produtos/performance)

**15.3 - Gráficos (com Recharts)**
- [ ] Gráfico de linhas: Evolução de vendas por mês
- [ ] Gráfico de barras: Comparativo entre lojas
- [ ] Gráfico de pizza: Distribuição de produtos por tipo
- [ ] Heatmap: Performance por loja/período

**15.4 - Renderização Condicional**
```
Se admin:
  → Mostrar AdminDashboard com dados consolidados
Se loja-manager:
  → Mostrar Dashboard da sua loja
Se funcionário:
  → Mostrar Dashboard básico
```

#### Dados de Exemplo na Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│ 🎯 Dashboard Executivo - PreçoCerto                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 📊 INDICADORES GERAIS                                          │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────┐       │
│ │ 6 Lojas  │ 150 Prod │ 45 Users │ 125 Kz  │ 35.2%    │       │
│ │ Ativas   │ Total    │ Ativos   │ Preço   │ Margem   │       │
│ └──────────┴──────────┴──────────┴──────────┴──────────┘       │
│                                                                  │
│ 📈 TENDÊNCIAS (últimos 30 dias)                               │
│ [Gráfico de linhas com evolução]                               │
│                                                                  │
│ 🏪 TOP 3 LOJAS                                                 │
│ 1. Farmácia Zango    │ 50 Prod │ 15 Users │ 42.5%             │
│ 2. InfoTech Luanda   │ 45 Prod │ 12 Users │ 38.2%             │
│ 3. Ortho Clinic      │ 30 Prod │ 10 Users │ 35.8%             │
│                                                                  │
│ ⚠️  ALERTAS IMPORTANTES                                        │
│ • Farmácia Kalamba: Sem atualizações há 3 dias                 │
│ • InfoShop: Margem abaixo do esperado (22%)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### **FASE 16: Histórico e Relatórios Multi-Loja**
**Duração estimada:** 2 semanas

#### Objetivo
Refatorar histórico e relatórios para mostrar dados por loja com filtros avançados

#### O que implementar

**16.1 - Histórico Refatorado**
- [ ] Refatorar `HistoryView.tsx` para aceitar filtro de loja
- [ ] Adicionar `HistoryFilters.tsx` com:
  - Filtro por loja
  - Filtro por período (data início/fim)
  - Filtro por tipo (produto alterado, preço alterado, etc.)
  - Busca por nome
- [ ] Adicionar visualização em timeline
- [ ] Adicionar export de histórico (CSV/PDF)

**16.2 - Histórico Admin vs Manager**
```typescript
Se admin:
  → Ver histórico de TODAS as lojas
  → Filtrar por loja específica
  → Comparar histórico entre lojas

Se loja-manager:
  → Ver histórico apenas da sua loja
  → Mesmo com filtros, apenas sua loja
```

**16.3 - Relatórios Avançados**
- [ ] Refatorar `ReportBuilder.tsx`:
  - Adicionar filtro por loja
  - Adicionar comparativos entre lojas
  - Adicionar análise de tendências
- [ ] Criar `ReportComparisonView.tsx`:
  - Lado a lado: Loja A vs Loja B
  - Tabela comparativa de KPIs
  - Diferenças percentuais
- [ ] Criar `ReportExport.tsx`:
  - Exportar para PDF (com branding)
  - Exportar para Excel
  - Enviar por email

**16.4 - Dados de Exemplo**

Histórico:
```
Filtro: Farmácia Zango | Últimos 30 dias | Todos os tipos

21/08 14:30 │ Produto: Antibiótico XYZ     │ Preço: 1500 → 1650 Kz │ Admin
21/08 10:15 │ Produto: Vitamina C          │ Preço: 500 → 520 Kz   │ Manager
20/08 16:45 │ Categoria: Antibióticos      │ Margem: 32% → 35%     │ Admin
```

Relatório Comparativo:
```
                │ Farmácia Zango │ InfoTech Luanda │ Diferença
────────────────┼────────────────┼─────────────────┼──────────
Produtos        │ 50             │ 45              │ +5 (11%)
Utilizadores    │ 15             │ 12              │ +3 (25%)
Preço Médio     │ 142 Kz         │ 135 Kz          │ +7 Kz (5%)
Margem Média    │ 42.5%          │ 38.2%           │ +4.3% (11%)
Última Update   │ 21/08 14:30    │ 20/08 18:45     │ 20h atrás
```

---

### **FASE 17: Sistema de Alertas Automáticos**
**Duração estimada:** 1-2 semanas

#### Objetivo
Sistema inteligente de alertas para ajudar admin a monitorar performance

#### O que implementar

**17.1 - Tipos de Alertas**
- [ ] Loja sem atualização há 7+ dias
- [ ] Margem abaixo do esperado (< 25%)
- [ ] Preço médio anormalmente alto/baixo
- [ ] Possível queda de performance vs período anterior
- [ ] Utilizadores inativos
- [ ] Backup não realizado há 30+ dias

**17.2 - Componentes**
- [ ] `AlertsPanel.tsx` - Painel de alertas na dashboard
- [ ] `AlertSettings.tsx` - Config de limites de alerta
- [ ] `AlertHistory.tsx` - Histórico de alertas

**17.3 - Backend (Future)**
- [ ] Firestore rules para criar alertas automaticamente
- [ ] Cloud Functions para executar análises
- [ ] Notificações via email/push

---

## 🏗️ Estrutura de Commits Proposta

```
Fase 15:
  git commit "feat(dashboard): Admin dashboard executivo com KPIs"
  git commit "feat(charts): Gráficos de tendência com Recharts"
  git commit "feat(analytics): Service de analytics para consolidação"

Fase 16:
  git commit "refactor(history): Histórico multi-loja com filtros"
  git commit "refactor(reports): Relatórios com comparativos"
  git commit "feat(reports): Export de relatórios (PDF/Excel)"

Fase 17:
  git commit "feat(alerts): Sistema de alertas automáticos"
  git commit "feat(alerts): Painel e settings de alertas"
```

---

## 📊 Dependências e Bibliotecas

**Já disponíveis:**
- ✅ React 19 + TypeScript
- ✅ Tailwind CSS
- ✅ Framer Motion (animações)
- ✅ Lucide React (ícones)
- ✅ Firebase (backend)

**Precisa adicionar:**
- [ ] **Recharts** - Gráficos (`npm install recharts`)
- [ ] **PDF-lib** ou **pdfkit** - PDF generation
- [ ] **XLSX** - Excel export (já pode ter)

**Instalação:**
```bash
npm install recharts pdf-lib
```

---

## 🎯 Ordem de Implementação Recomendada

### **Semana 1-2: Fase 15.1 a 15.3**
1. Criar estrutura base do AdminDashboard
2. Implementar KPIs de leitura
3. Adicionar gráficos básicos

### **Semana 2-3: Fase 15.4 a 16.1**
1. Renderização condicional por papel
2. Refatorar HistoryView
3. Adicionar filtros de histórico

### **Semana 3-4: Fase 16.2 a 16.3**
1. Histórico admin vs manager
2. Relatórios comparativos
3. Export de relatórios

### **Semana 4-5: Fase 17**
1. Sistema de alertas
2. Painel de alertas
3. Configurações de alertas

---

## 🔄 Integração com Fases Anteriores

A implementação se baseia em:

| Fase | O que foi feito | Como usa Fase 15+ |
|------|---|---|
| 12 | Categorias por loja | Histórico de mudanças de categorias por loja |
| 13 | Notificações | Alertas enviados via notificações |
| 14 | Listagem de lojas | Dashboard mostra performance de cada loja |

---

## 💡 Boas Práticas

### Performance
- [ ] Usar `useMemo` para cálculos de KPIs
- [ ] Implementar lazy loading de gráficos
- [ ] Cache de dados analytics no Firestore

### UX
- [ ] Indicadores com setas de tendência (↑↓)
- [ ] Cores que indicam saúde (verde=bom, amarelo=atenção, vermelho=crítico)
- [ ] Tooltips explicando cada métrica

### Segurança
- [ ] Admin vê TODAS as lojas
- [ ] Loja-manager vê apenas SUA loja
- [ ] Funcionário vê apenas dashboard básico
- [ ] Aplicar regras Firestore para estes filtros

---

## ✅ Checklist Final

- [ ] Fase 15: Dashboard admin pronto
- [ ] Fase 16: Histórico e relatórios multi-loja
- [ ] Fase 17: Sistema de alertas
- [ ] Todos os testes passando
- [ ] Documentação atualizada
- [ ] Performance otimizada (< 2s para carregar dashboard)

---

**Status:** 🟡 Planeado
**Próximo Passo:** Implementar Fase 15 (Dashboard Admin Executivo)
**Versão:** 1.0 (Roadmap)
**Data:** 2026-08-14
