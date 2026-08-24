# 📊 Phase 17: Dashboard Executivo - Implementation Guide

## Visão Geral

**Phase 17** implementa o Dashboard Executivo para proprietários de lojas:

1. ✅ **Executive Dashboard Service** - Agregação de métricas de negócio
2. ✅ **KPIs em Tempo Real** - 4 KPIs principais com tendências
3. ✅ **Gráficos de Tendências** - Receita e pedidos diários
4. ✅ **Top Produtos & Categorias** - Best sellers e análise de categorias
5. ✅ **Alertas Críticos** - Visão de risco (validade, stock, margens)
6. ✅ **Saúde da Loja** - Indicador global de saúde

---

## 📋 Checklist de Implementação

### 1. Ficheiros Criados

```bash
# Serviço de Dashboard
precocerto/src/services/executiveDashboardService.ts        # ✅ 520 linhas
precocerto/src/hooks/useExecutiveDashboard.ts              # ✅ 60 linhas
precocerto/src/components/ExecutiveDashboard.tsx           # ✅ 450 linhas

# Documentação
PHASE_17_EXECUTIVE_DASHBOARD.md                            # ✅ Este ficheiro
```

### 2. Funcionalidades Implementadas

- ✅ Serviço executivoDashboardService com 7 métodos
- ✅ Hook useExecutiveDashboard para componente
- ✅ Dashboard visual com 8 secções principais
- ✅ KPIs com tendências (up/down/stable)
- ✅ Gráficos de linha para receita e pedidos
- ✅ Comparativa de períodos (atual vs anterior)
- ✅ Top 5 produtos com margens
- ✅ Top 5 categorias com crescimento
- ✅ Saúde da loja com sub-categorias
- ✅ Alertas críticos agrupados por tipo
- ✅ Seletor de períodos (7/30/90 dias)
- ✅ Carregamento e refresh em tempo real
- ✅ Dark mode completo

### 3. Integração com Aplicação

Adicionar ao menu de navegação:

```typescript
// Em navigationConfig.ts ou onde os menus são definidos
{
  path: '/dashboard-executivo',
  name: 'Dashboard Executivo',
  icon: BarChart3,
  role: 'owner', // Apenas proprietários
  component: ExecutiveDashboard,
}
```

### 4. Adicionar ao App.tsx

```typescript
import ExecutiveDashboard from './components/ExecutiveDashboard';

// Em <Routes>
<Route path="/dashboard-executivo" element={<ExecutiveDashboard />} />
```

---

## 🏗️ Arquitetura

### ExecutiveDashboardService

**Métodos Principais**:

| Método | Descrição | Retorno |
|--------|-----------|---------|
| `getExecutiveDashboardMetrics()` | Obtém todas as métricas | ExecutiveDashboardMetrics |
| `getKPIs()` | Calcula 4 KPIs principais | KPI[] |
| `getSalesData()` | Dados de vendas por período | {receita, pedidos, margem} |
| `getSalesTrend()` | Tendência diária últimos X dias | SalesMetric[] |
| `getTopProducts()` | Top 5 produtos por receita | TopProduct[] |
| `getTopCategories()` | Top 5 categorias | TopCategory[] |
| `getCriticalAlerts()` | Alertas de validade, stock, margens | CriticalAlert[] |
| `calculateStoreHealth()` | Índice de saúde (0-100%) | StoreHealth |
| `getPeriodComparison()` | Comparativa atual vs anterior | PeriodComparison |

### Tipos de Dados

```typescript
interface KPI {
  label: string;              // "Receita Total"
  value: number;              // 2500 (sem unidade)
  unit: string;               // "€"
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;   // +12.5%
  icon: string;               // "💰"
}

interface SalesMetric {
  date: string;               // "2026-08-24"
  revenue: number;            // Receita do dia
  units: number;              // Unidades vendidas
  orders: number;             // Número de pedidos
  avgOrderValue: number;      // Ticket médio
}

interface TopProduct {
  id: string;
  name: string;
  revenue: number;
  units: number;
  margin: number;             // Percentagem
  status: 'good' | 'warning' | 'critical';
}

interface CriticalAlert {
  type: 'expiry' | 'stock' | 'margin';
  severity: 'critical' | 'warning' | 'info';
  productName: string;
  message: string;            // "Vence em 5 dias"
  timestamp: Date;
  actionUrl: string;          // Link para produto
}

interface ExecutiveDashboardMetrics {
  kpis: KPI[];
  salesTrend: SalesMetric[];
  topProducts: TopProduct[];
  topCategories: TopCategory[];
  criticalAlerts: CriticalAlert[];
  storeHealth: {
    overall: number;          // 0-100%
    categories: {
      products: number;       // Saúde de produtos
      alerts: number;         // Saúde de alertas
      stock: number;          // Saúde de stock
      margins: number;        // Saúde de margens
    };
  };
  periodComparison: {
    current: { revenue, orders, avgMargin };
    previous: { revenue, orders, avgMargin };
    growth: { revenue%, orders%, margin };
  };
}
```

### Hook useExecutiveDashboard

```typescript
const {
  metrics,              // ExecutiveDashboardMetrics | null
  loading,             // boolean
  error,               // string | null
  refreshMetrics,      // () => Promise<void>
  daysBack,           // number (7, 30, 90)
  setDaysBack,        // (days: number) => void
} = useExecutiveDashboard();
```

### Componente ExecutiveDashboard

**Secções Renderizadas**:

1. **Header** - Título, seletor de período, botão refresh
2. **KPIs Cards** - 4 cards com valores principais
3. **Saúde da Loja** - Gauge geral + 4 sub-categorias
4. **Tendência de Vendas** - 2 gráficos (receita + pedidos)
5. **Comparativa de Períodos** - 3 cards (receita, pedidos, margem)
6. **Top Produtos** - Tabela de 5 produtos com margens
7. **Top Categorias** - Tabela de 5 categorias com crescimento
8. **Alertas Críticos** - Cards de alertas por tipo/severidade

---

## 🎨 Funcionalidades Visuais

### Gráfico de Linha Simples

- Sem dependências externas (sem Recharts)
- Altura relativa ao máximo
- Hover com valor exato
- Animação ao carregar

### Indicadores de Saúde

- Barra de progresso animada
- Sub-categorias com percentagens
- Cores verde/amarelo/vermelho

### Alertas com Severidade

- **Crítico** (vermelho): Ação imediata
- **Aviso** (amarelo): Monitorar
- **Info** (azul): Informativo

### Dark Mode Completo

- Gradientes adaptados
- Cores legíveis em ambos os temas
- Transições suaves

---

## 🔧 Como Usar

### 1. Integrar no App

```typescript
// App.tsx
import ExecutiveDashboard from './components/ExecutiveDashboard';

<Route 
  path="/dashboard-executivo" 
  element={
    <ProtectedRoute requiredRole="owner">
      <ExecutiveDashboard />
    </ProtectedRoute>
  } 
/>
```

### 2. Usar o Hook Diretamente

```typescript
// Componente customizado
import { useExecutiveDashboard } from '../hooks/useExecutiveDashboard';

function CustomDashboard() {
  const { metrics, loading, error, daysBack, setDaysBack } = useExecutiveDashboard();

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h1>Receita Total: €{metrics?.kpis[0].value}</h1>
      <p>Período: {daysBack} dias</p>
      <button onClick={() => setDaysBack(30)}>Últimos 30 dias</button>
    </div>
  );
}
```

### 3. Chamar Serviço Diretamente

```typescript
// Uso manual do serviço
import { ExecutiveDashboardService } from '../services/executiveDashboardService';

const metrics = await ExecutiveDashboardService.getExecutiveDashboardMetrics(
  'store-id',
  30  // daysBack
);

console.log('KPIs:', metrics.kpis);
console.log('Saúde:', metrics.storeHealth.overall);
console.log('Alertas:', metrics.criticalAlerts);
```

---

## 📊 Dados Esperados

### Exemplo de Saída

```json
{
  "kpis": [
    {
      "label": "Receita Total",
      "value": 2500,
      "unit": "€",
      "trend": "up",
      "percentageChange": 12.5,
      "icon": "💰"
    },
    {
      "label": "Pedidos",
      "value": 45,
      "unit": "un",
      "trend": "up",
      "percentageChange": 8.3,
      "icon": "📦"
    }
  ],
  "storeHealth": {
    "overall": 82,
    "categories": {
      "products": 90,
      "alerts": 70,
      "stock": 85,
      "margins": 80
    }
  },
  "topProducts": [
    {
      "name": "Ibuprofen 200mg",
      "revenue": 450,
      "units": 120,
      "margin": 35.5,
      "status": "good"
    }
  ],
  "criticalAlerts": [
    {
      "type": "expiry",
      "severity": "critical",
      "productName": "Penicilina",
      "message": "Vence em 2 dias",
      "timestamp": "2026-08-24T10:30:00Z"
    }
  ]
}
```

---

## 🧪 Testes

### Teste 1: Carregar Dashboard

```bash
# Esperado: Dashboard com dados de 30 dias
1. Ir para /dashboard-executivo
2. Deve carregar em < 2 segundos
3. 4 KPIs visíveis
4. Gráficos com dados
5. Alertas críticos listados
```

### Teste 2: Mudar Período

```bash
# Esperado: Dados atualizados
1. Selecionar "Últimos 7 dias"
2. Dashboard atualiza automaticamente
3. Dados refletem período selecionado
4. Gráficos redesenham
```

### Teste 3: Verificar Cálculos

```bash
# Validar precisão:
- KPI "Receita" = soma de todos os sales.totalPrice
- KPI "Pedidos" = contagem de sales
- KPI "Margem Média" = média de sales.margemReal
- Top Produtos = ordenar por receita DESC
```

### Teste 4: Testar Alertas

```bash
# Validar alertas críticos:
1. Produto vencendo < 7 dias = CRÍTICO
2. Stock = 0 = CRÍTICO
3. Margem < 0 = CRÍTICO
4. Alertas aparecem no topo
```

---

## 🚀 Deployment

### 1. Verificar Imports

```bash
# Confirmar que todos os imports existem
✓ useExecutiveDashboard
✓ ExecutiveDashboardService
✓ SalesMetric, KPI, etc (tipos)
✓ useStore context
```

### 2. Build

```bash
npm run build

# Esperado: Nenhum erro de TypeScript
# Esperado: Nenhuma dependência não resolvida
```

### 3. Testar Localmente

```bash
npm run dev

# Ir para http://localhost:5173/dashboard-executivo
# Verificar:
- Dashboard carrega sem erros
- KPIs com valores reais
- Gráficos renderizam
- Dark mode funciona
```

### 4. Deploy Firebase Hosting

```bash
firebase deploy --only hosting

# Dashboard deve estar acessível em:
# https://precocerto-als.netlify.app/dashboard-executivo
```

---

## 📈 Casos de Uso

### Proprietário Verifica Dashboard Pela Manhã

1. Acede a `/dashboard-executivo`
2. Vê resumo de vendas do dia anterior
3. Verifica KPIs (receita, pedidos, margem)
4. Visualiza alertas críticos
5. Clica em "Agir" para resolver produtos com problema

### Gerente Monitora Saúde da Loja

1. Vê saúde geral (82%)
2. Identifica ponto fraco (alerts: 70%)
3. Vê quais produtos têm validade próxima
4. Vai para lista de produtos para ação

### Análise Semanal/Mensal

1. Seleciona "Últimos 30 dias"
2. Vê tendência de vendas
3. Compara com período anterior (-12.5% receita)
4. Exporta gráficos para relatório mensal

---

## 🔒 Segurança

### RBAC

- ✅ Dashboard acessível apenas a `owner` (proprietários)
- ✅ Dados filtrados por `storeId` do utilizador
- ✅ Sem acesso a dados de outras lojas

### Proteção de Dados

- ✅ Sem expor dados brutos na URL
- ✅ Todas as queries filtradas por Firestore Rules
- ✅ Timestamp de alertas não modificável

---

## ⚠️ Limitações Conhecidas

1. **Gráficos Simples**: Sem biblioteca externa (Recharts)
   - Solução: Gráficos básicos de barras/linhas suficientes
   - Futuro: Adicionar Recharts para gráficos avançados

2. **Sem Cache**: Cada reload fetch dados frescos
   - Solução: useExecutiveDashboard usa hook padrão
   - Futuro: Adicionar SWR/React Query para cache

3. **Alertas Agregados**: Máx 5 alertas mostrados
   - Solução: Ordenar por severidade + timestamp
   - Futuro: Pagination ou "Ver todos"

---

## 📞 Troubleshooting

### ❌ Dashboard não carrega

**Verificar**:
1. Utilizador é `owner`? `db.collection('lojas').doc().data().ownerId === user.uid`
2. Loja tem vendas? `db.collection('lojas/{id}/sales').size > 0`
3. Período contém dados? Aumentar `daysBack` para 90

### ❌ KPIs mostram 0

**Verificar**:
1. Existem vendas no período? `firebase firestore:get /lojas/store-id/sales`
2. Campo `totalPrice` preenchido? Campos obrigatórios: `date`, `totalPrice`, `quantity`
3. Datas no formato ISO? `"2026-08-24T10:30:00Z"`

### ❌ Alertas não aparecem

**Verificar**:
1. Produtos têm `dataValidade`?
2. Alertas foram criados? `db.collection('lojas/{id}/expiryAlerts').size > 0`
3. Severity = 'CRITICAL' ou 'WARNING'?

---

## 🎯 Próximos Passos (Futuro)

1. **Phase 18**: Mobile App (React Native)
   - Dashboard responsivo para smartphone
   - Push notifications para alertas

2. **Phase 19**: Integrações Externas
   - Exportar dashboard para PDF/Excel
   - Integração com Google Sheets
   - Webhook para Zapier

3. **Phase 20**: Predictive Analytics
   - ML para previsão de vendas
   - Recomendações de reabastecimento
   - Análise de tendências

---

## Versão

- **Versão**: 1.0
- **Data**: 2026-08-24
- **Status**: ✅ Production Ready
- **Última Atualização**: 2026-08-24

---

## 📊 Estatísticas

```
Código Novo:
  - executiveDashboardService.ts: 520 linhas
  - useExecutiveDashboard.ts: 60 linhas
  - ExecutiveDashboard.tsx: 450 linhas
  - Total: 1,030 linhas

Funcionalidades:
  - 4 KPIs principais
  - 7 métodos de serviço
  - 2 gráficos de tendências
  - 8 secções de dashboard
  - Suporte para 7/30/90 dias
  - Dark mode completo

Tempo Esperado:
  - Load: < 2 segundos
  - Interação: < 100ms
  - Refresh: < 1 segundo
```

---

**Pronto para Produção! 🚀**
