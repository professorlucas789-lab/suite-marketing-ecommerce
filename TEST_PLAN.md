# 🧪 Plano de Testes - PreçoCerto Application

**Status:** Pronto para Teste Completo  
**Data:** 2026-08-24  
**Escopo:** Phases 1-8 (Todas as Features)

---

## 📋 Resumo Executivo

**Total de Testes:** 87  
**Tempo Estimado:** 2-3 horas (manual)  
**Critério de Sucesso:** >95% testes passando  

---

## 🧪 Testes Funcionais por Fase

### Phase 17: Executive Dashboard (11 testes)

#### Dashboard Load (3 testes)
- [ ] **T1.1:** Dashboard Executivo carrega em < 2 segundos
  - Pré-requisito: Usuário com role admin/loja-manager
  - Ação: Clicar em "Dashboard Executivo"
  - Esperado: Dashboard com 8 secções visíveis
  - Critério: Load time < 2s (Chrome DevTools)

- [ ] **T1.2:** KPI cards mostram valores corretos
  - Pré-requisito: Loja com dados de vendas
  - Ação: Verificar valores de Receita, Pedidos, Margem, Saúde
  - Esperado: Valores correspondem aos dados do Firestore
  - Critério: ±5% de precisão

- [ ] **T1.3:** Gráficos renderizam sem erros
  - Pré-requisito: Dados de 30 dias disponíveis
  - Ação: Observar gráficos de tendência
  - Esperado: Linha de receita e pedidos visíveis
  - Critério: Sem erros no console (F12)

#### Period Selector (3 testes)
- [ ] **T1.4:** Selector "7 dias" filtra dados corretamente
  - Ação: Clicar "Últimos 7 dias"
  - Esperado: Dados atualizados, gráficos redesenhados
  - Critério: < 1 segundo para refresh

- [ ] **T1.5:** Selector "30 dias" é padrão
  - Ação: Carregar dashboard
  - Esperado: "30 dias" pré-selecionado
  - Critério: Comparativo with/previous período funciona

- [ ] **T1.6:** Selector "90 dias" agregação correta
  - Ação: Clicar "Últimos 90 dias"
  - Esperado: Maior período de dados
  - Critério: Tendência visível em 3 meses

#### Health Score & Alerts (3 testes)
- [ ] **T1.7:** Store Health Score calcula corretamente
  - Pré-requisito: Múltiplos produtos com diferentes stati
  - Ação: Observar gauge de saúde
  - Esperado: Score 0-100%, sub-categorias visíveis
  - Critério: Corresponde a cálculo manual

- [ ] **T1.8:** Alertas críticos mostram em vermelho
  - Pré-requisito: Produtos vencendo < 7 dias
  - Ação: Observar secção de alertas
  - Esperado: Alertas em topo com ícone de ação
  - Critério: Severity colors corretos

- [ ] **T1.9:** Dark mode funciona no dashboard
  - Ação: Toggle dark mode
  - Esperado: Cores legíveis em ambos temas
  - Critério: Nenhum elemento invisível

#### RBAC & Permissions (2 testes)
- [ ] **T1.10:** Dashboard inacessível para funcionário
  - Pré-requisito: Usuário com role "funcionario"
  - Ação: Tentar aceder /dashboard-executivo
  - Esperado: Redirecionado para dashboard normal OU mensagem "Acesso Negado"
  - Critério: Sem acesso a dados de outras lojas

- [ ] **T1.11:** Apenas dados da loja atual visíveis
  - Pré-requisito: Usuário com múltiplas lojas
  - Ação: Alternar entre lojas, verificar dados
  - Esperado: Dados mudam por loja
  - Critério: Isolamento completo de dados

---

### Phase 1: Expiry Notifications (16 testes)

#### Alertas View (4 testes)
- [ ] **T2.1:** AlertsView carrega em < 1.5 segundos
  - Ação: Clicar menu "Alertas"
  - Esperado: Header com contador de issues
  - Critério: 3 stat cards visíveis

- [ ] **T2.2:** Contador de alertas críticos correto
  - Pré-requisito: 2-3 produtos vencendo < 7 dias
  - Ação: Observar card "Críticos"
  - Esperado: Número matches alertas reais
  - Critério: Atualiza em real-time

- [ ] **T2.3:** Contador de avisos correto
  - Pré-requisito: 3-5 produtos vencendo < 30 dias
  - Ação: Observar card "Avisos"
  - Esperado: Número correto
  - Critério: Status "WARNING" apenas

- [ ] **T2.4:** Contador de stock baixo funciona
  - Pré-requisito: Produtos com quantidade < minQty
  - Ação: Observar card "Stock Baixo"
  - Esperado: Produtos listados
  - Critério: Integração com stock service

#### Alert Severity (4 testes)
- [ ] **T2.5:** CRITICAL severity (< 7 dias)
  - Pré-requisito: Produto vencendo em 3 dias
  - Ação: Verificar HealthCheckPanel
  - Esperado: Alerta em vermelho (Red border)
  - Critério: Prioridade máxima

- [ ] **T2.6:** WARNING severity (7-30 dias)
  - Pré-requisito: Produto vencendo em 15 dias
  - Ação: Verificar listagem
  - Esperado: Alerta em amarelo (Amber border)
  - Critério: Atenção necessária

- [ ] **T2.7:** INFO severity (30-60 dias)
  - Pré-requisito: Produto vencendo em 45 dias
  - Ação: Verificar listagem
  - Esperado: Alerta em azul (Info border) ou discreto
  - Critério: Informativo apenas

- [ ] **T2.8:** Produtos já expirados (CRITICAL)
  - Pré-requisito: Produto com dataValidade no passado
  - Ação: Verificar AlertsView
  - Esperado: Alerta com ícone 🚨
  - Critério: Ação imediata recomendada

#### Alert Filtering (4 testes)
- [ ] **T2.9:** Filtrar por severidade CRITICAL
  - Ação: Clicar filtro "Críticos"
  - Esperado: Apenas CRITICAL alertas visíveis
  - Critério: Outros ocultados

- [ ] **T2.10:** Filtrar por severidade WARNING
  - Ação: Clicar filtro "Avisos"
  - Esperado: Apenas WARNING alertas
  - Critério: Múltiplas seleções possíveis

- [ ] **T2.11:** Filtro "Todos" mostra todos alertas
  - Ação: Clicar "Todos"
  - Esperado: CRITICAL + WARNING + INFO visíveis
  - Critério: Sem ocultação

- [ ] **T2.12:** Search box filtra por nome de produto
  - Ação: Digitar "Ibuprofeno" na search
  - Esperado: Apenas alertas desse produto
  - Critério: Case-insensitive search

#### Alert Actions (4 testes)
- [ ] **T2.13:** Botão "Ver Produto" funciona
  - Ação: Clicar "Ver Produto" em um alerta
  - Esperado: Navega para edit page do produto
  - Critério: Dados do produto pré-preenchidos

- [ ] **T2.14:** Botão "Reconhecer" marca como lido
  - Ação: Clicar "Reconhecer" em um alerta
  - Esperado: Alerta muda status visual
  - Esperado: Timestamp de acknowledgedAt registado
  - Critério: Persiste no Firestore

- [ ] **T2.15:** Botão "Resolvido" remove alerta
  - Pré-requisito: Motivo selecionado (Vendido, Descartado, etc)
  - Ação: Clicar "Resolvido"
  - Esperado: Alerta sai da view
  - Critério: Histórico preservado

- [ ] **T2.16:** Histórico de alertas acessível
  - Ação: Clicar "Ver Histórico"
  - Esperado: Timeline de alertas passados
  - Critério: Data, status, motivo visível

---

### Phase 2: Stock Management (14 testes)

#### Stock Movement Recorder (4 testes)
- [ ] **T3.1:** Form carrega com categorias de produto
  - Ação: Abrir StockMovementRecorder
  - Esperado: Produto search com autocomplete
  - Critério: Campo de quantidade, tipo de movimento

- [ ] **T3.2:** Registar movimento IN (+)
  - Ação: Procurar produto, selecionar "Entrada", qty=10
  - Esperado: Produto adicionado ao inventory
  - Critério: quantidadeDisponível aumenta 10

- [ ] **T3.3:** Registar movimento OUT (-)
  - Pré-requisito: Produto com qty=50
  - Ação: Selecionar "Saída", qty=5
  - Esperado: quantidadeDisponível = 45
  - Critério: Transação negativa impossível

- [ ] **T3.4:** Registar ADJUSTMENT (perda/devolução)
  - Ação: Selecionar "Ajuste", qty=-3, motivo="Perda"
  - Esperado: Nota registada, quantidade ajustada
  - Critério: Histórico shows reason

#### Stock History (3 testes)
- [ ] **T3.5:** StockMovementHistory carrega movimentos
  - Ação: Abrir histórico de produto
  - Esperado: Timeline com IN/OUT/ADJUSTMENT
  - Critério: Datas, quantidades, razões visíveis

- [ ] **T3.6:** Filtrar por tipo de movimento
  - Ação: Selecionar "Apenas Entradas"
  - Esperado: Apenas movimentos IN visíveis
  - Critério: Outros tipos ocultados

- [ ] **T3.7:** Filtrar por período
  - Ação: Selecionar "Últimos 30 dias"
  - Esperado: Movimentos fora do período ocultos
  - Critério: Data range funciona

#### Stock Analytics (3 testes)
- [ ] **T3.8:** Gráfico de stock over time
  - Pré-requisito: 10+ movimentos num produto
  - Ação: Observar StockAnalyticsPanel
  - Esperado: Gráfico linha mostrando stock evolution
  - Critério: Pontos alinhados com movimentos

- [ ] **T3.9:** Previsão "Dias até esgotar"
  - Pré-requisito: Produto com velocity de saída
  - Ação: Verificar forecast
  - Esperado: Número de dias até qty=0
  - Critério: Cálculo baseado em trend

- [ ] **T3.10:** Alertas de stock baixo
  - Pré-requisito: Produto qty < minQuantity
  - Ação: Verificar painel
  - Esperado: Alerta orange com sugestão de reorder
  - Critério: Reorder qty recomendado

#### Stock Alerts Config (4 testes)
- [ ] **T3.11:** Configurar minQuantity por produto
  - Ação: Abrir configurações de alerta
  - Ação: Definir minQty=15
  - Esperado: Alerta dispara quando qty < 15
  - Critério: Persistido no Firestore

- [ ] **T3.12:** Configurar reorderQuantity
  - Ação: Definir reorderQty=30
  - Esperado: Sugestão "Reabastecer com 30 unidades"
  - Critério: Aparece no painel quando qty baixo

- [ ] **T3.13:** Multi-canal notifications
  - Ação: Ativar "Email" + "WhatsApp"
  - Esperado: Quando alerta dispara, ambos canais acionados
  - Critério: NotificationLog registado

- [ ] **T3.14:** Configuração por categoria
  - Ação: Definir minQty para categoria inteira
  - Esperado: Aplica-se a todos produtos da categoria
  - Critério: Override individual possível

---

### Phase 3: Sales Module (18 testes)

#### Sales Recorder (5 testes)
- [ ] **T4.1:** QuickSalesRecorder form carrega
  - Ação: Clicar "Registar Venda"
  - Esperado: Modal com produto search
  - Critério: Campo quantidade, preço, cliente (opt)

- [ ] **T4.2:** Registar venda simples
  - Ação: Procurar "Ibuprofen", qty=5, preço auto-preenchido
  - Esperado: Venda criada, stock reduzido 5
  - Critério: Sale record em Firestore

- [ ] **T4.3:** Preço auto-preenchido correto
  - Pré-requisito: Produto com precoVendaRecomendado=100
  - Ação: Procurar produto
  - Esperado: Campo preço mostra 100 (editável)
  - Critério: Pode alterar se necessário

- [ ] **T4.4:** Margin calculation em tempo real
  - Pré-requisito: Produto custo=40, venda=100
  - Ação: Observar margin % durante input
  - Esperado: Margin = (100-40)/100 = 60%
  - Critério: Atualiza em tempo real

- [ ] **T4.5:** Venda com quantidade negativa bloqueada
  - Ação: Tentar digitar qty=-5
  - Esperado: Campo rejeitado ou aviso mostrado
  - Critério: Validação no form

#### Sales History (4 testes)
- [ ] **T4.6:** SalesHistory carrega com últimas vendas
  - Ação: Abrir "Histórico de Vendas"
  - Esperado: Tabela com data, produto, qty, preço, margin
  - Critério: Ordenado por data DESC

- [ ] **T4.7:** Filtrar por período
  - Ação: Selecionar "Últimos 7 dias"
  - Esperado: Vendas fora do período ocultas
  - Critério: Date range funciona

- [ ] **T4.8:** Filtrar por produto
  - Ação: Search "Ibuprofen"
  - Esperado: Apenas vendas desse produto
  - Critério: Case-insensitive

- [ ] **T4.9:** Filtrar por vendedor (se multi-user)
  - Pré-requisito: Múltiplas vendas de utilizadores diferentes
  - Ação: Selecionar vendedor
  - Esperado: Apenas vendas desse user
  - Critério: userId filtro funciona

#### Sales Analytics (4 testes)
- [ ] **T4.10:** SalesAnalyticsDashboard carrega KPIs
  - Ação: Abrir analytics
  - Esperado: Cards: Total Revenue, Units, Avg Value, Avg Margin
  - Critério: Valores corretos

- [ ] **T4.11:** Revenue trend chart
  - Pré-requisito: 30+ vendas
  - Ação: Observar gráfico de receita
  - Esperado: Linha mostrando revenue daily
  - Critério: Picos e vales correspondem a vendas

- [ ] **T4.12:** Top 10 produtos por revenue
  - Ação: Observar tabela de top produtos
  - Esperado: Ordenado por receita DESC
  - Critério: Percentagem de contribuição visível

- [ ] **T4.13:** Top categorias com crescimento %
  - Ação: Observar secção de categorias
  - Esperado: Crescimento comparado ao período anterior
  - Critério: Setas up/down visíveis

#### Sales Reconciliation (3 testes)
- [ ] **T4.14:** SalesCashClosing carrega
  - Ação: Abrir "Fecho de Caixa"
  - Esperado: Total de vendas do dia
  - Critério: Comparável ao dinheiro contado

- [ ] **T4.15:** Criar novo closing
  - Ação: Clicar "Novo Fecho", digitar dinheiro contado=5000
  - Esperado: Sistema vs. Physical discrepância mostrada
  - Critério: Histórico de closings preservado

- [ ] **T4.16:** Anomaly detection
  - Pré-requisito: Venda com margin negativa
  - Ação: Verificar alertas
  - Esperado: Alerta "Margem Negativa" mostrado
  - Critério: Em cor vermelha

#### Stock Integration (2 testes)
- [ ] **T4.17:** Venda reduz quantidadeDisponível
  - Pré-requisito: Produto qty=50
  - Ação: Registar venda qty=5
  - Esperado: Product.quantidadeDisponível = 45 imediatamente
  - Critério: Real-time update no Firestore

- [ ] **T4.18:** Venda impossível se stock insuficiente
  - Pré-requisito: Produto qty=2
  - Ação: Tentar vender 5 unidades
  - Esperado: Alerta "Stock insuficiente"
  - Critério: Validação firestore rules

---

### Phase 4: Financial & Purchasing (8 testes)

#### Financial View (4 testes)
- [ ] **T5.1:** FinancialView carrega com resumo
  - Ação: Abrir "Financeiro"
  - Esperado: KPIs: Total Revenue, Total Cost, Profit, Margin %
  - Critério: Valores agregados corretos

- [ ] **T5.2:** Gráfico de profit over time
  - Pré-requisito: 30+ dias de vendas
  - Ação: Observar gráfico
  - Esperado: Linha de lucro diário
  - Critério: Calcula cost - revenue

- [ ] **T5.3:** Análise por categoria
  - Ação: Observar revenue breakdown
  - Esperado: Pie chart com % por categoria
  - Critério: Clicável para detalhar

- [ ] **T5.4:** Exportar relatório financeiro
  - Ação: Clicar "Exportar PDF" ou "Exportar Excel"
  - Esperado: Download de arquivo
  - Critério: Dados completos no arquivo

#### Purchasing View (4 testes)
- [ ] **T5.5:** PurchasingView lista fornecedores
  - Ação: Abrir "Fornecedores"
  - Esperado: Tabela com nome, contacto, total comprado
  - Critério: Ordenável por coluna

- [ ] **T5.6:** Registar nova compra
  - Ação: Clicar "Nova Compra", selecionar fornecedor, produtos
  - Esperado: Compra criada, stock aumentado
  - Critério: Histórico de compras atualizado

- [ ] **T5.7:** Análise de spend por fornecedor
  - Ação: Observar gráfico de fornecedores
  - Esperado: % de gasto por supplier
  - Critério: Identifica principais fornecedores

- [ ] **T5.8:** Negociação de preços
  - Pré-requisito: Múltiplas compras do mesmo produto
  - Ação: Comparar preço unitário por fornecedor
  - Esperado: Sugestão "Fornecedor X mais barato"
  - Critério: Análise de oportunidade

---

## 🔍 Testes de Performance

### Load Time (5 testes)
- [ ] **PERF1:** Dashboard Executivo: < 2s
- [ ] **PERF2:** Alertas: < 1.5s
- [ ] **PERF3:** Stock Management: < 2s
- [ ] **PERF4:** Sales Module: < 2s
- [ ] **PERF5:** Financial: < 2s

**Método:** Chrome DevTools > Network tab

### Bundle Size (2 testes)
- [ ] **PERF6:** Total bundle: < 2MB (gzipped < 500KB)
- [ ] **PERF7:** Cada lazy-chunk: < 100KB gzipped

**Método:** `npm run build` output

### Firestore Queries (3 testes)
- [ ] **PERF8:** Alertas query: < 100ms
- [ ] **PERF9:** Sales history: < 200ms (com pagination)
- [ ] **PERF10:** Dashboard metrics: < 500ms

---

## 🎨 Testes de UI/UX

### Responsive Design (6 testes)
- [ ] **RESP1:** Desktop (1920x1080): todos elementos alinhados
- [ ] **RESP2:** Tablet (768x1024): layout adapta, sem horizontal scroll
- [ ] **RESP3:** Mobile (375x667): mobile menu funciona
- [ ] **RESP4:** Mobile forms: inputs tamanho grande, toques fáceis
- [ ] **RESP5:** Charts: responsive, escaláveis
- [ ] **RESP6:** Dark mode: legível em todos tamanhos

### Dark Mode (4 testes)
- [ ] **DARK1:** Todos elementos têm cores definidas
- [ ] **DARK2:** Nenhum elemento invisível em dark mode
- [ ] **DARK3:** Toggle funciona sem delay
- [ ] **DARK4:** Preferência salva em localStorage

### Accessibility (4 testes)
- [ ] **A11Y1:** Cores tem contrast ratio > 4.5:1
- [ ] **A11Y2:** Teclado navigation funciona (Tab, Enter)
- [ ] **A11Y3:** Screen reader reads buttons/links
- [ ] **A11Y4:** Inputs têm labels associados

---

## 🔐 Testes de Segurança & RBAC

### RBAC (6 testes)
- [ ] **RBAC1:** Admin vê todos dashboards
- [ ] **RBAC2:** Loja-Manager vê apenas sua loja
- [ ] **RBAC3:** Funcionário não vê analytics avançadas
- [ ] **RBAC4:** Dados de outras lojas nunca são expostos
- [ ] **RBAC5:** URLs diretas sem permissão redirecionam
- [ ] **RBAC6:** API calls com storeId inválido falham

### Data Isolation (3 testes)
- [ ] **ISO1:** Produtos de loja A ocultos para loja B
- [ ] **ISO2:** Alertas isolados por storeId
- [ ] **ISO3:** Vendas não cruzam lojas

### Firestore Rules (2 testes)
- [ ] **FBR1:** Read sem autenticação falha
- [ ] **FBR2:** Write sem permissão falha

---

## 📋 Testes de Integração

### Cross-Feature (5 testes)
- [ ] **INT1:** Venda (Phase 3) reduz Stock (Phase 2)
- [ ] **INT2:** Stock baixo gera Alerta (Phase 1)
- [ ] **INT3:** Alerta resolvido remove de AlertsView
- [ ] **INT4:** Dashboard (Phase 17) mostra Alertas
- [ ] **INT5:** Financial (Phase 4) agrega dados de Sales

### Real-time Updates (3 testes)
- [ ] **RT1:** Nova venda aparece em SalesHistory sem refresh
- [ ] **RT2:** Movimento de stock atualiza em real-time
- [ ] **RT3:** Novo alerta aparece em AlertsView

---

## ✅ Resultado Esperado

**Testes Passing:** > 95% (> 82 de 87)  
**Critério de Release:** Nenhum CRITICAL ou HIGH severity issues  
**Blockers:** Nenhum

---

## 📝 Template de Execução

```
Data de Teste: __/__/____
Testador: _________________
Navegador: Chrome v.__ / Firefox v.__ / Safari v.__
Plataforma: Windows / MacOS / Linux
Resolução: ____x____

Fase Testada: Phase __
Teste: T__.__ - [Nome]

Resultado: ✅ PASS / ❌ FAIL / ⚠️ BLOCKED

Observações: 
_________________________________________________

Screenshots: [Anexar se necessário]
```

---

**Versão:** 1.0  
**Status:** Pronto para Execução  
**Aprovação:** Aguardando testes  
