import { describe, expect, it } from "vitest";
import { getDefaultModuleForStoreType, getStoreModuleId, getStoreTypeLabel } from "./businessUnitMapping";

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
});
