/**
 * Aviso de acesso restrito.
 *
 * Antes, um menu sem permissão simplesmente não existia na barra lateral: o
 * utilizador via um conjunto de menus mais pequeno do que esperava e não tinha
 * qualquer forma de perceber porquê. Agora o menu continua visível (bloqueado)
 * e clicá-lo mostra esta página, que explica o papel atual, o papel necessário
 * e os passos concretos para resolver.
 */

import { Lock, ShieldAlert, Stethoscope } from "lucide-react";
import type { UserRole } from "../types/store";

interface RestrictedAccessNoticeProps {
  /** Nome do menu que o utilizador tentou abrir. */
  label: string;
  /** Papéis que podem abrir este menu. */
  requiredRoles: UserRole[];
  /** Papel atual do utilizador (null quando não pôde ser determinado). */
  currentRole: UserRole | null;
  /** UID do utilizador, para indicar o documento exato a corrigir. */
  uid?: string;
  /** Abre a página de Diagnóstico. */
  onOpenDiagnostics: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  "loja-manager": "Gerente de Loja",
  funcionario: "Funcionário",
};

const describeRole = (role: UserRole | null) =>
  role ? ROLE_LABELS[role] ?? role : "por determinar";

export function RestrictedAccessNotice({
  label,
  requiredRoles,
  currentRole,
  uid,
  onOpenDiagnostics,
}: RestrictedAccessNoticeProps) {
  const required = requiredRoles.map(describeRole).join(" ou ");

  return (
    <div
      id="restricted-access-notice"
      className="max-w-xl mx-auto my-10 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
          <Lock size={18} className="text-amber-600 dark:text-amber-400" />
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            "{label}" requer outras permissões
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Este menu existe e está a funcionar, mas só pode ser aberto por{" "}
            <strong className="text-slate-700 dark:text-slate-200">{required}</strong>. O
            seu papel atual é{" "}
            <strong className="text-slate-700 dark:text-slate-200">
              {describeRole(currentRole)}
            </strong>
            .
          </p>

          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldAlert size={13} className="text-slate-400" />
              Como obter acesso
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Contas novas são criadas com o papel <code className="px-1 rounded bg-slate-200/70 dark:bg-slate-700/70">funcionario</code>.
              Um administrador tem de alterar o campo <code className="px-1 rounded bg-slate-200/70 dark:bg-slate-700/70">papel</code> no
              Firebase Console:
            </p>
            <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-2 break-words">
              Firestore → users → {uid || "{o seu uid}"} → papel = "admin"
            </p>
          </div>

          <button
            id="restricted-open-diagnostics-btn"
            onClick={onOpenDiagnostics}
            className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
          >
            <Stethoscope size={14} />
            Abrir Diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
}

export default RestrictedAccessNotice;
