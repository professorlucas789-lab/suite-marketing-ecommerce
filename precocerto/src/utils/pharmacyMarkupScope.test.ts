import { describe, expect, it } from "vitest";
import type { Store } from "../types/store";
import {
  canApplyMarkupToAllPharmacies,
  getActivePharmacyStores,
  isPharmacyStore,
} from "./pharmacyMarkupScope";

const stores: Store[] = [
  {
    id: "farmacia-1",
    nome: "Farmacia Zango",
    tipo: "farmacia",
    endereco: "Zango",
    telefone: "900000001",
    email: "zango@example.com",
    ativo: true,
    dataCriacao: "2026-08-20T00:00:00.000Z",
    dataAtualizacao: "2026-08-20T00:00:00.000Z",
    criadoPor: "admin",
  },
  {
    id: "farmacia-2",
    nome: "Farmacia Viana",
    tipo: "farmacia",
    endereco: "Viana",
    telefone: "900000002",
    email: "viana@example.com",
    ativo: true,
    dataCriacao: "2026-08-20T00:00:00.000Z",
    dataAtualizacao: "2026-08-20T00:00:00.000Z",
    criadoPor: "admin",
  },
  {
    id: "informatica-1",
    nome: "Loja Informatica",
    tipo: "informatica",
    endereco: "Luanda",
    telefone: "900000003",
    email: "info@example.com",
    ativo: true,
    dataCriacao: "2026-08-20T00:00:00.000Z",
    dataAtualizacao: "2026-08-20T00:00:00.000Z",
    criadoPor: "admin",
  },
];

describe("pharmacyMarkupScope", () => {
  it("identifica apenas lojas do tipo farmacia", () => {
    expect(isPharmacyStore(stores[0])).toBe(true);
    expect(isPharmacyStore(stores[2])).toBe(false);
  });

  it("filtra apenas farmacias ativas", () => {
    const inactiveStore = { ...stores[1], ativo: false };

    expect(getActivePharmacyStores([stores[0], inactiveStore, stores[2]])).toEqual([stores[0]]);
  });

  it("permite aplicar a todas as farmacias somente para admin em uma farmacia", () => {
    expect(
      canApplyMarkupToAllPharmacies({
        role: "admin",
        currentStoreType: "farmacia",
        stores,
      })
    ).toBe(true);

    expect(
      canApplyMarkupToAllPharmacies({
        role: "loja-manager",
        currentStoreType: "farmacia",
        stores,
      })
    ).toBe(false);

    expect(
      canApplyMarkupToAllPharmacies({
        role: "admin",
        currentStoreType: "informatica",
        stores,
      })
    ).toBe(false);
  });
});
