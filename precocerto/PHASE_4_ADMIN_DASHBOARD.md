# Fase 4: Painel Admin Unificado - Implementação

## Visão Geral

A Fase 4 implementa o painel centralizado para administradores monitorarem e compararem todas as lojas, com foco em:

- **Dashboard Unificado**: Visão consolidada de todas as lojas
- **Comparação de Lojas**: Análise comparativa entre duas lojas
- **Indicadores-Chave (KPIs)**: Cards com métricas de desempenho
- **Filtros e Ordenação**: Organização flexível de dados
- **Alertas**: Sistema de alertas baseado em limites

## Componentes Criados

### 1. AdminDashboard (src/components/AdminDashboard.tsx)

**Responsabilidade**: Dashboard principal para visualização consolidada

**Funcionalidades**:
- KPIs globais em cards:
  - Total de lojas
  - Total de produtos (todas as lojas)
  - Total de utilizadores
  - Margem média global
  - Valor total de stock
- Grid de lojas com filtros e ordenação
- Filtro por tipo de loja (Farmácia, Informática, Ortopédico, Genérico)
- Ordenação por: Nome, Produtos, Utilizadores, Margem
- Cards de loja com stats resumidas
- Indicador de status (Ativo/Inativo)
- Botão "Ver Detalhes" para cada loja
- Dark mode suportado

**Props**:
```typescript
interface AdminDashboardProps {
  onSelectStore?: (storeId: string) => void;
}
```

**Estrutura de Card de Loja**:
```
[Logo/Status] Nome da Loja [Tipo - Cor]
📧 Email
📍 Endereço
┌─────────────────────┐
│ Produtos:    50     │
│ Utilizadores: 8    │
│ Margem: 35.5%      │
│ Stock: €1.250      │
└─────────────────────┘
[Ver Detalhes →]
```

### 2. StoreComparison (src/components/StoreComparison.tsx)

**Responsabilidade**: Comparação detalhada entre duas lojas

**Funcionalidades**:
- Seleção de duas lojas via dropdowns
- Comparação lado-a-lado de 5 métricas:
  - Total de produtos
  - Total de utilizadores
  - Preço médio
  - Margem média
  - Valor total de stock
- Ícones de tendência (↗️ up, ↘️ down, = equal)
- Percentual de diferença entre lojas
- Informações de contacto de ambas as lojas
- Data de criação de cada loja

**Cálculos**:
```typescript
// Diferença percentual
const diff = ((value1 - value2) / value2) * 100;

// Tendência visual
value1 > value2 → TrendingUp (verde)
value1 < value2 → TrendingDown (vermelho)
value1 = value2 → Igual
```

### 3. KPICards (src/components/KPICards.tsx)

**Responsabilidade**: Cards reutilizáveis para exibir KPIs

**Componentes Inclusos**:

#### 1. KPICards (componente base)
```typescript
interface KPIData {
  label: string;
  value: string | number;
  unit?: string;
  change?: number;      // % de mudança
  target?: number;      // Meta
  icon?: React.ReactNode;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'emerald';
  trend?: 'up' | 'down' | 'neutral';
}
```

**Cores Disponíveis**:
- Green: Saúde, Status Positivo
- Blue: Produtos, Informações
- Purple: Utilizadores
- Orange: Preços
- Red: Alertas, Status Crítico
- Emerald: Stock, Performance

#### 2. StoreKPICards
Pré-configurado para exibir:
- Total de Produtos
- Utilizadores Ativos
- Preço Médio
- Margem Média
- Valor Total Stock

Com cálculo automático de tendência.

#### 3. HealthCheckKPIs
Indicadores de saúde:
- **Saúde da Loja** (baseado em margem):
  - ≥ 35%: Saudável (verde)
  - ≥ 25%: Aceitável (laranja)
  - < 25%: Crítico (vermelho)
- **Status Stock**:
  - ≥ €5.000: Ótimo (verde)
  - ≥ €2.000: Bom (azul)
  - < €2.000: Baixo (vermelho)
- **Eficiência**: % de margem com meta

**Props**:
```typescript
interface KPICardsProps {
  kpis: KPIData[];
  columns?: number;  // 1, 2, 3, ou 4
}
```

## Funcionalidades Principales

### Agregação Global

```typescript
// Total de lojas
const totalLojas = stores.length;

// Total de produtos
const totalProdutos = Array.from(storeStats.values())
  .reduce((sum, stats) => sum + stats.totalProdutos, 0);

// Margem média global
const margemMedia = Array.from(storeStats.values())
  .reduce((sum, stats) => sum + stats.margemMedia, 0) / storeStats.size;

// Valor total de stock
const valorTotalStock = Array.from(storeStats.values())
  .reduce((sum, stats) => sum + stats.valorTotalStock, 0);
```

### Filtros e Ordenação

**Filtros**:
- Por tipo de loja (dropdown)
- Por status (ativo/inativo)
- Por intervalo de datas

**Ordenação**:
- Nome (A-Z)
- Número de produtos (descendente)
- Número de utilizadores (descendente)
- Margem média (descendente)

### Comparação

**Métricas Comparadas**:
1. Total de Produtos
2. Total de Utilizadores
3. Preço Médio
4. Margem Média
5. Valor Total Stock

**Cálculos**:
- Diferença absoluta
- Diferença percentual
- Indicador de tendência
- Percentual de mudança

### Sistema de Alertas

```typescript
// Alerta de margem baixa
if (margemMedia < 25) {
  alert("Aviso: Margem abaixo do mínimo");
}

// Alerta de stock crítico
if (valorStock < 1000) {
  alert("Erro: Stock crítico");
}

// Alerta de produtos baixos
if (totalProdutos < 20) {
  alert("Aviso: Catálogo reduzido");
}
```

## Testes

**Arquivo**: `src/tests/phase6-phase4-admin-dashboard.test.ts`

**Estatísticas**:
- Total de testes: 27
- Status: Todos passando ✓

**Categorias de Testes**:

1. **Agregação de KPIs Globais** (5 testes):
   - Calcular total de lojas
   - Calcular total de produtos
   - Calcular total de utilizadores
   - Calcular margem média global
   - Calcular valor total de stock

2. **Filtros e Ordenação** (5 testes):
   - Filtrar lojas por tipo
   - Ordenar por nome (A-Z)
   - Ordenar por produtos
   - Combinar filtro e ordenação

3. **Comparação de Lojas** (3 testes):
   - Comparar total de produtos
   - Comparar margem média
   - Identificar loja com melhor desempenho

4. **KPIs** (4 testes):
   - Calcular tendência de crescimento
   - Determinar status de saúde
   - Determinar status de stock

5. **Alertas** (4 testes):
   - Gerar alerta de margem baixa
   - Gerar alerta de stock baixo
   - Agregar alertas de múltiplas lojas

6. **Ranking** (3 testes):
   - Rankear por total de produtos
   - Rankear por margem média
   - Rankear por valor de stock

7. **Tendências** (3 testes):
   - Calcular crescimento mês-a-mês
   - Identificar tendência alta
   - Identificar tendência baixa

8. **Exportação** (2 testes):
   - Preparar dados para exportação
   - Gerar timestamp para exportação

## Padrões Utilizados

### 1. Pattern de Agregação
```typescript
const total = Array.from(storeStats.values())
  .reduce((sum, stat) => sum + stat.value, 0);
```

### 2. Pattern de Filtro + Ordenação
```typescript
const resultado = lojas
  .filter(l => l.tipo === filterType)
  .sort((a, b) => sortFn(a, b));
```

### 3. Pattern de Comparação
```typescript
const diff = value1 - value2;
const percent = ((value1 - value2) / value2) * 100;
const trend = value1 > value2 ? 'up' : 'down';
```

### 4. Pattern de Status Health
```typescript
const getStatus = (margem) => {
  if (margem >= 35) return 'Saudável';
  if (margem >= 25) return 'Aceitável';
  return 'Crítico';
};
```

## Dark Mode

Todos os componentes suportam dark mode:
- Cards com backgrounds adaptativos
- Texto com cores de alto contraste
- Borders com cores apropriadas
- Hover states em dark mode

## Acessibilidade

- Labels descritivos em selects
- Ícones com contexto visual
- Botões com text descritivo
- Contraste de cores adequado
- Navegação via keyboard

## Performance

- Agregação de dados usa reduce (eficiente)
- Filters aplicados antes de render
- Memoization em componentes com muitas props
- Carregamento lazy de estatísticas

## Próximos Passos (Fase 5)

Fase 5 focará em:
- **Gráficos**: Visualização de dados históricos (Charts)
- **Relatórios**: Exportação em PDF/Excel com histórico
- **Previsões**: Análise preditiva de tendências
- **Benchmarking**: Comparação com métricas do sector

## Verificação de Implementação

✓ AdminDashboard component criado
✓ StoreComparison component criado
✓ KPICards components (3 variantes) criados
✓ 27 testes criados e passando
✓ Agregação de dados global
✓ Filtros e ordenação multi-dimensional
✓ Sistema de alertas
✓ Ranking de lojas
✓ Análise de tendências
✓ Dark mode suportado

## Exemplos de Uso

### Usar AdminDashboard
```typescript
<AdminDashboard
  onSelectStore={(storeId) => {
    console.log('Loja selecionada:', storeId);
  }}
/>
```

### Usar StoreComparison
```typescript
<StoreComparison />
```

### Usar KPICards
```typescript
const kpis = [
  {
    label: 'Total Produtos',
    value: 150,
    change: 12.5,
    trend: 'up',
    color: 'blue',
  },
];

<KPICards kpis={kpis} columns={3} />
```

### Usar StoreKPICards
```typescript
const stats = {
  totalProdutos: 50,
  totalUtilizadores: 8,
  precoMedio: 15.5,
  margemMedia: 35.0,
  valorTotalStock: 1500,
};

<StoreKPICards stats={stats} previousStats={previousStats} />
```

### Usar HealthCheckKPIs
```typescript
<HealthCheckKPIs stats={stats} />
```

## Notas Importantes

1. **Agregação**: Dados globais calculados do lado do cliente para performance
2. **Comparação**: Percentuais ajudam a entender diferenças relativas
3. **Alertas**: Baseados em limites configuráveis
4. **Ranking**: Útil para identificar lojas de melhor/pior desempenho
5. **KPIs**: Indicadores visuais ajudam na tomada de decisão rápida
6. **Tendências**: Histórico necessário para análise precisa

## Métricas Chave Monitoradas

| Métrica | Tipo | Alarme | Status |
|---------|------|--------|--------|
| Total Produtos | Count | < 20 | Info |
| Utilizadores | Count | < 3 | Info |
| Preço Médio | Currency | - | Info |
| Margem Média | Percentage | < 25% | Aviso |
| Stock Total | Currency | < 1000 | Erro |
| Saúde | Status | Crítico | Erro |
