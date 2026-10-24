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
| Índices compostos (`firestore.indexes.json`) | ✅ Escritos e **publicados em staging** (22/10/2026) · ⏳ confirmar "Ativo" na consola |
| Teste funcional da app em staging | ⏳ Pendente (regras e índices já publicados; falta confirmar índices ativos) |
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
- [x] Anulação de vendas ligada à interface: `SalesHistory.tsx` (botão "Anular" + motivo) passa a chamar `cancelUnifiedSale(storeId, recibo, utilizador, { cancelledByName, reason })`. Antes chamava `cancelSaleByReceipt` (serviço antigo), que repunha o stock no sítio errado e consultava sem `storeId`
  - O motivo e o nome de quem anulou ficam guardados (`cancellationReason`, `cancelledByName`) e aparecem no histórico
  - As regras só deixam anular o **autor da venda ou um administrador**; outro utilizador vê a mensagem "Sem permissão para anular este recibo" dentro da janela de confirmação
  - 6 testes do componente + 2 de emulador; falta testar manualmente em staging

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
- [x] Índices publicados em staging a 22/10/2026 (`firebase deploy --only firestore:indexes --project precocerto-staging`): `deployed indexes in precocerto/firestore.indexes.json successfully for (default) database`. O CLI também compilou as `firestore.rules` sem erros. Não apareceu pergunta sobre apagar índices existentes
- [ ] Índices no estado "Ativo" (Firestore > Índices)

### 6️⃣ Testes funcionais da app em staging
- [ ] Criar produto numa loja
- [ ] Venda com 1 produto e com vários produtos
- [ ] Stock e `quantidadeVendida` atualizados corretamente
- [ ] Anular venda (Vendas > Histórico > Anular) e confirmar reversão de stock; testar também com um funcionário que não é o autor (deve ver a mensagem de falta de permissão)
- [ ] Histórico de vendas (precisa dos índices)
- [ ] Duas lojas em simultâneo

### 7️⃣ Antes de produção (bloqueantes)
- [x] **Modelo de dados real auditado** (22/10/2026, `node scripts/audit-products-storeid.mjs`, só leitura sobre `precocerto-cc04a`): **52 produtos**, todos com `storeId` e `userId` válidos; **0** documentos em `stores/*/products`; **52** produtos com o stock só no documento (`quantidadeDisponivel`). Conclusão: a migração anterior migraria **0** entradas e os 52 produtos ficariam com stock 0
  - O auditor foi corrigido (`docSnap.exists()` → `docSnap.exists`; com o bug, todos saíam "órfãos") e passou a mostrar a "LOCALIZAÇÃO DO STOCK"
- [x] **Migração estendida** (22/10/2026): passa a criar `products/{id}/stock/{lojaProprietária}` a partir do documento do produto com a regra da app antiga (`quantidadeDisponivel ?? quantidade ?? 0`; vendido = `quantidadeVendida`); `stores/{loja}/products` tem prioridade se existir; negativos/inválidos → 0 com aviso; sem `storeId` → avisa e não migra. 8 testes novos (7 falham com a migração antiga) e cadeia completa validada com o Admin SDK real no emulador (seed → dry-run → migração → repetição)
- [x] **Seed novo e dry-run da migração estendida confirmados em staging** (23/10/2026):
  - `seed:staging -- --limpar` removeu 21 documentos (stock migrado e backups antigos incluídos)
  - `seed:staging` criou 2 lojas, 4 produtos e 4 entradas em `stores/{loja}/products` (1 produto com stock só no documento, como em produção)
  - Dry-run: `completed`, **5 entradas a migrar** (4 de `stores/*/products` + 1 do documento do produto), **0 já existentes**, **1 fora da loja proprietária**, **1 criada a partir do documento do produto**, 1 aviso (`fasebseed_prod_001`) e backup simulado de 8 documentos (4 produtos + 4 stocks de loja)
- [x] **Migração real com o seed novo** (23/10/2026): `completed`, **5 migradas, 0 já existentes, 1 criada a partir do documento do produto, 1 fora da loja proprietária**, 1 aviso (o esperado), 0 erros; validação do passo 6 sem avisos adicionais
  - Backup ID: `backup_2026-10-23T13:36:25.878Z` (8 documentos: 4 produtos + 4 stocks de loja) — usar este para o rollback
- [ ] **Entrar na app de staging** (ver `docs/MIGRATION-FASE-B.md`, "Entrar na app de staging para testar"):
  - [x] **Hosting publicado** a 24/10/2026 (workflow `deploy`, run #21, commit `5668757`, `main`): o job concluiu com sucesso em cerca de 80 segundos. O site de staging tinha o código de 20/09/2026, anterior à FASE B. **Não confirmado** no site em si (sem acesso de rede a partir do ambiente de desenvolvimento): confirmar a data em Firebase Console > Hosting
  - [ ] Criar o utilizador de teste (`npm run seed:staging-user`, validado contra os emuladores de Auth e Firestore) e entrar em https://precocerto-staging.web.app
- [ ] Confirmar na consola: `fasebseed_prod_004/stock/fasebseed_store_1` com 40 disponíveis e 7 vendidos (vindos do documento do produto), documento do produto inalterado, `products_backup` com 4 documentos e `stores_products_backup` com 4
- [x] **Bloqueante dos ecrãs resolvido com um espelho atómico** (22/10/2026): o stock da loja (`products/{id}/stock/{loja}`) é a fonte de verdade e **todos os escritores** atualizam, na mesma transação/batch, `quantidadeDisponivel`/`quantidadeVendida` do documento do produto (a loja proprietária é única, por isso são sempre iguais). Assim o Dashboard, os detalhes, o painel de saúde, os alertas, as estatísticas e as exportações ficam certos **sem alterar os ecrãs**. Escritores convertidos (`src/utils/unifiedStock.ts`): venda, anulação, ajuste e transferência de stock (`stockMovementService`), compras (`purchasingService`), `createUnifiedProduct`, `updateUnifiedProductStock` e `archiveProductStock`
  - Produtos **sem entrada de stock** (importados, ou ainda não migrados) partem do valor do documento e a entrada é criada na primeira escrita
  - Regras novas: qualquer membro da loja pode atualizar **só** os campos do espelho no produto (`hasOnly`); regras de `stockMovements` (ajustes/transferências); transferência cria o produto de destino com `userId` de quem transfere
  - Testes: 21 de integração (15 falham com o código anterior), 9 de regras (5 falham com as regras anteriores, incluindo venda de 6 produtos e transferência sob as regras reais) e 9 unitários do módulo partilhado
- [x] **Regras do espelho de stock e de `stockMovements` publicadas em staging** a 22/10/2026 (workflow `deploy-rules`, run #20, commit `e1769f3`): projeto validado como `precocerto-staging`, passo de deploy com sucesso. Ainda **não** corrido o `smoke-rules` nem testada a app em staging
- [ ] **Limitações conhecidas do espelho** — rever antes de produção:
  - A importação do `BackupView` cria produtos sem entrada de stock (resolvido na 1.ª escrita, ou repetindo a migração, que é idempotente)
  - A exportação do `BackupView` e as estatísticas leem o documento do produto: corretas graças ao espelho, mas a fonte de verdade é o stock da loja
  - O caminho de vendas antigo (`SalesTab` / `QuickSalesRecorder`, via `salesService`) **não está renderizado** na app; se for reativado, escreve só no documento do produto e ignora o stock da loja
  - **Compras** (`purchases`, `suppliers`, `financialTransactions`), `audit_logs`, `stores/{id}/expiryAlerts` e `stores/{id}/products` (painéis de `stockService`) **continuam sem regras** no Firestore e caem no `deny` final: estes ecrãs falham com as regras atuais
- [ ] **Regra dupla de stock da app antiga:** sem `quantidadeDisponivel`, a venda usava `quantidade` mas os ecrãs mostravam `totalUnidadesVendaveis`. A migração usa `quantidade`. Voltar a correr o auditor em produção (agora mostra quantos produtos divergem) e rever esses produtos antes de migrar
- [x] **Modelo de produtos decidido e imposto** (22/10/2026): um produto pertence a uma loja (`Product.storeId`) e o stock vive nessa loja. Regra de stock exige produto da mesma loja (`getAfter`); `createUnifiedProduct` e `recordUnifiedSaleTransaction` recusam produtos de outra loja; a migração avisa de stock fora da loja proprietária e de produtos sem `storeId`. **Partilha de produtos entre lojas** fica como decisão futura (exigiria mudar as regras de leitura)
- [x] **Regras com a regra de propriedade publicadas em staging** a 22/10/2026 (workflow `deploy-rules`, run #19, commit `0a24065`): projeto validado como `precocerto-staging`, passo de deploy com sucesso
- [x] Seed refeito com dados coerentes (22/10/2026): `seed:staging -- --limpar` removeu 44 documentos (stock antigo e backups incluídos) e `seed:staging` criou 2 lojas, 3 produtos e 4 entradas de stock
- [x] Dry-run da migração com o código novo (22/10/2026): `completed`, **4 entradas a migrar, 0 já existentes, 1 fora da loja proprietária**, 1 aviso (`fasebseed_prod_001` pertence à loja 1 mas tem stock na loja 2) e backup de 7 documentos (3 produtos + 4 stocks de loja). Confirma que os avisos de propriedade funcionam
- [x] Migração **real** com os dados coerentes (22/10/2026): `completed`, **4 migradas, 0 já existentes, 1 fora da loja proprietária**, 1 aviso (o esperado), 0 erros. Validação do passo 6 sem avisos adicionais
  - Backup ID: `backup_2026-10-22T20:06:15.334Z` (7 documentos: 3 produtos + 4 stocks de loja) — usar este para o rollback
- [ ] Confirmar na consola: `fasebseed_prod_001/stock` com 2 documentos (lojas 1 e 2; o da loja 2 migrado mas ilegível para essa loja pelas regras), `prod_002/stock` com 1, `prod_003/stock` com 1; `products_backup` com 3 e `stores_products_backup` com 4
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
| Stock podia existir numa loja que não é a proprietária do produto (ilegível para essa loja); produtos de seed sem `storeId` | Regra `getAfter` no stock, validações nos serviços, avisos na migração, seed coerente |
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
- [x] Modelo de dados real auditado (52 produtos, todo o stock no documento do produto; migração estendida)
- [ ] Code review aprovado

---

**NOTA**: Este checklist é guia de implementação. Qualquer desvio deve ser documentado.
