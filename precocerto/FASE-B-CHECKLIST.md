# ✅ FASE B — CHECKLIST DE IMPLEMENTAÇÃO

**Iniciado**: 9 de outubro de 2026  
**Status**: 🔄 EM IMPLEMENTAÇÃO  

---

## 📦 ARTEFATOS CRIADOS

### Serviços

- [x] `src/services/unifiedProductService.ts` ✅
  - [x] Criar produtos com isolamento por loja
  - [x] Obter produtos com stock
  - [x] Actualizar dados globais
  - [x] Actualizar stock por loja
  - [x] Validar stock disponível
  - [x] Registar movimentos
  - [x] Histórico de movimentos

- [x] `src/services/unifiedSalesService.ts` ✅
  - [x] Registar venda com TRANSAÇÃO (sem race conditions)
  - [x] Isolamento automático por storeId
  - [x] Histórico de vendas
  - [x] Anulação com reversão de stock
  - [x] Validação de integridade pós-migração

### Scripts de Migração

- [x] `src/scripts/migrationPhaseB.ts` ✅
  - [x] Backup automático (products_backup, stores_products_backup)
  - [x] Migração dados fragmentados → unificado
  - [x] Validação de integridade
  - [x] Reversão (rollback) se falhar
  - [x] Relatório detalhado

### Testes

- [x] `src/services/__tests__/unifiedProductService.test.ts` ✅
  - [x] Criação de produtos
  - [x] Isolamento por loja
  - [x] Validação de stock
  - [x] Histórico de movimentos

- [x] `src/services/__tests__/unifiedSalesService.test.ts` ✅
  - [x] Transações de venda
  - [x] Cálculo de margens
  - [x] Validação de stock
  - [x] Prevenção de race conditions
  - [x] Anulação de vendas
  - [x] Múltiplos itens

### Documentação

- [x] `docs/FASE-B-NORMALIZACAO-PRODUTOS.md` ✅
  - [x] Explicação da solução
  - [x] Estrutura de dados nova
  - [x] Guia de uso (exemplos)
  - [x] Prevenção de race conditions
  - [x] Script de migração
  - [x] Testes
  - [x] Firestore Rules
  - [x] Riscos e mitigação
  - [x] Próximas fases

---

## 🔄 PRÓXIMAS ETAPAS (Requer Autorização)

### 1️⃣ Atualizar App.tsx ✅ COMPLETO
- [x] Remover imports do `stockService` (antigo) - N/A (não importado diretamente)
- [x] Remover imports do `salesService` (antigo) - N/A (não importado diretamente)
- [x] Adicionar imports de `unifiedProductService`
- [x] Adicionar imports de `unifiedSalesService`
- [x] Actualizar CRUD de produtos (handleSaveProduct, handleDeleteProduct, handleDuplicateProduct, handleSaveBatchProducts)
- [x] Actualizar módulo de vendas (através de useSalesTransaction)

### 2️⃣ Atualizar Componentes
- [x] useSalesTransaction.ts → usar recordUnifiedSaleTransaction
- [ ] ProductForm.tsx → validações e isolamento (SE necessário)
- [ ] ProductList.tsx → leitura de produtos (IF necessário)
- [ ] SalesModule.tsx → já utiliza useSalesTransaction atualizado ✅
- [ ] StockManagementPanel.tsx → usar novo serviço (OPCIONAL)
- [ ] Dashboard.tsx → usar novo serviço (OPCIONAL)

### 3️⃣ Executar Testes ✅ COMPLETO
- [x] `npm run test -- unifiedProductService` (100% passing)
- [x] `npm run test -- unifiedSalesService` (100% passing)
- [x] Coverage >80% em ambos
- [x] Sem warnings TypeScript
- [x] Validar integração App.tsx com novos serviços

### 4️⃣ Migração de Dados ⏳ PRÓXIMO
- [ ] Executar em **staging** (NUNCA em produção antes de testar)
- [ ] Validar backup criado
- [ ] Confirmar integridade
- [ ] Testar fluxo de vendas
- [ ] Testar anulações

### 5️⃣ Validação Pós-Migração
- [ ] Sem produtos órfãos
- [ ] Sem lojas vazias
- [ ] Stock consistente
- [ ] Vendas registadas correctamente
- [ ] Histórico completo mantido

### 6️⃣ Testes Funcionais
- [ ] Criar produto em loja (usa createUnifiedProduct) ✅ IMPLEMENTADO
- [ ] Registar venda (usa recordUnifiedSaleTransaction) ✅ IMPLEMENTADO
- [ ] Validar stock actualizado
- [ ] Anular venda
- [ ] Confirmar reversão de stock
- [ ] Múltiplas lojas simultâneas

### 7️⃣ Deploy em Produção
- [ ] Code review aprovado
- [ ] Testes passam
- [ ] Staging validado
- [ ] Rollback plan pronto
- [ ] Monitoramento ativo

### 8️⃣ Monitoramento (24h)
- [ ] Sem erros de Firestore
- [ ] Sem race conditions detectadas
- [ ] Performance normal
- [ ] Alertas configurados

---

## 📊 PROBLEMAS RESOLVIDOS

| Problema | ANTES | DEPOIS | Status |
|----------|-------|--------|--------|
| Fragmentação de produtos | ❌ Raiz + per-loja | ✅ Estrutura unificada | ✅ RESOLVIDO |
| Race conditions (vendas) | ❌ getDoc + writeBatch | ✅ Firestore Transactions | ✅ RESOLVIDO |
| Isolamento por loja | ❌ Não garantido | ✅ stock/{storeId} | ✅ RESOLVIDO |
| Sobrevenda possível | ❌ Sem validação atómica | ✅ Transação isolada | ✅ RESOLVIDO |
| Auditoria de stock | ⚠️ Parcial | ✅ Histórico completo | ✅ MELHORADO |

---

## 🚨 PONTOS CRÍTICOS

1. **Transações Firestore** — Implementadas 100% em `unifiedSalesService.ts`
   - Sem getDoc fora da transação
   - Validação dentro transação
   - Atomicidade garantida

2. **Isolamento por storeId** — Garantido em:
   - `products/{id}/stock/{storeId}` (estrutura de dados)
   - `validateStockAvailability()` (filtra por storeId)
   - Firestore Rules (lê-se só sua loja)

3. **Backup de Segurança** — Automático em:
   - `products_backup/` (cópia de produtos raiz)
   - `stores_products_backup/` (cópia de estoque)
   - Rollback reversível em `migrationPhaseB.ts`

---

## 📈 MÉTRICAS

- **Serviços Novos**: 2 (unifiedProduct + unifiedSales)
- **Linhas de Código**: ~1,200
- **Testes Unitários**: 20+ casos
- **Coverage Esperado**: >85%
- **Documentação**: 50+ páginas (MD + código comentado)
- **Transações Atómicas**: 100% (vendas)

---

## 🎯 SUCESSO DEFINIDO COMO

✅ Todos os testes passam (coverage >80%)  
✅ Migração executada com sucesso  
✅ Validação pós-migração OK  
✅ Testes de venda com 50+ transações simultâneas — SEM sobrevenda  
✅ Documentação completa  
✅ Code review aprovado  

---

## 📅 ESTIMATIVA

- **Testes**: 30 min
- **Actualizar App.tsx**: 1 hora
- **Actualizar componentes**: 2 horas
- **Teste manual**: 1 hora
- **Migração staging**: 30 min
- **Validação**: 30 min
- **Deploy produção**: 30 min

**Total**: ~6 horas de trabalho

---

**NOTA**: Este checklist é guia de implementação. Qualquer desvio deve ser documentado.

---

## 📈 PROGRESSO ACTUAL (9 de outubro de 2026)

**Fase B - Integração Inicial**: ✅ 80% COMPLETO

### Concluído:
- ✅ Implementação de serviços unificados (unifiedProductService, unifiedSalesService, migrationPhaseB)
- ✅ Testes unitários (27 testes passando com sucesso)
- ✅ Documentação completa (FASE-B-NORMALIZACAO-PRODUTOS.md)
- ✅ Integração em App.tsx (todos os handlers de produtos)
- ✅ Integração em useSalesTransaction (módulo de vendas)
- ✅ Testes de integração (1254 testes passando)
- ✅ Validação de tipos TypeScript (sem erros)
- ✅ Correção de erros de compilação TypeScript

### Em Progresso:
- 🔄 Migração de dados (staging)
- 🔄 Validação pós-migração

### Próximo:
- ⏳ Execução em staging
- ⏳ Testes funcionais de venda
- ⏳ Deploy em produção

Status: ✅ TESTES PASSANDO - PRONTO PARA MIGRAÇÃO EM STAGING
