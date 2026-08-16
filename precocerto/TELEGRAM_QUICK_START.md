# 🚀 Telegram Setup - Quick Start (5 min)

## ⚡ 3 Passos Simples

### **PASSO 1: Criar Bot** (2 min)

1. Abra Telegram (no telemóvel ou web)
2. Procure: **`@BotFather`**
3. Envie: **`/newbot`**
4. Responda:
   - Nome: `PreçoCerto Alerts`
   - Username: `precocerto_alerts_bot` *(tem que ser único)*

5. **COPIE o token que aparecer** (parece isto):
   ```
   123456789:ABCdefGHIjklmnoPQRstuvwxyz12345678
   ```

---

### **PASSO 2: Configurar no Netlify** (2 min)

1. Ir para: **[Netlify Dashboard](https://app.netlify.com/sites/precocerto-als)**
2. Clicar em: **Settings → Build & deploy → Environment**
3. Clicar em: **Add an environment variable**
4. Preencher:
   - **Key**: `VITE_TELEGRAM_BOT_TOKEN`
   - **Value**: `[colar o token do passo 1]`
5. Clicar: **Save**
6. **Aguardar 3-5 minutos** para Netlify fazer rebuild

✅ **Pronto!** Já está funcionando.

---

### **PASSO 3: Testar** (1 min)

Abrir o site em: **[https://precocerto-als.netlify.app/](https://precocerto-als.netlify.app/)**

Tudo deve estar funcionando! ✅

---

## 📱 Como Usar

### Receber Notificações Automáticas

Quando um produto expira, recebes notificação no Telegram:

```
🚨 ALERTA CRÍTICO
Produto: Paracetamol 500mg
Dias: 5
Quantidade: 100 unidades
Lote: LOT123456

⚠️ AÇÃO URGENTE NECESSÁRIA HOJE!
```

### Agendar Notificações

*(Futuro - será automático com Cloud Scheduler)*

---

## ❓ Dúvidas Frequentes

**P: Onde fico com notificações?**  
R: No Telegram, no chat direto com o bot.

**P: Quanto custa?**  
R: Gratuito! Sem custos de API.

**P: Posso usar em grupos?**  
R: Sim! Adiciona o bot ao grupo e recebes notificações lá.

**P: E se esquecer o token?**  
R: Vai ao @BotFather e faz `/mybots` para ver.

---

## 🔗 Recursos

- **Telegram Bot API**: https://core.telegram.org/bots
- **@BotFather**: https://t.me/botfather
- **Documentação Local**: [NOTIFICATION_INTEGRATIONS.md](./NOTIFICATION_INTEGRATIONS.md)

---

**Status**: ✅ **Pronto para usar!**

Quando tiveres o token configurado, começa a receber notificações automáticas de produtos expirando. 🎉
