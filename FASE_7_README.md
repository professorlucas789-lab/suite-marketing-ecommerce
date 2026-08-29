# FASE 7: Integração com Firebase e Persistência em Tempo Real

**Status**: ✅ Implementação Completa  
**Data**: 29 de Agosto de 2026  
**Branch**: `claude/precocerto-stage-1-xsicob`

---

## 📋 Resumo Executivo

FASE 7 integra toda a análise preditiva com Firestore, adicionando:

- ✅ **Persistência de Previsões** - Salvar e recuperar de Firestore
- ✅ **Listeners em Tempo Real** - Atualizações automáticas de dados
- ✅ **Sincronização Bidirecional** - Local ↔ Firebase
- ✅ **Dashboard Executivo** - Visão 360° da loja
- ✅ **Gerenciamento de Anomalias** - Reconhecimento e rastreamento
- ✅ **Health Score** - Avaliação contínua da saúde da loja

A solução é **serverless**, **escalável** e **reativa**.

---

## 🏗️ Arquitetura

### Estrutura de Ficheiros

```
src/
├── services/
│   └── predictiveAnalyticsFirebaseService.ts  # Persistência Firebase
├── hooks/
│   └── usePredictiveAnalyticsWithFirebase.ts  # Hook com Firestore real-time
└── components/
    └── ExecutiveDashboard.tsx                 # Dashboard principal
```

### Fluxo de Dados

```
Local Analysis (Cliente)
    ↓
    ├→ Salvar em Firestore
    └→ Notificar listeners
    
Firebase Firestore
    ↓
    ├→ onSnapshot (Previsões)
    ├→ onSnapshot (Anomalias)
    ├→ onSnapshot (Dashboard)
    └→ onSnapshot (Reabastecimento)
    
React Hooks (Real-time)
    ↓
    └→ Componentes atualizam automaticamente
```

---

## 🎯 Serviço Firebase

### PredictiveAnalyticsFirebaseService

**Responsabilidades**:
- Salvar previsões, anomalias, recomendações
- Recuperar dados históricos
- Configurar listeners em tempo real
- Gerenciar reconhecimento de anomalias
- Limpeza de dados antigos

**Métodos Principais**:

#### Previsões
```typescript
// Salvar uma previsão
await saveForecast(forecast: DemandForecast): Promise<string>

// Salvar múltiplas (batch)
await saveForecastsBatch(storeId, forecasts): Promise<number>

// Obter previsão de um produto
await getForecast(storeId, productId, limit): Promise<DemandForecast[]>

// Obter todas
await getAllForecasts(storeId): Promise<DemandForecast[]>

// Listener em tempo real
listenForecasts(storeId, callback, onError): Unsubscribe
```

#### Anomalias
```typescript
// Salvar anomalia
await saveAnomaly(anomaly: SalesAnomaly): Promise<string>

// Reconhecer/resolver
await acknowledgeAnomaly(storeId, anomalyId, notes): Promise<void>

// Obter não reconhecidas
await getUnacknowledgedAnomalies(storeId): Promise<SalesAnomaly[]>

// Obter críticas
await getCriticalAnomalies(storeId): Promise<SalesAnomaly[]>

// Listener em tempo real
listenAnomalies(storeId, callback, onError): Unsubscribe
```

#### Reabastecimento
```typescript
// Salvar recomendação
await saveReorderRecommendation(rec): Promise<string>

// Obter urgentes
await getUrgentReorders(storeId): Promise<AutoReorderRecommendation[]>

// Marcar como implementado
await markReorderAsImplemented(storeId, id, quantity): Promise<void>
```

#### Dashboard
```typescript
// Salvar dashboard
await saveDashboard(dashboard): Promise<void>

// Obter mais recente
await getLatestDashboard(storeId): Promise<ExecutiveDashboard | null>

// Listener em tempo real
listenDashboard(storeId, callback, onError): Unsubscribe
```

#### Manutenção
```typescript
// Limpar dados antigos (soft delete)
await cleanOldData(storeId, retentionDays): Promise<number>
```

---

## 🎣 Hook React com Firebase

### usePredictiveAnalyticsWithFirebase

**Padrão**: Combina análise local com persistência Firebase

```typescript
const {
  // Dados do Firebase (persistidos)
  forecasts,           // Previsões de demanda
  anomalies,          // Anomalias detectadas
  reorders,           // Recomendações
  dashboard,          // Dashboard executivo

  // Dados locais (calculados)
  trends,             // Análises de tendências

  // Estado
  isLoading,
  error,
  lastSync,

  // Ações
  runLocalAnalysis,
  syncWithFirebase,
  acknowledgeAnomaly,
  markReorderAsImplemented,

  // Filtros
  getUrgentReorders,
  getForecastForProduct,
  getTrendForProduct,
} = usePredictiveAnalyticsWithFirebase(
  storeId,
  products,
  sales,
  enableLocalAnalysis,   // true
  enableFirebaseSync     // true
);
```

**Fluxo**:
1. Hook inicia listeners do Firebase
2. Executa análise local em paralelo
3. Salva resultados no Firebase
4. Componentes reagem automaticamente a mudanças

**Exemplo**:
```typescript
function MyDashboard() {
  const { forecasts, anomalies, isLoading } = usePredictiveAnalyticsWithFirebase(
    'store-1',
    products,
    sales
  );

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h2>Previsões: {forecasts.length}</h2>
      <h2>Anomalias: {anomalies.length}</h2>
    </div>
  );
}
```

---

## 🎨 Dashboard Executivo

Componente completo que mostra:

### 📊 KPIs Principais
- **Health Score** (0-100) - Avaliação geral da loja
- **Receita Prevista** - Próximo dia
- **Previsão (7 dias)** - Receita esperada
- **Produtos em Crescimento** - Com vs sem tendência
- **Confiança de Previsão** - Média (%)

### 🚨 Alertas Críticos
- Anomalias críticas detectadas
- Produtos com reabastecimento urgente

### 📈 Rankings
- **Top 5 em Crescimento** - Produtos ascendentes
- **Reabastecimento Urgente** - Ações imediatas

### 📊 Análise de Confiança
- Barra de progresso com qualidade
- Recomendações baseadas em confiança

**Uso**:
```typescript
<ExecutiveDashboard
  storeId="store-1"
  storeName="Farmácia ABC"
  products={products}
  sales={sales}
/>
```

---

## 🗄️ Schema Firestore

### Coleção: `/stores/{storeId}/predictions`
```typescript
{
  id: string;
  productId: string;
  productName: string;

  forecastDate: string;           // YYYY-MM-DD
  predictedUnits: number;
  predictedRevenue: number;
  confidence: number;             // 0-100
  trend: 'increasing' | 'decreasing' | 'stable';

  createdAt: Timestamp;
  updatedAt: Timestamp;
  archived?: boolean;
}
```

### Coleção: `/stores/{storeId}/anomalyHistory`
```typescript
{
  id: string;
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  
  productId?: string;
  actualValue: number;
  expectedValue: number;
  deviationPercentage: number;
  
  description: string;
  acknowledged: boolean;
  acknowledgedAt?: Timestamp;
  notes?: string;
  
  createdAt: Timestamp;
  archived?: boolean;
}
```

### Coleção: `/stores/{storeId}/reorderRecommendations`
```typescript
{
  id: string;
  productId: string;
  productName: string;
  
  currentStock: number;
  recommendedQuantity: number;
  recommendedUrgency: 'immediate' | 'soon' | 'planned';
  
  implemented: boolean;
  implementedQuantity?: number;
  implementedAt?: Timestamp;
  
  createdAt: Timestamp;
}
```

### Coleção: `/stores/{storeId}/executiveDashboard`
```typescript
{
  id: string;  // YYYY-MM-DD
  
  healthScore: { overallScore: number; ... };
  predictions: { nextDayRevenue, nextWeekRevenue, ... };
  criticalAlerts: SalesAnomaly[];
  recommendations: Array<{ type, priority, title, ... }>;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 🔒 Firestore Security Rules

```javascript
// Apenas dados da loja do utilizador
match /stores/{storeId}/predictions {
  allow read: if request.auth.uid != null && 
              get(/databases/$(database)/documents/stores/$(storeId)/managers/$(request.auth.uid)).exists();
  allow write: if false;  // Apenas via Cloud Functions
}

match /stores/{storeId}/anomalyHistory {
  allow read: if request.auth.uid != null && 
              get(/databases/$(database)/documents/stores/$(storeId)/managers/$(request.auth.uid)).exists();
  allow write: if false;  // Apenas via Cloud Functions
}

match /stores/{storeId}/executiveDashboard {
  allow read: if request.auth.uid != null && 
              get(/databases/$(database)/documents/stores/$(storeId)/managers/$(request.auth.uid)).exists();
  allow write: if false;  // Apenas via Cloud Functions
}
```

---

## 🧪 Casos de Uso

### Caso 1: Sincronização Automática

```typescript
// Hook executa análise local, salva no Firebase
const dashboard = usePredictiveAnalyticsWithFirebase(
  'store-1',
  products,
  sales,
  true,   // enableLocalAnalysis
  true    // enableFirebaseSync
);

// Dados aparecem automaticamente no Firestore
// Todos os utilizadores da loja veem em tempo real
```

### Caso 2: Reconhecer Anomalia

```typescript
const { acknowledgeAnomaly } = usePredictiveAnalyticsWithFirebase(...);

// Utilizador clica "Reconhecer"
await acknowledgeAnomaly('anomaly-123', 'Preço foi corrigido');

// Firestore atualiza, todos os listeners reagem
// Componentes removem anomalia da lista
```

### Caso 3: Marcar Reabastecimento

```typescript
const { markReorderAsImplemented } = usePredictiveAnalyticsWithFirebase(...);

// Gerente implementa reabastecimento
await markReorderAsImplemented('reorder-456', 100);  // 100 unidades

// Status atualiza em tempo real
// Alerta desaparece do dashboard
```

### Caso 4: Sincronização Manual

```typescript
const { syncWithFirebase } = usePredictiveAnalyticsWithFirebase(...);

// Botão: "Sincronizar Agora"
await syncWithFirebase();

// Força análise local + salvamento em Firebase
// Útil para testes ou atualizações manuais
```

---

## ⚡ Performance

### Otimizações Implementadas

1. **Batch Operations** - Salvar múltiplas previsões de uma vez
2. **Listeners Eficientes** - Apenas dados não reconhecidos
3. **Lazy Loading** - Dados carregados conforme necessário
4. **Soft Delete** - Dados marcados como arquivo, não apagados
5. **Índices Firestore** - Queries otimizadas

### Limites Firestore (Spark/Blaze)

| Operação | Limite | Custo |
|----------|--------|-------|
| Leitura | Ilimitado | $0.06/100k |
| Escrita | Ilimitado | $0.18/100k |
| Listeners | Ilimitado | (leitura) |
| Estocagem | 1GB (Spark) | $0.18/GB |

**Estimativa para 1 loja com 500 produtos**:
- 500 previsões/dia → 15k leituras/mês (~$1)
- 100 anomalias/dia → 3k escritas/mês (~$0.50)
- Custo total: **~$2-3/mês**

---

## 🚀 Como Integrar

### 1. Adicionar ao Dashboard Principal

```typescript
import { ExecutiveDashboard } from '@/components/ExecutiveDashboard';

export function Dashboard() {
  return (
    <div>
      <ExecutiveDashboard
        storeId={currentStore.id}
        storeName={currentStore.name}
        products={products}
        sales={sales}
      />
    </div>
  );
}
```

### 2. Usar Hook em Componentes

```typescript
import { usePredictiveAnalyticsWithFirebase } from '@/hooks/usePredictiveAnalyticsWithFirebase';

export function MyComponent() {
  const {
    anomalies,
    acknowledgeAnomaly,
  } = usePredictiveAnalyticsWithFirebase(...);

  return (
    <AnomalyList
      anomalies={anomalies}
      onAcknowledge={acknowledgeAnomaly}
    />
  );
}
```

### 3. Configurar Cloud Functions (Futuro)

```bash
# Deploy de funções que executam análise automática
firebase deploy --only functions
```

---

## 📊 Monitoramento

### No Firebase Console

```
Firestore → Analytics → Leitura/Escritas por Dia
         → Índices → Verificar health
         → Security Rules → Validar acesso
```

### Alertas Recomendados

1. **Escritas falhadas** - Erro em persistência
2. **Listeners desconectados** - Queda de conexão
3. **Quota excedida** - Passar limite Spark
4. **Dados desincronizados** - Conflito local/Firebase

---

## 🐛 Troubleshooting

### "Permission denied" ao escrever
**Solução**: Verificar Firestore Security Rules + storeId do utilizador

### "Listener não atualiza"
**Solução**: Verificar conexão Firebase + console.logs nos callbacks

### "Dados duplicados no Firebase"
**Solução**: Usar batch operations para writes múltiplas

### "Performance lenta com muitos listeners"
**Solução**: Limitar a 3-4 listeners simultâneos, usar `stopListening`

---

## ✅ Checklist de Deploy

- [ ] Firestore criado e configurado
- [ ] Collections criadas (predictions, anomalyHistory, etc.)
- [ ] Security Rules definidas
- [ ] Índices criados (se necessário)
- [ ] Hook integrado nos componentes
- [ ] ExecutiveDashboard adicionado
- [ ] Testes de listeners passam
- [ ] Performance aceitável
- [ ] Testes E2E completos
- [ ] Documentação actualizada

---

## 📈 Próximas Fases

### FASE 8: Cloud Functions Automáticas
- [ ] Análise preditiva automática via Cloud Scheduler
- [ ] Geração de alertas sem intervenção manual
- [ ] Emails/SMS com recomendações

### FASE 9: Dashboard Mobile
- [ ] Versão mobile do ExecutiveDashboard
- [ ] Push notifications para alertas críticos
- [ ] Aprovação de reabastecimento via app

### FASE 10: Relatórios Avançados
- [ ] Relatórios semanais/mensais em PDF
- [ ] Comparação vs períodos anteriores
- [ ] Análise de variancias

---

**Próximo Passo**: FASE 8 - Cloud Functions Automáticas com notificações

---

*Documentação de FASE 7 - 29 de Agosto de 2026*  
*PreçoCerto - Sistema de Gestão Inteligente*

