# 🎯 PreçoCerto Fase 13 - Alertas Inteligentes e Monitorização

**Status**: ✅ **COMPLETO**  
**Data**: 2026-08-18  
**Versão**: Fase 13 (Sistema Inteligente de Alertas)  
**Build**: ✓ 3040 módulos transformados (15.88s)

---

## 📋 Resumo da Fase

Fase 13 implementa um **sistema inteligente de alertas** que monitora automaticamente:
- Produtos com data de validade próxima
- Produtos com stock crítico ou baixo
- Integração com Dashboard para monitorização em tempo real

---

## ✅ Funcionalidades Implementadas

### 1. Sistema de Alertas de Validade
- **Tipo**: `ExpiryAlert` com severity levels
- **Severidades**: CRITICAL (<7 dias), WARNING (<30 dias), INFO (<60 dias)
- **Componentes**:
  - `ExpiryAlertPanel.tsx` - Listagem de alertas com ações
  - `ExpiryMonitoringDashboard.tsx` - Dashboard com timeline e KPIs
- **Hook**: `useExpiryAlerts()` - Monitora em tempo real
- **Serviço**: `expiryAlertService.ts` - Lógica de negócio

### 2. Sistema de Alertas de Stock
- **Detecção Automática**: Monitora `quantidadeDisponível` vs `minQuantidade`
- **Níveis**: CRÍTICO (≤2 unidades), AVISO (≤limite configurado)
- **Componentes**:
  - `LowStockPanel.tsx` - Visualização com progress bars
  - `HealthCheckPanel.tsx` - Consolidação de alertas
- **Hook**: `useLowStockAlerts()` - Cálculos de stock
- **Métrica**: Dias até esgotar, % disponível

### 3. Painel de Saúde Consolidado
- **HealthCheckPanel.tsx**: Unifica alertas de validade + stock
- **Visualização**:
  - Resumo rápido com contadores
  - Secções expandíveis (Validade / Stock)
  - Indicador visual de estado (✅ OK / ⚠️ Problemas)

### 4. Dashboard Central de Alertas
- **AlertsView.tsx**: Página dedicada com:
  - KPI cards (Críticos, Avisos, Resolvidos)
  - Integração com HealthCheckPanel
  - Integração com ExpiryMonitoringDashboard
  - Dicas e documentação para utilizadores

### 5. Integração no Dashboard Principal
- Botão "Registar Venda" para QuickSaleRecorder
- HealthCheckPanel integrado abaixo dos KPIs
- Hooks de alertas exportados para fácil reutilização
- Estado desacoplado (sem necessidade de Firestore em dev)

### 6. Navegação Integrada
- Menu lateral com item "Alertas" (ícone Bell)
- Suporte para lazy-loading (performance)
- Acesso rápido desde qualquer página

---

## 🏗️ Arquitetura

### Tipos Definidos (`/src/types/alerts.ts`)
```typescript
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertChannel = 'in-app' | 'email' | 'whatsapp';

interface ExpiryAlert {
  id: string;
  storeId: string;
  productId: string;
  daysUntilExpiry: number;
  severity: AlertSeverity;
  resolvido: boolean;
  // ... auditoria completa
}
```

### Estrutura de Ficheiros

```
src/
├── types/
│   ├── alerts.ts                    ✅ Tipos de alertas
│   └── sales.ts                     ✅ Tipos de vendas
├── services/
│   ├── expiryAlertService.ts        ✅ Lógica de alertas
│   └── salesService.ts              ✅ Persistência de vendas
├── hooks/
│   ├── useExpiryAlerts.ts           ✅ Monitorização em tempo real
│   ├── useLowStockAlerts.ts         ✅ Detecção de stock
│   ├── useQuickSale.ts              ✅ Registador de vendas
│   └── useSalesAnalytics.ts         ✅ Análise de vendas
├── components/
│   ├── AlertsView.tsx               ✅ Página de alertas
│   ├── HealthCheckPanel.tsx         ✅ Painel consolidado
│   ├── LowStockPanel.tsx            ✅ Visualização de stock
│   ├── ExpiryAlertPanel.tsx         ✅ Detalhe de validades
│   ├── ExpiryMonitoringDashboard.tsx ✅ Dashboard de validades
│   ├── QuickSaleRecorder.tsx        ✅ Modal de registador
│   └── Dashboard.tsx                ✅ Integração
└── config/
    └── navigationConfig.ts           ✅ Menu com Alertas
```

---

## 📊 Métricas de Performance

### Build
- **Módulos**: 3040 (aumentado de 2450)
- **Tempo**: 15.88s
- **Tamanho Principal**: 101.78 kB gzipped (+3.42 kB)
- **AlertsView Chunk**: 13.84 kB gzipped (lazy-loaded)

### Componentes
| Componente | Tamanho | Tipo |
|-----------|---------|------|
| AlertsView | 13.84 KB | Lazy |
| HealthCheckPanel | ~5 KB | Inline |
| LowStockPanel | ~4 KB | Inline |
| ExpiryAlertPanel | ~7 KB | Inline |

---

## 🔌 Integrações Criadas

### Dashboard
- HealthCheckPanel renderizado abaixo dos KPIs
- Botão "Registar Venda" em destaque (azul)
- Hooks para expiryAlerts e lowStockProducts
- QuickSaleRecorder modal integrado

### Menu Navegação
- Item "Alertas" com ícone Bell
- Acesso a AlertsView (lazy-loaded)
- Ordenado após Dashboard

### Firestore (Pronto para Persistência)
- Coleção: `/lojas/{storeId}/expiryAlerts`
- Coleção: `/sales` para transações
- Índices recomendados em desenvolvimento

---

## 🎯 Use Cases

### 1. Gerente de Loja
```
1. Abre Dashboard
2. Vê HealthCheckPanel com 3 alertas críticos
3. Clica para expandir e vê produtos expirando
4. Marca como "Devolvido ao fornecedor"
5. Sistema registra ação em AlertHistory
```

### 2. Caixa/Vendedor
```
1. Vê botão "Registar Venda" no Dashboard
2. Clica para abrir QuickSaleRecorder
3. Seleciona produto, quantidade, preço
4. Sistema calcula margem automaticamente
5. Venda é registada (quando Firestore integrado)
```

### 3. Visualização de Alertas
```
1. Acede Menu → Alertas
2. Vê resumo: 2 críticos, 5 avisos
3. Expande secção de Validade
4. Vê timeline de produtos expirando
5. Clica em "Próximo a Vencer"
```

---

## 🔄 Fluxo de Dados

```
Product com Data Validade
          ↓
useExpiryAlerts Hook (calcula dias)
          ↓
Determina Severity (CRITICAL/WARNING/INFO)
          ↓
ExpiryAlert criado (em estado local)
          ↓
Dashboard/AlertsView renderizam
          ↓
Utilizador resolve alerta
          ↓
Alert marcado como resolvido
          ↓
(Futuro) Persistir em Firestore
```

---

## 🔐 Segurança & RBAC

- Alertas associados a `storeId` (isolamento por loja)
- Permissões via `papel` (admin, loja-manager, funcionario)
- Histórico de alterações com userId
- Razão de resolução auditada

---

## 📚 Componentes Relacionados

### Já Integrados
- ✅ Dashboard.tsx (HealthCheckPanel, QuickSaleRecorder)
- ✅ App.tsx (Menu, Routing, Lazy-loading)
- ✅ ProductForm.tsx (MarginSelector)
- ✅ SalesTab.tsx (SalesAnalyticsDashboard)

### Em Desenvolvimento
- 🔄 Firestore Services (persistência de sales)
- 🔄 WhatsApp/Email Notifications (Fase 4)
- 🔄 Stock Movement Tracking
- 🔄 Sales Reporting (relatórios avançados)

---

## 🎓 Padrões de Código

### Hook Pattern
```typescript
const { alerts, loading, error, resolveAlert } = useExpiryAlerts({ 
  storeId: "default" 
});
```

### Component Pattern
```typescript
<HealthCheckPanel
  expiryAlerts={alerts}
  products={products}
  onResolveAlert={resolveAlert}
  onNavigateToProduct={(id) => { /* ... */ }}
/>
```

### Service Pattern
```typescript
await recordSale({
  storeId: "default",
  productId: "prod-123",
  quantity: 5,
  unitPrice: 1000
});
```

---

## 📝 Próximas Fases (Recomendadas)

### Fase 14: Relatórios Avançados
- Dashboard de vendas com filtros
- Exportação de alertas (PDF/Excel)
- Comparação de períodos

### Fase 15: Notificações Automáticas
- WhatsApp alerts para gerentes
- Email digesto diário
- In-app badges com contadores

### Fase 16: Previsão de Stock
- Análise de tendências
- Sugestão de reabastecimento
- Previsão de dias até esgotar

---

## 🚀 Deployment

### Mudanças de Configuração
Nenhuma configuração adicional necessária. Sistema funciona com dados locais (mock).

### Próximos Passos (Quando Integrar Firestore)
1. Ativar Cloud Functions para cron jobs
2. Criar índices Firestore:
   - `/expiryAlerts` by `severity`, `daysUntilExpiry`
   - `/sales` by `storeId`, `date`
3. Configurar Security Rules para RBAC
4. Integrar Twilio para WhatsApp (opcional)

---

## ✨ Destaques

✅ **Sistema Completo**: Validade + Stock + Vendas integrados  
✅ **UX Moderna**: Animações, Dark mode, Responsivo  
✅ **Performance**: Lazy-loading, memoization, hooks otimizados  
✅ **Escalável**: Pronto para multi-loja, múltiplos utilizadores  
✅ **Extensível**: Arquitetura preparada para fases futuras

---

## 📞 Support

Para questões sobre a implementação:
- Consulte `/src/types/alerts.ts` para definições
- Veja `useExpiryAlerts` para padrão de hook
- Exemplo de integração em `Dashboard.tsx`

---

**Fase 13 Completa** ✅  
**Pronto para Fase 14** 🚀

Data: 2026-08-18  
Versão: Fase 13.0  
Build: 3040 módulos ✓
