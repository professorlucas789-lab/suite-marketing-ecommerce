# 🔍 Script de Diagnóstico - Menu "Categorias"

## Como Executar

### Passo 1: Faça Login como Admin
- Email: `professorlucas789@gmail.com`
- Acesse a aplicação normalmente

### Passo 2: Abra DevTools
- Pressione **F12** (ou Cmd+Option+I no Mac)
- Vá a "Console" tab

### Passo 3: Copie e Cole o Script

```javascript
// 🔍 SCRIPT DE DIAGNÓSTICO - MENU CATEGORIAS
(async () => {
  console.log('🔍 INICIANDO DIAGNÓSTICO...\n');

  try {
    // Obter utilizador autenticado
    const user = window.firebase?.auth?.currentUser;
    console.log('✅ Utilizador Firebase:', {
      email: user?.email,
      uid: user?.uid,
      displayName: user?.displayName
    });

    // Obter dados do Firestore
    const { doc, getDoc } = window.firebase?.firestore;
    const { db } = window; // Assumindo que db está global

    if (!doc || !getDoc || !db) {
      console.error('❌ Firebase Firestore não está disponível');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error('❌ Documento do utilizador não encontrado no Firestore');
      return;
    }

    const userData = userSnap.data();
    console.log('\n✅ Documento Firestore encontrado:', userData);

    // Verificar papel
    console.log('\n🔐 ANÁLISE DE PAPÉIS:');
    console.log('├─ Papel no Firestore:', userData.papel);
    console.log('├─ Esperado: "admin"');
    console.log('└─ Match:', userData.papel === 'admin' ? '✅ SIM' : '❌ NÃO');

    // Verificar permissões
    console.log('\n🔑 PERMISSÕES:');
    console.log('├─ visualizar:', userData.permissoes?.visualizar ?? 'undefined');
    console.log('├─ criar:', userData.permissoes?.criar ?? 'undefined');
    console.log('├─ editar:', userData.permissoes?.editar ?? 'undefined');
    console.log('├─ deletar:', userData.permissoes?.deletar ?? 'undefined');
    console.log('└─ relatorios:', userData.permissoes?.relatorios ?? 'undefined');

    // Verificar lojas atribuídas
    console.log('\n🏪 LOJAS ATRIBUÍDAS:', userData.lojas?.length || 0);
    if (userData.lojas?.length > 0) {
      userData.lojas.forEach((loja, i) => {
        console.log(`  ${i + 1}. ${loja}`);
      });
    }

    // RECOMENDAÇÕES
    console.log('\n' + '='.repeat(60));
    console.log('📋 RECOMENDAÇÕES:');
    console.log('='.repeat(60));

    if (userData.papel !== 'admin') {
      console.error('❌ PROBLEMA ENCONTRADO!');
      console.error('   Seu papel no Firestore é "' + userData.papel + '", não "admin"');
      console.error('\n   SOLUÇÃO:');
      console.error('   1. Abra Firebase Console');
      console.error('   2. Firestore → Collection "users" → Documento com uid: ' + user.uid);
      console.error('   3. Edite o campo "papel" para "admin"');
      console.error('   4. Faça logout e login novamente');
      console.error('   5. Recarregue a página');
    } else {
      console.log('✅ Papel está correto!');
      console.log('   Se mesmo assim o menu "Categorias" não aparece,');
      console.log('   pode ser um problema de cache. Tente:');
      console.log('   1. Limpar cache/cookies do navegador');
      console.log('   2. Fazer logout');
      console.log('   3. Fazer login novamente');
      console.log('   4. Forçar reload: Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 PRÓXIMO PASSO:');
    console.log('='.repeat(60));
    console.log('Acesse a página de Diagnóstico em: Menu → Diagnóstico');
    console.log('(Ela mostrará uma interface visual com todos estes dados)');

  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
    console.error('Detalhes:', error.message);
  }
})();
```

### Passo 4: Pressione Enter

O script mostrará:
- ✅ Seu email e UID
- ✅ Papel no Firestore
- ✅ Permissões
- ✅ Lojas atribuídas
- ✅ Recomendações automáticas

### Passo 5: Informe-me os Resultados

Se o script mostrar **❌ PROBLEMA ENCONTRADO**:
- Copie exatamente qual é o papel (ex: "funcionario", "loja-manager")
- Me envie a mensagem de erro

Se mostrar **✅ Papel está correto**:
- Tente as soluções sugeridas (limpar cache, logout/login)
- Se ainda não funcionar, informe-me

---

## Se Preferir Usar a Interface Visual

Em vez do script, você pode:
1. Aceder à aplicação
2. Ir a "Menu → Diagnóstico"
3. A página mostrará a mesma informação de forma visual e amigável

---

## Resolução Rápida via Firebase Console

Se quiser corrigir rapidamente sem aguardar:

1. **Abra Firebase Console:**
   - https://console.firebase.google.com
   - Selecione seu projeto

2. **Vá a Firestore:**
   - Firestore Database → Collection "users"

3. **Procure seu documento:**
   - Procure pelo uid: `professorlucas789@gmail.com` (ou use o uid que aparece no console)

4. **Edite o campo `papel`:**
   - Clique no documento
   - Procure o campo "papel"
   - Mude para exatamente: `"admin"` (minúsculas, sem espaços)

5. **Faça logout e login:**
   - Logout completo
   - Login novamente
   - Verifique se "Categorias" aparece

---

## Troubleshooting

### "Firebase não está disponível"
- Significa que a página não carregou corretamente
- Tente recarregar a página (F5)
- Verifique se está logado

### "Documento não encontrado"
- Seu utilizador não tem documento no Firestore
- Contacte o administrador para criá-lo

### "Papel está correto mas menu não aparece"
- Pode ser cache do navegador
- Limpe cookies/cache
- Tente em modo incógnito
- Use Ctrl+Shift+R para recarregar sem cache

---

## Próximas Etapas

Assim que o problema for resolvido (ou confirmado que não há problema):

1. ✅ Menu "Categorias" funcionando
2. ✅ Cores dinâmicas implementadas
3. → Podemos começar **Fase 15: Dashboard Admin**

---

**Quando tiver executado, me envie:**
```
Problema encontrado: SIM / NÃO
Se sim, qual é? [papel atual no Firestore]
Solução aplicada: [se resolveu]
Menu "Categorias" aparece agora: SIM / NÃO
```
