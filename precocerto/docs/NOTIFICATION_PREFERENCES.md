# 📧 Documentação - Preferências de Notificação (Fase 13)

## 📖 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Tipos de Dados](#tipos-de-dados)
4. [Exemplos de Uso](#exemplos-de-uso)
5. [API Reference](#api-reference)
6. [Interface do Utilizador](#interface-do-utilizador)

---

## 🎯 Visão Geral

### O Que São Preferências de Notificação?
Sistema que permite cada utilizador controlar:
- **Canais**: Como receber notificações (email, push, in-app)
- **Eventos**: Quais tipos de eventos geram notificações
- **Horário**: Quando NÃO receber notificações (quiet hours)
- **Frequência**: Com que frequência resumos são enviados

### Benefícios
✅ **Controle Total** - Utilizador decide o que quer receber
✅ **Sem Spam** - Apenas notificações relevantes
✅ **Horário Respeitador** - Quiet hours para não perturbar
✅ **Flexível** - Fácil de mudar a qualquer momento
✅ **Centralizado** - Tudo num só lugar (Perfil do Utilizador)

### Casos de Uso

#### Caso 1: Gestor de Loja Ocupado
```
Preferências:
├─ Email: ✅ Ativo
├─ Push: ❌ Desativo
├─ Eventos: Apenas "Alertas de Segurança" e "Preço Alterado"
└─ Quiet Hours: 22:00 a 08:00 (não perturbar à noite)
```

#### Caso 2: Admin Vigilante
```
Preferências:
├─ Email: ✅ Ativo
├─ Push: ✅ Ativo
├─ Eventos: Todos os eventos habilitados
├─ Quiet Hours: Desativo (receber a qualquer hora)
└─ Frequência: Diária
```

#### Caso 3: Funcionário Discreto
```
Preferências:
├─ Email: ❌ Desativo
├─ Push: ❌ Desativo
├─ Eventos: Não importa (nenhum canal ativo)
└─ In-app: ✅ Ativo (lê quando tem tempo)
```

---

## 🏗️ Arquitetura

### Estrutura Firestore

```
firestore/
├── users/
│   └── {userId}/
│       ├── settings/
│       │   └── notifications (NOVO)
│       │       ├── userId: "user-123"
│       │       ├── canais:
│       │       │   ├─ email: true
│       │       │   ├─ push: false
│       │       │   └─ inApp: true
│       │       ├── eventos:
│       │       │   ├─ produtoAdicionado: true
│       │       │   ├─ produtoEditado: true
│       │       │   ├─ produtoDeletado: true
│       │       │   ├─ precoAlterado: true
│       │       │   ├─ relatoriosGerados: true
│       │       │   ├─ alertasSeguranca: true
│       │       │   ├─ manutencaoSistema: true
│       │       │   ├─ utilizadorCriado: false
│       │       │   └─ utilizadorAlterado: false
│       │       ├── frequenciaResumo: "diaria"
│       │       ├── horarioNaoPerturbar:
│       │       │   ├─ ativo: true
│       │       │   ├─ horaInicio: "22:00"
│       │       │   └─ horaFim: "08:00"
│       │       ├── dataCriacao: "2026-08-14T10:30:00Z"
│       │       └── dataAtualizacao: "2026-08-14T10:30:00Z"
│       │
│       ├── (outros documentos)
│       └── profile, credentials, etc.
│
└── (outras collections)
```

### Fluxo de Dados

```
User (Perfil)
    ↓
UserProfileView
    ↓
NotificationPreferencesCard (UI)
    ↓
useNotificationPreferences (Hook)
    ↓
notificationPreferencesService (CRUD)
    ↓
Firestore (users/{userId}/settings/notifications)
```

### Preferências Padrão

Novo utilizador recebe:
```typescript
{
  canais: {
    email: true,      // Receber por email
    push: false,      // Não receber push
    inApp: true,      // Ver dentro da app (sempre)
  },
  eventos: {
    produtoAdicionado: true,
    produtoEditado: true,
    produtoDeletado: true,
    utilizadorCriado: false,
    utilizadorAlterado: false,
    precoAlterado: true,
    relatoriosGerados: true,
    alertasSeguranca: true,      // Sempre importante
    manutencaoSistema: true,     // Sempre importante
  },
  frequenciaResumo: 'diaria',
  horarioNaoPerturbar: {
    ativo: true,
    horaInicio: '22:00',
    horaFim: '08:00',
  },
}
```

---

## 📊 Tipos de Dados

### NotificationPreferences

```typescript
interface NotificationPreferences {
  userId: string;

  // Canais de notificação
  canais: {
    email: boolean;          // Notificações por email
    push: boolean;           // Notificações push
    inApp: boolean;          // Notificações na app (sempre)
  };

  // Categorias de eventos
  eventos: {
    produtoAdicionado: boolean;
    produtoEditado: boolean;
    produtoDeletado: boolean;
    utilizadorCriado: boolean;
    utilizadorAlterado: boolean;
    precoAlterado: boolean;
    relatoriosGerados: boolean;
    alertasSeguranca: boolean;
    manutencaoSistema: boolean;
  };

  // Frequência de resumo
  frequenciaResumo: 'nunca' | 'diaria' | 'semanal' | 'mensal';

  // Horário de não perturbar
  horarioNaoPerturbar: {
    ativo: boolean;
    horaInicio: string;      // "HH:MM"
    horaFim: string;         // "HH:MM"
  };

  // Timestamps
  dataCriacao: string;       // ISO 8601
  dataAtualizacao: string;   // ISO 8601
}
```

---

## 💻 Exemplos de Uso

### 1. Usar o Hook num Componente

```typescript
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';

export function MyNotificationSettings() {
  const {
    preferences,
    loading,
    error,
    toggleChannel,
    toggleEvent,
    setQuietHours,
  } = useNotificationPreferences();

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h2>Email ativo? {preferences?.canais.email ? 'Sim' : 'Não'}</h2>
      <button onClick={() => toggleChannel('email')}>
        Toggle Email
      </button>
    </div>
  );
}
```

### 2. Ativar/Desativar Canal

```typescript
const { toggleChannel } = useNotificationPreferences();

// Desativar email (se estava ativo) ou ativar (se estava desativo)
await toggleChannel('email');
await toggleChannel('push');
```

### 3. Ativar/Desativar Tipo de Evento

```typescript
const { toggleEvent } = useNotificationPreferences();

// Desativar notificações de produto adicionado
await toggleEvent('produtoAdicionado');

// Ativar notificações de relatórios
await toggleEvent('relatoriosGerados');
```

### 4. Configurar Quiet Hours

```typescript
const { setQuietHours } = useNotificationPreferences();

// Ativar quiet hours de 22:00 a 08:00
await setQuietHours(true, '22:00', '08:00');

// Desativar
await setQuietHours(false, '', '');
```

### 5. Definir Frequência de Resumo

```typescript
const { setSummaryFrequency } = useNotificationPreferences();

// Receber resumo semanal
await setSummaryFrequency('semanal');

// Receber resumo nunca
await setSummaryFrequency('nunca');
```

### 6. Resetar para Padrão

```typescript
const { resetPreferences } = useNotificationPreferences();

// Voltar às preferências padrão
await resetPreferences();
```

### 7. Verificar se Deve Enviar Notificação

```typescript
import { shouldSendNotification } from '../services/notificationPreferencesService';

// Verificar antes de enviar notificação
const shouldSend = await shouldSendNotification(
  userId,
  'produtoAdicionado',
  'email'
);

if (shouldSend) {
  // Enviar notificação por email
  await sendEmailNotification(userId, ...);
}
```

---

## 📚 API Reference

### Hook: `useNotificationPreferences()`

```typescript
interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  isInQuietHours: boolean;

  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  toggleChannel: (channel: 'email' | 'push' | 'inApp') => Promise<void>;
  toggleEvent: (eventType: keyof NotificationPreferences['eventos']) => Promise<void>;
  setQuietHours: (ativo: boolean, horaInicio: string, horaFim: string) => Promise<void>;
  setSummaryFrequency: (frequency: 'nunca' | 'diaria' | 'semanal' | 'mensal') => Promise<void>;
}
```

### Service: `notificationPreferencesService`

#### `getNotificationPreferences(userId)`
```typescript
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences>
```
Obter preferências do utilizador (cria padrão se não existir)

#### `updateNotificationPreferences(userId, updates)`
```typescript
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>
): Promise<void>
```
Atualizar campos específicos

#### `resetNotificationPreferences(userId)`
```typescript
export async function resetNotificationPreferences(userId: string): Promise<void>
```
Resetar para preferências padrão

#### `shouldSendNotification(userId, eventType, channel)`
```typescript
export async function shouldSendNotification(
  userId: string,
  eventType: keyof NotificationPreferences['eventos'],
  channel: keyof NotificationPreferences['canais'] = 'email'
): Promise<boolean>
```
**Importante**: Verifica:
1. Se canal está ativo
2. Se tipo de evento está ativo
3. Se NÃO está em quiet hours

#### `toggleChannel(userId, channel)`
#### `toggleEvent(userId, eventType)`
#### `updateQuietHours(userId, ativo, horaInicio, horaFim)`
#### `updateSummaryFrequency(userId, frequency)`
#### `isInQuietHours(preferences)`

---

## 🖥️ Interface do Utilizador

A interface é integrada no **Perfil do Utilizador** (UserProfileView) com:

### Seção 1: Canais de Notificação
- ☑️ Notificações por Email
- ☑️ Notificações Push
- ☑️ Notificações no App (sempre ativo)

### Seção 2: Tipos de Eventos
- ☑️ Produto Adicionado
- ☑️ Produto Editado
- ☑️ Produto Deletado
- ☑️ Preço Alterado
- ☑️ Relatórios Gerados
- ☑️ Alertas de Segurança
- ☑️ Manutenção do Sistema

### Seção 3: Horário de Não Perturbar
- ☑️ Ativar/Desativar
- ⏰ Hora de Início (input time)
- ⏰ Hora de Fim (input time)

### Seção 4: Ações
- 🔄 Resetar para Padrão

---

## ⚡ Performance

### Cache
- Preferências carregadas uma vez ao montar o componente
- Atualizações otimistas (UI atualiza imediatamente)
- Re-sincroniza com Firestore após mudança

### Otimizações
- Firestore: Usa `updateDoc` (não sobrescreve documento inteiro)
- Frontend: Usa `setPreferences` parcial (não recarrega tudo)
- Network: Requisições consolidadas

---

## 🔧 Troubleshooting

### ❌ "Preferências não carregam"
```typescript
// Verificar se userId está disponível
const { preferences, loading, error } = useNotificationPreferences();
console.log('Loading:', loading, 'Error:', error);

// Verificar Firestore
// Deve ter: users/{userId}/settings/notifications
```

### ❌ "Mudanças não salvam"
```typescript
// Verificar permissões Firestore
// Regra deve permitir escrita em: users/{userId}/settings/**

// Verificar se há erro na chamada
const { error } = useNotificationPreferences();
if (error) console.error(error);
```

### ❌ "Quiet hours não funciona"
```typescript
// Verificar formato de hora: "HH:MM" (24h)
// Valide: horaInicio < horaFim ou horaInicio > horaFim

// Testar função
import { isInQuietHours } from '../services/notificationPreferencesService';
const emQuietHours = isInQuietHours(preferences);
console.log('Em quiet hours?', emQuietHours);
```

---

## 📋 Checklist de Implementação

- [x] Tipo NotificationPreferences criado
- [x] Service com CRUD completo
- [x] Hook com estado e lógica
- [x] Componente NotificationPreferencesCard
- [x] Integração no UserProfileView
- [x] UI com toggles e inputs
- [x] Firestore salva em users/{userId}/settings/notifications
- [x] Preferências padrão criadas automaticamente
- [ ] Email notifications (backend, fora do scope)
- [ ] Push notifications (backend, fora do scope)
- [ ] Envio de notificações com verificação shouldSendNotification
- [ ] Relatórios diários/semanais/mensais

---

## 🎯 Próximas Etapas

**Fase 14:** Integrar com backend de notificações
- [ ] Enviar emails baseado em preferências
- [ ] Enviar push notifications baseado em preferências
- [ ] Criar cron jobs para resumos diários/semanais
- [ ] Testar com casos reais

**Fase 15:** Melhorias
- [ ] Pré-visualização de notificações
- [ ] Histórico de notificações recebidas
- [ ] Template de notificações customizável
- [ ] Notificações por loja específica

---

**Versão:** 1.0 (Fase 13)
**Última atualização:** 2026-08-14
**Status:** ✅ Implementado e Pronto para Uso
