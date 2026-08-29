# ⚠️ INSTRUÇÕES CRÍTICAS PARA DESENVOLVIMENTO DO PRECOCERTO

## 🇵🇹 IDIOMA OBRIGATÓRIO: PORTUGUÊS (pt-PT)

**SEM EXCEÇÕES.**

- ✅ Todas as respostas devem ser em português português
- ✅ Todos os comentários de código em português  
- ✅ Todas as documentações (README, comentários, mensagens de commit) em português
- ✅ Nomes de variáveis podem ser em inglês (padrão técnico), mas descrições sempre em português
- ✅ Se algo parecer estar em inglês, é um erro - avise imediatamente

---

## 📋 Contexto do Projeto

**PreçoCerto** - Sistema de gestão de farmácia/supermercado com integrações avançadas

### Fases de Implementação:
- ✅ **FASE 0**: Redesign Módulo de Vendas (CONCLUÍDO)
- ✅ **FASE 1**: Notificações Inteligentes de Validade (CONCLUÍDO)  
- ✅ **FASE 2**: Gestão de Estoque Automática (CONCLUÍDO)
- ⏳ **FASE 3**: Módulo de Vendas Básico (EM PROGRESSO)
- 📅 **FASE 4**: Integrações e Automação (WhatsApp, Email, Cloud Functions)

### Tecnologias:
- React 19 + TypeScript 5.8
- Firebase (Firestore, Auth, Storage)
- Tailwind CSS 4.1
- Vitest para testes
- Motion/React para animações

### Branch de Desenvolvimento:
```
Branch: claude/precocerto-stage-1-xsicob
Repositório: professorlucas789-lab/suite-marketing-ecommerce
```

---

## 🎯 Padrões de Código

### Hooks React (Padrão Consistente):
```typescript
export function useNewFeature() {
  const { currentStore } = useStore();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { /* fetch data */ }, [currentStore?.storeId]);

  return { data, isLoading, error, actions };
}
```

### Services (Lógica Reutilizável):
- Métodos estáticos
- Validações antes de Firestore writes
- Tratamento de erros consistente
- Timestamps com serverTimestamp()

### Componentes:
- Responsivo (desktop/mobile)
- Dark mode com Tailwind
- Props opcionais para variações (compact, showResolved, etc.)
- Padrão: container (lógica) + apresentacional (UI)

---

## 🔐 Segurança

- Firestore Security Rules para RBAC
- Validação em cliente + servidor
- Soft delete (arquivo em collection separada)
- Auditoria em /stores/{storeId}/alertHistory

---

## 📚 Documentação Requerida

Para cada FASE concluída:
- README em português com explicação do algoritmo
- Exemplos de uso (código TypeScript)
- Testes Vitest com coverage >80%
- Schema Firestore com índices recomendados
- Próximos passos e pontos de integração

---

## ✅ Checklist de Qualidade

Antes de fazer commit:
- [ ] Código em português (comentários, mensagens)
- [ ] Testes Vitest executam com sucesso
- [ ] Coverage >80% (instruções críticas)
- [ ] Sem erros TypeScript (`tsc --noEmit`)
- [ ] Responsivo (desktop + mobile)
- [ ] Dark mode funciona
- [ ] Git commit message em português descreve as mudanças
- [ ] README ou documentação atualizada

---

## 🚀 Próximas Etapas

1. FASE 3: Módulo de Vendas Básico (integra FASE 1 + 2)
2. FASE 4: Automação (Cloud Functions, Cron jobs)
3. Integração WhatsApp/Email para alertas
4. Dashboard executivo com KPIs

---

**Última atualização**: 2026-08-29  
**Responsável**: Claude Code Agent (precocerto-stage-1-xsicob)
