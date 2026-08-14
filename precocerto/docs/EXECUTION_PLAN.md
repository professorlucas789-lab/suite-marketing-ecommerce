# 🎯 Plano de Execução Completo - Etapas Sequenciais

## 📊 Visão Geral

Este documento descreve como vamos implementar **todas as correções e fases** de forma **sequencial e lógica**.

Cada etapa tem:
- ✅ Checkpoints de verificação
- 📋 Tasks específicas
- ✔️ Critério de conclusão
- → Próxima etapa

---

## 🚀 ETAPA 1: Resolver Problema "Categorias" + Teste de Cores

**Duração estimada:** 1-2 dias
**Status:** 🟡 Aguardando ação do utilizador
**Próxima etapa:** Fase 15

### 📋 Tasks

#### Task 1.1: Executar Diagnóstico
```
[ ] Faça login como admin (professorlucas789@gmail.com)
[ ] Abra DevTools (F12)
[ ] Copie e execute o script em DIAGNOSTIC_SCRIPT.md
[ ] Anote o resultado (papel no Firestore)
```

**Se resultado for:**
- `papel: "admin"` → Ir para Task 1.3 (Limpar cache)
- `papel: "funcionario"` ou outro → Ir para Task 1.2 (Corrigir)

#### Task 1.2: Corrigir Papel no Firestore (se necessário)
```
[ ] Abra Firebase Console
[ ] Vá a Firestore Database → Collection "users"
[ ] Procure documento com seu UID
[ ] Edite campo "papel" para exatamente: "admin"
[ ] Aguarde sincronização
```

#### Task 1.3: Limpar Cache e Testar
```
[ ] Faça logout completo
[ ] Limpe cookies/cache do navegador
[ ] Feche o navegador completamente
[ ] Reabra o navegador
[ ] Faça login novamente
[ ] Verifique se "Categorias" aparece no menu
```

#### Task 1.4: Testar Cores Dinâmicas
```
[ ] Vá a Settings → Configurações
[ ] Mude a cor primária (escolha uma cor diferente)
[ ] Clique Salvar
[ ] Verifique se os botões mudam de cor
[ ] Verifique se o sidebar muda de cor
[ ] Volte à cor original
```

### ✅ Critério de Conclusão

- ✅ Menu "Categorias" está visível e acessível
- ✅ Cores dinâmicas se atualizam quando muda a palete
- ✅ Admin consegue criar/editar categorias
- ✅ Sem erros no console

### 📞 Comunicação

Após concluir, informe:
```
✅ ETAPA 1 CONCLUÍDA
- Menu "Categorias": SIM / NÃO
- Cores dinâmicas funcionando: SIM / NÃO
- Problema resolvido: SIM / NÃO

Próximo: Começar FASE 15 (Dashboard Admin)
```

---

## 🚀 ETAPA 2: FASE 15 - Dashboard Admin Executivo

**Duração estimada:** 3-4 semanas
**Só começa:** Depois de Etapa 1 ✅
**Próxima etapa:** Fase 16

### 📊 O que será implementado

#### Componentes novos:
```
src/components/
├── AdminDashboard.tsx          (painel principal)
├── dashboard/
│   ├── AnalyticsPanel.tsx      (gráficos)
│   ├── StorePerformanceCard.tsx (card de loja)
│   ├── KPICard.tsx             (card de métrica)
│   └── AlertsPanel.tsx         (alertas)
```

#### Services novos:
```
src/services/
├── analyticsService.ts         (cálculos de KPIs)
├── dashboardService.ts         (agregação de dados)
```

#### Tipos novos:
```
src/types/
└── analytics.ts                (tipos de dados)
```

### 📋 Tasks Fase 15

#### 15.1: Estrutura Base e Tipos
```
[ ] Criar types/analytics.ts com:
    [ ] interface KPI { label, value, trend, icon }
    [ ] interface StorePerformance { ... }
    [ ] interface DashboardData { ... }

[ ] Criar services/analyticsService.ts com:
    [ ] calculateTotalStores()
    [ ] calculateTotalProducts()
    [ ] calculateTotalUsers()
    [ ] calculateAveragePrice()
    [ ] calculateAverageMargin()
    [ ] getTopStores(limit)
    [ ] getStoresTrends(days)
```

#### 15.2: Componentes Base
```
[ ] Criar KPICard.tsx:
    [ ] Exibe valor + trending
    [ ] Cores verde/laranja/vermelho
    [ ] Ícone + label
    [ ] Animação de entrada

[ ] Criar StorePerformanceCard.tsx:
    [ ] Nome da loja + tipo
    [ ] Mini-métricas (produtos, users, margem)
    [ ] Status ativo/inativo
    [ ] Última atualização

[ ] Criar AlertsPanel.tsx:
    [ ] Lista de alertas
    [ ] Cores por severidade
    [ ] Ação de descartar/resolver
```

#### 15.3: Gráficos (Recharts)
```
[ ] Instalar: npm install recharts

[ ] Criar AnalyticsPanel.tsx:
    [ ] LineChart: Evolução de vendas (30 dias)
    [ ] BarChart: Comparativo entre lojas
    [ ] PieChart: Distribuição de produtos
    [ ] Tooltips personalizados
    [ ] Cores dinâmicas (primaryHex)

[ ] Criar chart helpers:
    [ ] formatChartData()
    [ ] getChartColors()
```

#### 15.4: Dashboard Principal
```
[ ] Criar AdminDashboard.tsx:
    [ ] Header com título e data
    [ ] Grid de KPIs (6 cards)
    [ ] Section de gráficos
    [ ] Section de top 3 lojas
    [ ] Section de alertas
    [ ] Modo responsivo (mobile/tablet/desktop)
    [ ] Animações Framer Motion

[ ] Integrar em App.tsx:
    [ ] Renderizar AdminDashboard se admin
    [ ] Renderizar Dashboard normal se não admin
    [ ] Passar dados necessários
```

#### 15.5: Testes e Otimização
```
[ ] Testar com dados reais
[ ] Verificar performance (< 2s carregamento)
[ ] Testar responsividade em celular
[ ] Verificar cores dinâmicas em gráficos
[ ] Testar modo escuro
```

### ✅ Critério de Conclusão Fase 15

- ✅ Dashboard visível apenas para admin
- ✅ Todos os KPIs mostram valores corretos
- ✅ Gráficos renderizam sem erros
- ✅ Top 3 lojas está correto
- ✅ Alertas aparecem (se houver)
- ✅ Responsivo em todos os tamanhos
- ✅ Performance OK (< 2s)
- ✅ Modo escuro funciona

### 📞 Comunicação

Fase 15 será entregue em **sub-etapas**:
```
SUB-ETAPA 15.1: Tipos e Services
SUB-ETAPA 15.2: Componentes Base
SUB-ETAPA 15.3: Gráficos
SUB-ETAPA 15.4: Dashboard Completo
SUB-ETAPA 15.5: Testes

Após cada sub-etapa:
[ ] Faça login
[ ] Teste a funcionalidade
[ ] Informe se tem algum problema
[ ] Eu corrijo e continuo
```

---

## 🚀 ETAPA 3: FASE 16 - Histórico e Relatórios Multi-Loja

**Duração estimada:** 2-3 semanas
**Só começa:** Depois de FASE 15 ✅
**Próxima etapa:** Fase 17

### 📊 O que será implementado

#### Componentes refatorados:
```
src/components/
├── GeneralHistoryView.tsx      (REFATORAR)
├── history/
│   ├── HistoryFilters.tsx      (NOVO)
│   ├── HistoryTimeline.tsx     (NOVO)
│   └── HistoryExport.tsx       (NOVO)
├── ReportBuilder.tsx           (REFATORAR)
└── reports/
    ├── ReportComparisonView.tsx (NOVO)
    └── ReportExport.tsx        (NOVO)
```

### 📋 Tasks Fase 16

#### 16.1: Refatorar Histórico
```
[ ] Modificar GeneralHistoryView.tsx:
    [ ] Adicionar filtro por loja
    [ ] Verificar permissões (admin vs manager)
    [ ] Limitar dados baseado em papel
    [ ] Manter funcionalidade existente

[ ] Criar HistoryFilters.tsx:
    [ ] Filtro de loja (dropdown)
    [ ] Filtro de data (inicio/fim)
    [ ] Filtro de tipo (produto/preço/etc)
    [ ] Busca por nome
    [ ] Botão Clear filters

[ ] Criar HistoryTimeline.tsx:
    [ ] Visualização em timeline vertical
    [ ] Ícones por tipo de mudança
    [ ] Cores diferenciadas
    [ ] Dados detalhados ao clicar
```

#### 16.2: Histórico Admin vs Manager
```
[ ] Se admin:
    [ ] Consegue ver histórico de TODAS as lojas
    [ ] Filtro por loja funciona
    [ ] Pode comparar lojas
    [ ] Exportar histórico geral

[ ] Se loja-manager:
    [ ] Vê apenas da sua loja (filtro fixo)
    [ ] Filtro de loja desabilitado
    [ ] Pode exportar

[ ] Se funcionário:
    [ ] Menu "Histórico" não aparece
```

#### 16.3: Refatorar Relatórios
```
[ ] Modificar ReportBuilder.tsx:
    [ ] Adicionar filtro por loja
    [ ] Adicionar filtro de período
    [ ] Suportar comparativos

[ ] Criar ReportComparisonView.tsx:
    [ ] Loja A vs Loja B (lado a lado)
    [ ] Tabela comparativa de KPIs
    [ ] Diferenças percentuais
    [ ] Recomendações
    [ ] Visual claro com cores

[ ] Criar ReportExport.tsx:
    [ ] Export para PDF (com branding)
    [ ] Export para Excel
    [ ] Enviar por email (placeholder)
```

#### 16.4: Testes e Otimização
```
[ ] Testar relatório simples
[ ] Testar relatório comparativo
[ ] Testar export PDF
[ ] Testar export Excel
[ ] Testar permissões (admin vs manager)
[ ] Testar performance com muitos dados
```

### ✅ Critério de Conclusão Fase 16

- ✅ Histórico mostra dados por loja
- ✅ Filtros funcionam corretamente
- ✅ Admin vê todas as lojas, manager vê apenas sua
- ✅ Relatórios comparativos funcionam
- ✅ Export PDF/Excel funciona
- ✅ Nenhum dado vazado (segurança)

---

## 🚀 ETAPA 4: FASE 17 - Sistema de Alertas Automáticos

**Duração estimada:** 1-2 semanas
**Só começa:** Depois de FASE 16 ✅
**Próxima etapa:** Fim (sistema completo!)

### 📊 O que será implementado

#### Componentes novos:
```
src/components/
└── alerts/
    ├── AlertsPanel.tsx         (painel de alertas)
    ├── AlertSettings.tsx       (configurações)
    └── AlertHistory.tsx        (histórico de alertas)
```

#### Services novos:
```
src/services/
└── alertService.ts             (lógica de alertas)
```

### 📋 Tasks Fase 17

#### 17.1: Tipos e Serviços
```
[ ] Criar types/alerts.ts:
    [ ] interface Alert { id, type, message, severity, createdAt }
    [ ] enum AlertType { STALE_DATA, LOW_MARGIN, ABNORMAL_PRICE, LOW_PERFORMANCE, BACKUP }
    [ ] enum AlertSeverity { LOW, MEDIUM, HIGH, CRITICAL }

[ ] Criar alertService.ts:
    [ ] checkStaleData() - Loja sem update 7+ dias
    [ ] checkLowMargin() - Margem < 25%
    [ ] checkAbnormalPrice() - Preço fora do normal
    [ ] checkLowPerformance() - Queda vs período anterior
    [ ] checkBackupStatus() - Backup não feito 30+ dias
    [ ] getAlerts(limit)
    [ ] acknowledgeAlert(alertId)
```

#### 17.2: Componentes de Alertas
```
[ ] Criar AlertsPanel.tsx:
    [ ] Lista de alertas ativos
    [ ] Ícone + cor por severity
    [ ] Mensagem explicativa
    [ ] Botão descartar/resolver
    [ ] Sem alertas → mensagem vazia

[ ] Criar AlertSettings.tsx:
    [ ] Configurar limites de alerta
    [ ] Margem mínima esperada (default 25%)
    [ ] Dias máximo sem atualizar (default 7)
    [ ] Preço máximo/mínimo aceitável
    [ ] Toggle para ativar/desativar alertas
    [ ] Salvar configurações

[ ] Criar AlertHistory.tsx:
    [ ] Histórico de alertas (últimos 30 dias)
    [ ] Filtrar por tipo
    [ ] Filtrar por status (ativo/resolvido)
    [ ] Timeline dos alertas
```

#### 17.3: Integração
```
[ ] Integrar AlertsPanel no AdminDashboard
[ ] Adicionar botão Settings para AlertSettings
[ ] Chamar alertService ao carregar dashboard
[ ] Atualizar alertas periodicamente (polling)
[ ] Mostrar badge com número de alertas no menu
```

#### 17.4: Testes
```
[ ] Testar cada tipo de alerta
[ ] Testar configurações sendo salvas
[ ] Testar histórico de alertas
[ ] Testar performance do polling
[ ] Testar permissões (apenas admin vê)
```

### ✅ Critério de Conclusão Fase 17

- ✅ Alertas aparecem corretamente
- ✅ Cada tipo de alerta funciona
- ✅ Configurações persistem
- ✅ Histórico de alertas está correto
- ✅ Apenas admin vê alertas
- ✅ Performance OK (polling < 30s)

---

## 📋 Checklist Global

### ETAPA 1: Diagnóstico
- [ ] Script executado com sucesso
- [ ] Papel verificado/corrigido
- [ ] Menu "Categorias" aparece
- [ ] Cores dinâmicas funcionam

### ETAPA 2: Fase 15 - Dashboard
- [ ] Tipos criados
- [ ] Services criados
- [ ] KPI Cards criados
- [ ] Gráficos funcionam
- [ ] Dashboard completo
- [ ] Testes passed

### ETAPA 3: Fase 16 - Histórico + Relatórios
- [ ] Histórico refatorado
- [ ] Filtros funcionam
- [ ] Permissões aplicadas
- [ ] Relatórios comparativos
- [ ] Export funciona
- [ ] Testes passed

### ETAPA 4: Fase 17 - Alertas
- [ ] Tipos de alertas criados
- [ ] Services criados
- [ ] Componentes criados
- [ ] Alertas aparecem
- [ ] Configurações funcionam
- [ ] Testes passed

---

## 🎯 Metodologia de Trabalho

### Para cada sub-etapa:

1. **Desenvolvimento**
   - Implemento o código
   - Commit com mensagem clara
   - Push para branch

2. **Seu feedback**
   - Você testa
   - Informa se tem problemas
   - Sugere melhorias

3. **Iteração**
   - Eu corrijo/melhoro
   - Novo commit e push
   - Pronto para próxima sub-etapa

### Comunicação esperada

```
[Eu] Implementei sub-etapa X.Y
     Teste e informe os resultados
     
[Você] Testei, funciona! Próximo?
       OU
       Encontrei problema Z
       
[Eu] Corrigido! Novo commit feito
     Próxima sub-etapa?
```

---

## 📅 Timeline Estimada

| Etapa | Descrição | Duração | Status |
|-------|-----------|---------|--------|
| 1 | Diagnóstico + Cores | 1-2 dias | 🟡 Aguardando |
| 2 | Fase 15 - Dashboard | 3-4 sem | ⏳ Depois |
| 3 | Fase 16 - Histórico | 2-3 sem | ⏳ Depois |
| 4 | Fase 17 - Alertas | 1-2 sem | ⏳ Depois |
| **Total** | **Projeto Completo** | **~8-11 sem** | 🟡 Em progresso |

---

## 🎬 Como Começar Agora?

### Você faz:
1. Copie o script de `DIAGNOSTIC_SCRIPT.md`
2. Abra DevTools (F12) na aplicação
3. Execute o script
4. Informe-me o resultado

### Eu faço:
1. Aguardo seu feedback
2. Assim que confirmado, começo Fase 15
3. Envio primeira sub-etapa para teste

---

## 📞 Próximos Passos

**Agora:**
```
👉 Execute o diagnóstico (DIAGNOSTIC_SCRIPT.md)
   Informe o resultado
```

**Próximo:**
```
👉 Começamos FASE 15 (Dashboard Admin)
   Sub-etapa por sub-etapa
```

---

**Status Geral:** 🟡 Etapa 1 - Aguardando Diagnóstico
**Data:** 2026-08-14
**Próxima Revisão:** Depois do diagnóstico
