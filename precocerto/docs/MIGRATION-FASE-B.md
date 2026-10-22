# 🔄 Guia de Migração — FASE B

**Migração de Estrutura de Produtos para Modelo Unificado**

Data: 9 de outubro de 2026  
Status: ✅ Pronto para Staging (Admin SDK)

---

## 📋 O que é a Migração FASE B?

A FASE B migra o sistema de gestão de produtos de uma **estrutura fragmentada** para uma **estrutura unificada**:

### ANTES (Fragmentado):
```
products/
  ├── prod-001
  ├── prod-002
  └── prod-003

stores/{storeId}/products/
  ├── prod-001 (dados por loja)
  ├── prod-002
  └── prod-003
```

### DEPOIS (Unificado):
```
products/
  ├── prod-001/
  │  ├── (dados globais)
  │  └── stock/
  │     ├── store-001
  │     └── store-002
  ├── prod-002/
  │  ├── (dados globais)
  │  └── stock/
  │     ├── store-001
  │     └── store-002
  └── prod-003/
     └── (mesma estrutura)
```

### Benefícios:
- ✅ Sem fragmentação de dados
- ✅ Queries mais eficientes
- ✅ Isolamento por loja garantido
- ✅ Transações atómicas para vendas
- ✅ Histórico de movimentos rastreado

---

## 🚀 Como Executar em Staging

A migração usa o **Firebase Admin SDK** (ignora as Security Rules). Não usa o
`.env.staging`: usa Application Default Credentials. Só aceita o projeto
`precocerto-staging` e bloqueia `precocerto-cc04a` (produção).

### Pré-requisitos
1. **Node.js 18+** e `npm install` feito em `precocerto/`
2. **Credenciais de staging** (uma das duas):
   ```bash
   gcloud auth application-default login
   # ou
   export GOOGLE_APPLICATION_CREDENTIALS=/caminho/service-account-staging.json
   ```
   A conta precisa de permissão de escrita no Firestore de `precocerto-staging`
   (ex.: papel *Cloud Datastore User*).

### Passo 1: (só se staging estiver vazio) criar dados de teste
O Firestore de staging só tem `users`; a migração não teria nada para migrar.
```bash
npm run seed:staging             # cria 2 lojas, 3 produtos e 6 entradas de stock (IDs fasebseed_*)
npm run seed:staging -- --limpar # remove os dados de teste (e stock/backups deles)
```

### Passo 2: simular (não escreve nada)
```bash
npm run migrate:staging -- --dry-run
```

### Passo 3: migrar
```bash
npm run migrate:staging           # pede para escrever o ID do projeto
npm run migrate:staging -- --sim  # sem pedir confirmação
```

---

## 📊 O que Acontece na Migração

### 1️⃣ Backup automático
- Copia `products/` para `products_backup/{backupId}_{id}`
- Copia `stores/*/products/` para `stores_products_backup/{backupId}_{storeId}_{id}`
- Cada cópia leva o campo `backupId` (usado no rollback)
- Escrita em lotes de 400 (limite do Firestore: 500)

### 2️⃣ Migração de dados
Para cada loja e cada produto da loja:
- Lê o stock em `stores/{storeId}/products/{id}`
- Escreve `products/{id}/stock/{storeId}` (com `migrationBackupId`)
- **Não altera nem apaga a estrutura antiga**
- **Não sobrescreve** stock já existente (avisa se a quantidade difere)

### 3️⃣ Validação
- Confirma que todo o stock planeado existe
- Avisa sobre lojas sem produtos e produtos sem stock em nenhuma loja

### 4️⃣ Relatório
Estado, contagens (produtos, lojas, stock migrado/já existente), avisos, erros e
o `backupId`.

---

## ✅ Validação Pós-Migração

1. **Firestore Console** → `products` → um produto → subcoleção `stock`
2. Coleções `products_backup` e `stores_products_backup` criadas
3. **Regras do Firestore:** as `firestore.rules` já cobrem `products/{id}/stock`,
   `movements`, `stock_archive` e `sales`; os backups ficam negados a clientes.
   Publicar em staging **antes** de testar a app (o `.firebaserc` aponta por
   defeito para PRODUÇÃO: usar sempre `--project precocerto-staging`):
   ```powershell
   firebase deploy --only firestore:rules --project precocerto-staging
   ```
   Testar as regras localmente (emulador): `npm run test:rules`
4. Testar fluxo de vendas: venda com 1 e vários produtos, stock atualizado,
   anulação e reversão de stock
5. Dashboard, histórico, KPIs e alertas de validade
6. Obter aprovação antes de produção

---

## 🔄 Rollback

```bash
npm run migrate:staging -- --rollback backup_2026-10-22T08:30:51.283Z --dry-run  # simula
npm run migrate:staging -- --rollback backup_2026-10-22T08:30:51.283Z            # executa
```

O que faz:
1. Remove o stock criado **por essa migração** (`migrationBackupId`); stock criado
   por outras vias (ex.: vendas posteriores) não é tocado
2. Repõe a partir do backup apenas documentos originais que **já não existam**
   (nunca sobrescreve dados atuais)

O `backupId` é impresso no fim de cada migração.

---

## 📈 Progresso FASE B

| Etapa | Status | Data |
|-------|--------|------|
| Implementação de Serviços | ✅ Completo | 2026-10-09 |
| Testes Unitários | ✅ Completo (27 testes) | 2026-10-09 |
| Testes de Integração | ✅ Completo (1254 testes) | 2026-10-09 |
| TypeScript Compilation | ✅ Sem erros | 2026-10-09 |
| **Migração em Staging** | 🔄 Em Progresso | 2026-10-09 |
| Validação Pós-Migração | ⏳ Próximo | TBD |
| Deploy em Produção | ⏳ Próximo | TBD |

---

## 📚 Documentação Relacionada

- 📄 [FASE-B-NORMALIZACAO-PRODUTOS.md](./FASE-B-NORMALIZACAO-PRODUTOS.md) — Design técnico detalhado
- 📄 [FASE-B-CHECKLIST.md](../FASE-B-CHECKLIST.md) — Checklist de implementação
- 📄 [unifiedProductService.ts](../src/services/unifiedProductService.ts) — Serviço de produtos
- 📄 [unifiedSalesService.ts](../src/services/unifiedSalesService.ts) — Serviço de vendas

---

## 🆘 Troubleshooting

### "Could not load the default credentials"
Falta autenticação. Executar `gcloud auth application-default login` ou definir
`GOOGLE_APPLICATION_CREDENTIALS`.

### "PERMISSION_DENIED" 
A conta não tem permissão de escrita no Firestore de `precocerto-staging`.

### "Migração com 0 produtos"
Staging está vazio. Executar `npm run seed:staging` primeiro.

### "projectId deve ser 'precocerto-staging'" / "SEGURANÇA CRÍTICA"
O script recusa qualquer projeto que não seja staging. Verificar
`VITE_FIREBASE_PROJECT_ID` no ambiente.

### Avisos "Stock já existente ... difere da origem"
A migração não sobrescreve stock já migrado. Confirmar qual valor está certo e
corrigir manualmente, se necessário.

---

## 📞 Contacto

Em caso de dúvidas ou problemas:
1. Consultar documentação
2. Verificar logs de erro
3. Contactar time de desenvolvimento
4. Executar rollback se necessário

---

**Status Final: ✅ Pronto para Staging**

Comece sempre por `npm run migrate:staging -- --dry-run`.
