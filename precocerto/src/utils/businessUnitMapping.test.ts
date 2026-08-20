import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUSINESS_GROUP_ID,
  DEFAULT_BUSINESS_GROUP_NAME,
  getDefaultBusinessSegmentForStoreType,
  getDefaultModuleForStoreType,
  getOperationalUnitLabel,
  getStoreBusinessSegmentLabel,
  getStoreModuleId,
  getStoreOperationalUnitLabel,
  getStoreTypeLabel,
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
});
