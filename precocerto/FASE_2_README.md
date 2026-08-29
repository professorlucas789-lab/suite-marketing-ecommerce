# FASE 2: Gestão de Estoque Automática

## Status: ✅ IMPLEMENTADO

Implementação completa de sistema de gestão de estoque com:
- Registar movimentações de stock (IN/OUT/ADJUSTMENT)
- Detectar automaticamente stock baixo
- Análise de tendências e previsão
- Relatórios de reabastecimento
- Histórico completo para auditoria

---

## Arquivos Implementados

### 1. Types (`src/types/inventory.ts`) ✅ NOVO
**Status**: Criado - 250+ linhas

Interfaces:
- `StockMovement` - Movimentação de entrada/saída/ajuste
- `StockMovementType` - IN, OUT, ADJUSTMENT
- `StockMovementReason` - purchase, sale, damage, expiry, loss, etc
- `StockAlert` - Alerta quando stock < minQuantity
- `StockAlertConfig` - Configuração de alertas por produto/categoria
- `StockHistory` - Histórico para auditoria
- `StockAnalytics` - Dados para gráficos e análises
- `ReorderReport` - Relatório de reabastecimento sugerido
- `StockAudit` - Contagem física vs sistema

### 2. Service (`src/services/stockService.ts`) ✅ NOVO
**Status**: Criado - 500+ linhas

Métodos principais:
- `recordMovement()` - Registar movimentação (validação + atualização)
- `getMovementHistory()` - Histórico com filtros
- `getStockAlerts()` - Alertas de stock baixo
- `acknowledgeStockAlert()` - Marcar alerta como reconhecido
- `generateReorderReport()` - Relatório de reabastecimento
- `getStockAnalytics()` - Análise completa (trend + previsão)

Algoritmos implementados:
- **Validação**: Quantidade > 0, stock suficiente para OUT
- **Cálculo de nova quantidade**: IN (add), OUT (sub), ADJUSTMENT (set)
- **Detecção de alertas**: CRITICAL (< 50% min), LOW (< 100% min)
- **Tendência**: Compara últimos 7 dias vs anteriores 7 dias
- **Previsão**: Dias até esgotar baseado em uso médio
- **Custo**: Registar custo unitário e total por movimento

### 3. Hooks React

#### `useStockMovements.ts` ✅ NOVO (130 linhas)
Interface reativa para movimentações:

```typescript
const {
  // Estado
  movements,        // StockMovement[]
  isLoading,        // boolean
  error,            // string | null

  // Ações
  recordMovement,   // Registar movimento
  getMovementHistory,  // Buscar histórico
  getStockAnalytics,   // Calcular análise
  clearError,       // Limpar erro
} = useStockMovements();
```

#### `useStockAlerts.ts` ✅ NOVO (140 linhas)
Interface reativa para alertas:

```typescript
const {
  // Estado
  alerts,           // StockAlert[]
  reorderReport,    // ReorderReport | null
  isLoading,        // boolean
  error,            // string | null

  // Ações
  getStockAlerts,   // Listar alertas
  acknowledgeAlert, // Reconhecer alerta
  generateReorderReport,  // Gerar relatório
  refreshAlerts,    // Atualizar tudo
  clearError,       // Limpar erro
} = useStockAlerts();
```

### 4. Componentes UI

#### `StockMovementRecorder.tsx` ✅ NOVO (300+ linhas)
Formulário rápido para registar movimentação:
- Seleção de tipo (IN/OUT/ADJUSTMENT)
- Razão baseada no tipo
- Input de quantidade com validação
- Referência (ex: Fatura #)
- Número de lote
- Custo unitário
- Notas
- Preview de stock antes/depois

#### `StockMovementHistory.tsx` ✅ NOVO (250+ linhas)
Timeline de movimentações:
- Lista cronológica (mais recente primeiro)
- Ícones coloridos por tipo
- Quantidade anterior → nova
- Metadados (data, utilizador, referência, lote)
- Load more para paginação
- Filtro opcional por produto

#### `StockAnalyticsPanel.tsx` ✅ NOVO (350+ linhas)
Dashboard com gráficos:
- 4 KPI cards (Stock atual, Trend, Uso/dia, Dias até esgotar)
- Gráfico de evolução de stock (SVG)
- Indicadores de risco
- Recomendações automáticas

### 5. Testes

#### `stockService.test.ts` ✅ NOVO
- ✅ Validação de quantidade (> 0, suficiente)
- ✅ Cálculo de novo stock (IN/OUT/ADJUSTMENT)
- ✅ Razões de movimento
- ✅ Custo total
- ✅ Detecção de alertas
- ✅ Cálculo de dias até esgotar
- ✅ Análise de tendência
- ✅ Ordenação de relatório

---

## Fluxo de Dados

```
┌──────────────────────────────────┐
│ Component (StockMovementRecorder)│
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ useStockMovements Hook           │
│ .recordMovement()                │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ StockService.recordMovement()    │
│ 1. Validar quantidade            │
│ 2. Calcular novo stock           │
│ 3. Registar movimento            │
└────────────┬─────────────────────┘
             │
             ▼
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
Firestore        Check Stock
products         Alerts
stockMovements   (criar se baixo)
stockHistory
```

---

## Algoritmos Principais

### 1. Registro de Movimentação
```typescript
async recordMovement(
  storeId, productId, product,
  type: 'IN' | 'OUT' | 'ADJUSTMENT',
  quantity, reason, userId, options
) {
  // Validar
  if (quantity <= 0) throw Error;
  if (type === 'OUT' && qty > available) throw Error;

  // Calcular novo stock
  newQty = type === 'IN' ? current + qty
         : type === 'OUT' ? current - qty
         : qty;

  // Registar em 3 lugares
  1. /stockMovements (movimento)
  2. /products (atualizar quantidadeDisponível)
  3. /stockHistory (auditoria)

  // Verificar alertas
  if (newQty < minQuantity) {
    severity = newQty < minQty * 0.5 ? 'CRITICAL' : 'LOW';
    criar alerta em /stockAlerts;
  }
}
```

### 2. Detecção de Tendência
```
Dados: Últimos 7 dias vs 7 dias anteriores
Formula: ((recent_avg - older_avg) / older_avg) * 100

Trend:
- +5% ou mais → INCREASING
- -5% ou menos → DECREASING
- Entre ±5% → STABLE
```

### 3. Previsão de Dias até Esgotar
```
Fórmula: ceiling(currentQty / avgDailyUsage)

Exemplo:
- Stock: 100 unidades
- Uso: 10/dia
- Dias: ceiling(100 / 10) = 10 dias
```

### 4. Geração de Relatório de Reabastecimento
```
Prioridade:
1. URGENT: severity=CRITICAL (ação imediata)
2. HIGH: daysUntilStockout < 7 (próximos 7 dias)
3. MEDIUM: daysUntilStockout 7-30 (próximas 2-4 semanas)
4. LOW: daysUntilStockout > 30 (futuro distante)

Ordenado por: prioridade, depois por dias
```

---

## Integração com FASE 1 (Validade)

FASE 1 + FASE 2 trabalham juntas:
- Alertas de validade + Stock baixo = Ação prioritária
- Vender produtos com validade próxima (antes que apodreçam)
- Registar saída por "expiry" em FASE 2
- Análise: % de perda por expiração

Exemplo:
```
Produto A:
├─ FASE 1: Expira em 5 dias (CRITICAL)
├─ FASE 2: Stock = 50 unidades
└─ Recomendação: VENDER URGENTE antes de expirar
```

---

## Casos de Uso

### 1. Registar Compra
```typescript
const { recordMovement } = useStockMovements();

await recordMovement(
  productId, product,
  'IN', 100, 'purchase', userId,
  { reference: 'FAT-2026-001', unitCost: 100 }
);
```

### 2. Registar Venda
```typescript
await recordMovement(
  productId, product,
  'OUT', 5, 'sale', userId,
  { reference: 'VENDA-123' }
);

// Stock atualiza automaticamente
// Alerta criado se stock < minQuantity
```

### 3. Ajuste de Contagem
```typescript
await recordMovement(
  productId, product,
  'ADJUSTMENT', 42, 'inventory_count', userId,
  { notes: 'Contagem física: system=50, real=42' }
);

// Define stock para 42 (não add/sub, mas SET)
```

### 4. Ver Análise de Stock
```typescript
const { getStockAnalytics } = useStockMovements();

const analytics = await getStockAnalytics(productId, product);
console.log(`
  Trend: ${analytics.trend} (${analytics.trendPercent}%)
  Uso/dia: ${analytics.averageDailyUsage}
  Dias até esgotar: ${analytics.daysUntilStockout}
`);
```

### 5. Gerar Relatório de Reabastecimento
```typescript
const { generateReorderReport } = useStockAlerts();

const report = await generateReorderReport();
// report.itemsToReorder = []
// report.totalItems = 5
// report.totalSuggestedCost = Kz 50,000
```

---

## Segurança e Validações

| Validação | Implementação |
|-----------|---|
| Quantidade > 0 | Rejeitar se qty <= 0 |
| Stock suficiente para OUT | Validar currentQty >= qty |
| Auditoria completa | Cada movimento → stockHistory |
| Soft delete | Nunca deletar, apenas marcar como resolvido |
| Firestore Security Rules | Apenas gerentes podem criar movimentos |

---

## Testes

```bash
# Rodar testes
npm run test stockService.test.ts

# Coverage
npm run test -- --coverage
```

**Testes implementados** (30+ testes):
- ✅ Validação de quantidade
- ✅ Cálculo de novo stock
- ✅ Razões de movimento
- ✅ Custo total
- ✅ Detecção de alertas (LOW vs CRITICAL)
- ✅ Dias até esgotar
- ✅ Análise de tendência (increasing/decreasing/stable)
- ✅ Ordenação de relatório

---

## Performance

| Operação | Complexidade | Limite |
|----------|---|---|
| recordMovement | O(1) + listener updates | Real-time |
| getMovementHistory | O(n) com índice | 1000+ movimentos |
| generateReorderReport | O(m log m) | 100+ alertas |
| getStockAnalytics | O(d) | 365 dias histórico |

**Otimizações**:
- Índices Firestore em `productId`, `type`, `reason`
- Paginação em `getMovementHistory`
- Caching local com hooks

---

## Melhorias Futuras

- [ ] Previsão ML (arima, exponential smoothing)
- [ ] Sazonalidade detectada automaticamente
- [ ] Integração com fornecedores (auto-reabastecimento)
- [ ] Múltiplos armazéns (transferências inter-armazém)
- [ ] Rastreamento de série/lote
- [ ] Variância de contagem física
- [ ] Contagem cíclica automática
- [ ] Alertas de obsolescência (não vendido > 6 meses)

---

## Próxima Fase

**FASE 3: Módulo de Vendas Básico** (Semanas 5-6)

Combinará FASE 1 + FASE 2:
1. Registar venda
2. Validar disponibilidade
3. Reduzir stock automaticamente
4. Criar alerta de validade se próximo vencimento
5. Calcular margem real
6. Gerar relatório

Ficheiros a criar:
- `salesService.ts` (200 linhas)
- `useSalesRecorder.ts` + `useSalesAnalytics.ts` hooks
- `QuickSalesRecorder.tsx` + `SalesHistory.tsx` + `SalesAnalyticsDashboard.tsx`
- Testes (50+ testes)

---

## Documentação Técnica

### Firestore Collections

```
/stores/{storeId}/
├─ stockMovements/      # Registro de cada movimento
│  ├─ id (auto)
│  ├─ productId
│  ├─ type: IN|OUT|ADJUSTMENT
│  ├─ quantity, previousQty, newQty
│  ├─ reason, reference, batchNumber
│  ├─ timestamp, createdBy
│  └─ unitCost, totalCost, notes
│
├─ stockAlerts/         # Alertas de stock baixo
│  ├─ id (auto)
│  ├─ productId
│  ├─ currentQuantity, minQuantity
│  ├─ severity: LOW|CRITICAL
│  ├─ daysUntilStockout
│  ├─ createdAt, acknowledgedAt, resolvedAt
│  └─ channels: [in-app, email, whatsapp]
│
└─ stockHistory/        # Auditoria
   ├─ id (auto)
   ├─ movementId (referência)
   ├─ type, reason, quantity
   ├─ timestamp, userId
   └─ details: {reference, batchNumber, etc}
```

### Índices Firestore Recomendados

```
Collection: stockMovements
- (storeId, productId, timestamp DESC)
- (storeId, type)
- (storeId, reason)

Collection: stockAlerts
- (storeId, resolvedAt) - para alertas ativos
- (storeId, severity)
```

---

## Changelog

**v1.0.0** (Atual)
- ✅ recordMovement com validação
- ✅ Cálculo de novo stock (IN/OUT/ADJUSTMENT)
- ✅ Detecção automática de alertas
- ✅ Análise de tendência
- ✅ Previsão de dias até esgotar
- ✅ Relatório de reabastecimento
- ✅ Hooks e componentes completos
- ✅ 30+ testes

