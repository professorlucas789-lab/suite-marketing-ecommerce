/**
 * Utilidades de Cores Centralizadas
 * Define mapeamento consistente de cores Tailwind para valores hex
 * NOVO: Sistema de cores dinâmicas para garantir consistência
 */

// Mapa de cores Tailwind para valores hex
export const COLOR_MAP: Record<string, string> = {
  "emerald-600": "#059669",
  "blue-600": "#2563eb",
  "amber-600": "#d97706",
  "pink-600": "#db2777",
  "purple-600": "#9333ea",
  "teal-600": "#0d9488",
  "cyan-600": "#0891b2",
  "orange-600": "#ea580c",
  "red-600": "#dc2626",
  "slate-600": "#475569"
};

// Cores disponíveis para o utilizador escolher
export const AVAILABLE_COLORS = [
  { name: "Esmeralda", value: "emerald-600", hex: "#059669" },
  { name: "Azul", value: "blue-600", hex: "#2563eb" },
  { name: "Âmbar", value: "amber-600", hex: "#d97706" },
  { name: "Rosa", value: "pink-600", hex: "#db2777" },
  { name: "Roxo", value: "purple-600", hex: "#9333ea" },
  { name: "Turquesa", value: "teal-600", hex: "#0d9488" },
  { name: "Ciano", value: "cyan-600", hex: "#0891b2" },
  { name: "Laranja", value: "orange-600", hex: "#ea580c" },
  { name: "Carmesim", value: "red-600", hex: "#dc2626" },
  { name: "Cinza Slate", value: "slate-600", hex: "#475569" }
];

/**
 * Converter nome de cor Tailwind para valor hex
 */
export function getTailwindColorHex(colorName: string): string {
  return COLOR_MAP[colorName] || COLOR_MAP["emerald-600"];
}

/**
 * Obter classe Tailwind para um tipo de botão com a cor primária
 * @param colorName Nome da cor Tailwind (ex: "emerald-600")
 * @param type Tipo de botão: 'primary', 'secondary', 'danger', 'success'
 */
export function getPrimaryButtonClass(colorName: string, type: 'primary' | 'secondary' | 'danger' | 'success' = 'primary'): string {
  // Para manter compatibilidade, retorna a classe com a cor primária
  // O sistema de cores dinâmicas será aplicado via CSS variables

  switch (type) {
    case 'primary':
      return `bg-${colorName} hover:bg-${colorName} disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors`;
    case 'secondary':
      return `bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium rounded-lg transition-colors`;
    case 'danger':
      return `bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors`;
    case 'success':
      return `bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors`;
    default:
      return `bg-${colorName} hover:bg-${colorName} text-white font-medium rounded-lg transition-colors`;
  }
}

/**
 * Injetar variáveis CSS dinâmicas para cores
 * Chama esta função no App.tsx para aplicar as cores dinâmicas globalmente
 */
export function injectPrimaryColorCSS(colorHex: string): void {
  if (typeof document === 'undefined') return;

  const style = document.getElementById('primary-color-css') || document.createElement('style');
  style.id = 'primary-color-css';

  style.innerHTML = `
    :root {
      --color-primary: ${colorHex};
      --color-primary-50: ${adjustColorBrightness(colorHex, 0.95)};
      --color-primary-100: ${adjustColorBrightness(colorHex, 0.90)};
      --color-primary-200: ${adjustColorBrightness(colorHex, 0.80)};
      --color-primary-300: ${adjustColorBrightness(colorHex, 0.70)};
      --color-primary-400: ${adjustColorBrightness(colorHex, 0.60)};
      --color-primary-500: ${colorHex};
      --color-primary-600: ${colorHex};
      --color-primary-700: ${adjustColorBrightness(colorHex, 0.85)};
      --color-primary-800: ${adjustColorBrightness(colorHex, 0.75)};
      --color-primary-900: ${adjustColorBrightness(colorHex, 0.60)};
    }
  `;

  if (!document.getElementById('primary-color-css')) {
    document.head.appendChild(style);
  }
}

/**
 * Ajustar o brilho de uma cor hex
 * @param hex Cor em formato hex (ex: "#059669")
 * @param factor Fator de brilho (0.5 = 50% mais escuro, 1.5 = 50% mais claro)
 */
function adjustColorBrightness(hex: string, factor: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * (factor - 1) * 100);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;

  return "#" + (0x1000000 + (Math.max(0, Math.min(255, R)) * 0x10000) +
    (Math.max(0, Math.min(255, G)) * 0x100) +
    Math.max(0, Math.min(255, B)))
    .toString(16).slice(1);
}

/**
 * Validar se um nome de cor é válido
 */
export function isValidColorName(colorName: string): boolean {
  return colorName in COLOR_MAP;
}

/**
 * Obter lista de nomes de cores disponíveis
 */
export function getAvailableColorNames(): string[] {
  return Object.keys(COLOR_MAP);
}
