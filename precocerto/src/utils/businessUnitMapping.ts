import type { Store, StoreType } from "../types/store";

export type StoreTypeOption = {
  value: StoreType;
  label: string;
  descricao: string;
  defaultModuleId: string;
};

export const STORE_TYPE_OPTIONS: StoreTypeOption[] = [
  {
    value: "farmacia",
    label: "Farmácia",
    descricao: "Medicamentos, validades, receitas e margens farmacêuticas",
    defaultModuleId: "farmacia",
  },
  {
    value: "colegio",
    label: "Escola / Colégio Privado",
    descricao: "Gestão escolar, mensalidades, material e serviços educacionais",
    defaultModuleId: "colegio",
  },
  {
    value: "papelaria_informatica",
    label: "Papelaria & Informática",
    descricao: "Material escolar, escritório, consumíveis e equipamentos informáticos",
    defaultModuleId: "papelaria_informatica",
  },
  {
    value: "informatica",
    label: "Informática",
    descricao: "Computadores, periféricos, acessórios, software e garantias",
    defaultModuleId: "informatica",
  },
  {
    value: "ortopedico_hospitalar",
    label: "Ortopédicos & Equip. Hospitalares",
    descricao: "Consumíveis ortopédicos, equipamentos hospitalares e dispositivos médicos",
    defaultModuleId: "ortopedico_hospitalar",
  },
  {
    value: "ortopedico",
    label: "Ortopédico",
    descricao: "Loja de material ortopédico",
    defaultModuleId: "ortopedico_hospitalar",
  },
  {
    value: "mobiliario_escolar_escritorio",
    label: "Mobiliário Escolar & Escritório",
    descricao: "Carteiras, cadeiras, armários, mesas e mobiliário administrativo",
    defaultModuleId: "mobiliario_escolar_escritorio",
  },
  {
    value: "escritorio_central",
    label: "Escritório Central",
    descricao: "Administração do grupo e visão consolidada dos negócios",
    defaultModuleId: "escritorio_central",
  },
  {
    value: "generico",
    label: "Genérico",
    descricao: "Outro tipo de loja ou negócio ainda não especializado",
    defaultModuleId: "outro",
  },
];

export function getDefaultModuleForStoreType(type?: string): string {
  return STORE_TYPE_OPTIONS.find((option) => option.value === type)?.defaultModuleId || "outro";
}

export function getStoreTypeLabel(type?: string): string {
  return STORE_TYPE_OPTIONS.find((option) => option.value === type)?.label || type || "Genérico";
}

export function getStoreModuleId(store?: Pick<Store, "tipo" | "moduleId"> | null): string {
  return store?.moduleId || getDefaultModuleForStoreType(store?.tipo);
}
