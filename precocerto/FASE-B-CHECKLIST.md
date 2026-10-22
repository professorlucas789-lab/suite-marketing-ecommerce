# ✅ FASE B — CHECKLIST DE IMPLEMENTAÇÃO

**Iniciado**: 9 de outubro de 2026  
**Última atualização**: 22 de outubro de 2026 (idempotência e rollback em simulação confirmados em staging)  
**Estado**: 🔄 MIGRAÇÃO VALIDADA EM STAGING (dados de teste) — falta publicar regras/índices, testar a app e auditar os dados reais

---

## 📌 RESUMO DO ESTADO

| Área | Estado |
|------|--------|
| Serviços unificados (produtos e vendas) | ✅ Implementados e testados contra o emulador do Firestore |
| Migração (Admin SDK, dry-run, rollback real) | ✅ Reescrita e testada |
| Migração em **staging** (dados de seed) | ✅ Executada a 22/10/2026 (6 entradas de stock, 0 erros, 0 avisos) |
| Regras do Firestore (stock, movimentos, vendas) | ✅ Escritas, testadas e **publicadas em staging** (22/10/2026) |
| Índices compostos (`firestore.indexes.json`) | ✅ Escritos · ⏳ **por publicar** em staging |
| Teste funcional da app em staging | ⏳ Pendente (depende dos índices) |
| Auditoria do modelo de dados **real** (produção) | ⏳ Pendente — bloqueia a produção |
| Produção | ⛔ Não iniciar antes dos pontos acima |

---

## 📦 ARTEFACTOS

### Serviços
- [x] `src/services/unifiedProductService.ts`
  - [x] Criar produto com stock da loja (batch atómico)
  - [x] Obter produto/produtos com stock por loja (`getUnifiedProductsForStore` filtra por `storeId`)
  - [x] Atualizar dados globais e stock
  - [x] Registar e consultar movimentos de stock
  - [x] Arquivar stock (`stock_archive`)
- [x] `src/services/unifiedSalesService.ts`
  - [x] Venda em transação: cada produto lido uma vez, soma das linhas validada contra o stock, saldos encadeados, um único update de stock por produto
  - [x] Rejeita quantidades inválidas (zero, negativas, `NaN`)
  - [x] `quantidadeVendida` acumula sobre o stock da loja
  - [x] `cancelUnifiedSale(storeId, receiptNumber, cancelledBy)`: leituras antes das escritas, estado relido na transação (anulações simultâneas só repõem o stock uma vez)
  - [x] Histórico de vendas por loja

### Migração e dados de teste
- [x] `src/scripts/migrationPhaseB.ts` (Firebase **Admin SDK**)
  - [x] Backup em lotes de 400 com campo `backupId`
  - [x] Não sobrescreve stock já migrado (avisa se a quantidade difere)
  - [x] Modo `--dry-run`
  - [x] Rollback real (`--rollback <backupId>`): remove o stock dessa migração e repõe do backup só o que já não existe
  - [x] Validação e relatório
- [x] `scripts/run-migration-staging.ts` — só aceita `precocerto-staging`, pede confirmação
- [x] `scripts/staging-seed-fase-b.mjs` — dados de teste (`fasebseed_*`), com `--limpar`
- [x] `scripts/run-migration-demo.ts` — simulação sem Firebase

### Regras e índices
- [x] `firestore.rules`: `products/{id}/stock/{storeId}`, `movements` e `stock_archive` (imutáveis), `sales` (coleção raiz), backups negados a clientes
- [x] `firestore.indexes.json`: `sales` (4 combinações), `audit_logs`, `expiryAlerts`

### Documentação
- [x] `docs/FASE-B-NORMALIZACAO-PRODUTOS.md` (desenho técnico)
- [x] `docs/MIGRATION-FASE-B.md` (guia de execução, rollback e deploy de regras/índices)

---

## 🧪 TESTES (estado real)

| Conjunto | Resultado | Como correr |
|----------|-----------|-------------|
| Suite normal (sem emulador) | 1266 passam · 2 ficheiros falham (já falhavam antes da FASE B) | `npm test` |
| Com emulador do Firestore | 183 passam | `npm run test:rules` |

- [x] Migração: 12 testes unitários (Firestore em memória)
- [x] Serviços: 18 testes de integração com o emulador (SDK modular real, transações reais)
- [x] Regras: 19 testes novos + os de regras que já existiam
- [x] Os problemas corrigidos foram reproduzidos no código anterior antes da correção
- [x] `tsc --noEmit` sem erros

**Falhas que já existiam (não são da FASE B):**
- `firestore-rules.integration.test.ts` — precisa do emulador (passa com `npm run test:rules`)
- `automatedAlertsService.test.ts` — precisa de variáveis Firebase no ambiente de teste

**Ressalvas honestas:**
- Os testes antigos `unifiedProductService.test.ts` e `unifiedSalesService.test.ts` **não importam os serviços** (fazem contas com valores literais). Não contam como cobertura. A cobertura real está nos testes de emulador acima.
- A cobertura (`npm run test:coverage`) **não foi medida** para os serviços unificados.
- Concorrência testada com **2** vendas simultâneas, não com 50+.

---

## 🔄 ETAPAS

### 1️⃣ App.tsx ✅
- [x] Imports e CRUD de produtos (`createUnifiedProduct`, `updateUnifiedProductData`, …)
- [x] Vendas através de `useSalesTransaction` → `recordUnifiedSaleTransaction`
- [ ] `cancelUnifiedSale` está importado no `App.tsx` mas **não é chamado** por nenhum ecrã: a anulação não tem interface

### 2️⃣ Componentes
- [x] `useSalesTransaction.ts`
- [ ] `ProductForm.tsx`, `ProductList.tsx`, `StockManagementPanel.tsx`, `Dashboard.tsx` (só se necessário / opcional)

### 3️⃣ Testes ✅ (ver secção acima)

### 4️⃣ Migração em staging
- [x] Dados de teste criados (`npm run seed:staging`): 2 lojas, 3 produtos, 6 entradas de stock
- [x] Dry-run: 3 produtos, 2 lojas, 6 entradas a migrar
- [x] Migração real em 22/10/2026 — `Status: completed`, 6 migradas, 0 já existentes, 0 erros, 0 avisos
  - Backup ID: `backup_2026-10-22T11:14:14.170Z` (3 + 6 = 9 documentos)
- [ ] Confirmar na consola: `products/fasebseed_prod_001/stock` com 2 documentos; `products_backup` (3) e `stores_products_backup` (6)
- [x] Repetir `npm run migrate:staging -- --sim` (22/10/2026) — `completed`, **0 migradas, 6 já existentes**, 0 erros, 0 avisos: confirma que não sobrescreve
  - Criou um 2.º backup (`backup_2026-10-22T12:04:44.558Z`). Cada execução faz backup, mesmo sem nada a migrar. **Para reverter usar o 1.º backup**: o stock leva o ID do backup que o criou, por isso o rollback do 2.º removeria 0 entradas
- [x] `npm run migrate:staging -- --rollback backup_2026-10-22T11:14:14.170Z --dry-run` (22/10/2026) — **6 entradas de stock a remover, 0 produtos e 0 produtos de loja a repor**, como esperado. Rollback **real** ainda não executado em staging

### 5️⃣ Publicar em staging (sempre com `--project precocerto-staging`)
> ⚠️ O `.firebaserc` aponta por defeito para **produção** (`precocerto-cc04a`).
- [x] Regras publicadas em staging a 22/10/2026 via GitHub Actions (`deploy-firebase-staging.yml`, operação `deploy-rules`, run #18, commit `1886f8a`): projeto validado como `precocerto-staging`, passo de deploy com sucesso. Ainda **não** corrido o `smoke-rules` contra as regras novas
- [ ] `firebase deploy --only firestore:indexes --project precocerto-staging --dry-run`, depois sem `--dry-run` (responder **N** se perguntar por apagar índices)
- [ ] Índices no estado "Ativo" (Firestore > Índices)

### 6️⃣ Testes funcionais da app em staging
- [ ] Criar produto numa loja
- [ ] Venda com 1 produto e com vários produtos
- [ ] Stock e `quantidadeVendida` atualizados corretamente
- [ ] Anular venda e confirmar reversão de stock (requer ligar `cancelUnifiedSale` à interface)
- [ ] Histórico de vendas (precisa dos índices)
- [ ] Duas lojas em simultâneo

### 7️⃣ Antes de produção (bloqueantes)
- [ ] **Auditar o modelo de dados real**: a migração assume stock em `stores/{id}/products`. As regras antigas de `products` sugerem que, em produção, o stock pode estar no próprio documento do produto (com `storeId`). Se for assim, a migração atual **não migraria nada**. Usar `scripts/audit-products-storeid.mjs`
- [ ] **Decidir o modelo de produtos**: as regras só deixam uma loja ler produtos de que é proprietária; um produto com stock noutra loja fica ilegível para essa loja
- [ ] Regras em falta para caminhos que a app usa: `audit_logs`, `stores/{id}/expiryAlerts`, `stores/{id}/products` (hoje caem no `deny` final)
- [ ] Code review aprovado
- [ ] Plano de rollback testado em staging (simulação feita; falta executar o rollback real e repetir a migração)
- [ ] Backup do Firestore de produção feito antes de migrar
- [ ] Monitorização ativa

### 8️⃣ Monitorização (24h após produção)
- [ ] Sem erros de Firestore (`PERMISSION_DENIED`, índices em falta)
- [ ] Sem sobrevenda
- [ ] Desempenho normal

---

## 🛠️ PROBLEMAS ENCONTRADOS E CORRIGIDOS DURANTE A VALIDAÇÃO

| Problema | Correção |
|----------|----------|
| A migração usava o SDK de cliente: as regras (autenticação, sem coleções inteiras, sem caminhos novos) bloqueavam-na | Reescrita com Admin SDK |
| `rollbackMigration` era um TODO que imprimia "completado" | Rollback real, testado |
| Backup num único batch (limite de 500 operações) | Lotes de 400 |
| Segunda execução da migração sobrescrevia stock já migrado | Não sobrescreve; avisa se difere |
| As regras não cobriam `stock`, `movements`, `stock_archive`, `sales` | Regras novas + 19 testes com emulador |
| `cancelUnifiedSale` falhava em recibos com mais de um produto (leituras depois de escritas) e consultava sem `storeId` | Reescrita |
| `getUnifiedProductsForStore` listava sem filtro (rejeitado pelas regras) | Filtra por `storeId` |
| `quantidadeVendida` nunca acumulava | Acumula sobre o stock da loja |
| Linhas repetidas do mesmo produto permitiam sobrevenda | Soma validada, saldos encadeados |
| Quantidades negativas aumentavam o stock | Rejeitadas |
| Consultas compostas sem índices | `firestore.indexes.json` |
| `firebase.ts` não funcionava fora do Vite (`import.meta.env`) | Usa `process.env` como alternativa |
| `.env.staging.example` ignorado pelo `.gitignore` | Exceção adicionada |

---

## 🚨 PONTOS CRÍTICOS

1. **Transações Firestore** — vendas e anulações: todas as leituras antes das escritas; estado relido dentro da transação.
2. **Isolamento por loja** — `products/{id}/stock/{storeId}`; nas regras o `storeId` vem do **caminho**, não do conteúdo do documento.
3. **Backups** — `products_backup/` e `stores_products_backup/`, escritos só com o Admin SDK (negados a clientes pelas regras).
4. **Projeto por defeito = produção** — usar sempre `--project precocerto-staging`.

---

## 🎯 CRITÉRIOS DE SUCESSO

- [x] Testes dos serviços, regras e migração passam (com emulador)
- [x] Migração executada com sucesso em staging (dados de seed) e repetida sem sobrescrever (idempotente)
- [ ] Validação pós-migração confirmada na consola
- [ ] Regras e índices publicados em staging
- [ ] Fluxo de vendas e anulação testado na app em staging
- [ ] Modelo de dados real auditado
- [ ] Code review aprovado

---

**NOTA**: Este checklist é guia de implementação. Qualquer desvio deve ser documentado.
