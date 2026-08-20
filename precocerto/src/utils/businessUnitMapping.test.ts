import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUSINESS_GROUP_ID,
  DEFAULT_BUSINESS_GROUP_NAME,
  getDefaultBusinessSegmentForStoreType,
  getDefaultModuleForStoreType,
  getOperationalUnitRules,
  getOperationalUnitLabel,
  getStoreBusinessSegmentLabel,
  getStoreModuleId,
  getStoreOperationalUnitLabel,
  getStoreOperationalRules,
  getStoreTypeLabel,
  isNavigationAllowedForUnit,
  normalizeStoreBusinessScope,
} from "./businessUnitMapping";

describe("businessUnitMapping", () => {
  it("mapeia tipos de unidade para modulos operacionais", () => {
    expect(getDefaultModuleForStoreType("farmacia")).toBe("farmacia");
    expect(getDefaultModuleForStoreType("colegio")).toBe("colegio");
    expect(getDefaultModuleForStoreType("papelaria_informatica")).toBe("papelaria_informatica");
    expect(getDefaultModuleForStoreType("ortopedico_hospitalar")).toBe("ortopedico_hospitalar");
    expect(getDefaultModuleForStoreType("mobiliario_escolar_escritorio")).toBe("mobiliario_escolar_escritorio");
    expect(getDefaultModuleForStoreType("escritorio_central")).toBe("escritorio_central");
  });

  it("usa moduleId explicito da loja quando existir", () => {
    expect(getStoreModuleId({ tipo: "papelaria_informatica", moduleId: "informatica" })).toBe("informatica");
  });

  it("retorna rotulos profissionais para o seletor de lojas", () => {
    expect(getStoreTypeLabel("papelaria_informatica")).toBe("Papelaria & Informática");
    expect(getStoreTypeLabel("escritorio_central")).toBe("Escritório Central");
  });

  it("mapeia tipo antigo de loja para segmento de negocio", () => {
    expect(getDefaultBusinessSegmentForStoreType("farmacia").id).toBe("farmacias");
    expect(getDefaultBusinessSegmentForStoreType("colegio").id).toBe("escola_colegio");
    expect(getDefaultBusinessSegmentForStoreType("papelaria_informatica").id).toBe("papelaria_informatica");
  });

  it("resolve rotulos de segmento e unidade operacional", () => {
    expect(getStoreBusinessSegmentLabel({ tipo: "farmacia" })).toBe("Farmácias");
    expect(getStoreBusinessSegmentLabel({ tipo: "generico", businessSegmentName: "Oficina" })).toBe("Oficina");
    expect(getOperationalUnitLabel("armazem")).toBe("Armazém");
    expect(getStoreOperationalUnitLabel({ tipo: "escritorio_central" })).toBe("Escritório Central");
  });

  it("normaliza lojas existentes para o novo escopo multi-negocio", () => {
    const normalized = normalizeStoreBusinessScope({ tipo: "farmacia" });

    expect(normalized.businessGroupId).toBe(DEFAULT_BUSINESS_GROUP_ID);
    expect(normalized.businessGroupName).toBe(DEFAULT_BUSINESS_GROUP_NAME);
    expect(normalized.businessSegmentId).toBe("farmacias");
    expect(normalized.businessSegmentName).toBe("Farmácias");
    expect(normalized.unitType).toBe("farmacia");
    expect(normalized.moduleId).toBe("farmacia");
  });

  it("define regras operacionais diferentes por tipo de unidade", () => {
    expect(getOperationalUnitRules("armazem")).toMatchObject({
      canSell: false,
      canManageStock: true,
      canTransferStock: true,
      dashboardMode: "stock",
    });

    expect(getOperationalUnitRules("posto_venda")).toMatchObject({
      canSell: true,
      canManageProducts: false,
      requiresParentUnit: true,
      dashboardMode: "sales",
    });

    expect(getOperationalUnitRules("escritorio_central")).toMatchObject({
      canSell: false,
      canViewConsolidatedReports: true,
      dashboardMode: "administrative",
    });
  });

  it("filtra navegacao conforme regras da unidade", () => {
    expect(isNavigationAllowedForUnit("vendas", "armazem")).toBe(false);
    expect(isNavigationAllowedForUnit("vendas", "posto_venda")).toBe(true);
    expect(isNavigationAllowedForUnit("add-product", "posto_venda")).toBe(false);
    expect(isNavigationAllowedForUnit("edit-product", "posto_venda")).toBe(false);
    expect(isNavigationAllowedForUnit("batch-products", "posto_venda")).toBe(false);
    expect(isNavigationAllowedForUnit("products", "escritorio_central")).toBe(false);
    expect(isNavigationAllowedForUnit("reports", "escritorio_central")).toBe(true);
  });

  it("infere regras da unidade pelo tipo antigo quando unitType nao existe", () => {
    expect(getStoreOperationalRules({ tipo: "farmacia" }).canSell).toBe(true);
    expect(getStoreOperationalRules({ tipo: "escritorio_central" }).canSell).toBe(false);
  });
});
