import { describe, expect, it } from "vitest";
import type { BusinessSettings } from "../types";
import {
  calculateChangeDue,
  getDefaultSaleDocumentType,
  getSaleDocumentLabel,
  validatePaymentAmount,
} from "./salesDocumentUtils";

describe("salesDocumentUtils", () => {
  it("usa fatura-recibo interna quando o segmento exige invoice_receipt", () => {
    const settings = {
      segmentConfig: {
        salesDocumentMode: "invoice_receipt",
      },
    } as BusinessSettings;

    expect(getDefaultSaleDocumentType(settings)).toBe("internal_invoice_receipt");
  });

  it("usa recibo interno como padrao conservador", () => {
    expect(getDefaultSaleDocumentType(null)).toBe("internal_receipt");
    expect(getSaleDocumentLabel("internal_invoice_receipt")).toBe("Fatura-recibo interna");
  });

  it("calcula troco e valida pagamento insuficiente", () => {
    expect(calculateChangeDue(750, 1000)).toBe(250);
    expect(calculateChangeDue(750, 700)).toBe(0);
    expect(validatePaymentAmount(750, 700)).toContain("valor pago");
    expect(validatePaymentAmount(750, Number.NaN)).toContain("válido");
    expect(validatePaymentAmount(750, undefined)).toBeNull();
    expect(validatePaymentAmount(750, 750)).toBeNull();
  });
});
