import type { BusinessSettings } from "../types";
import type { SaleDocumentType } from "../types/sales";

export const saleDocumentLabels: Record<SaleDocumentType, string> = {
  internal_receipt: "Recibo interno",
  internal_invoice_receipt: "Fatura-recibo interna",
};

export const saleDocumentPrefixes: Record<SaleDocumentType, string> = {
  internal_receipt: "RC",
  internal_invoice_receipt: "FR",
};

export function getDefaultSaleDocumentType(settings?: BusinessSettings | null): SaleDocumentType {
  return settings?.segmentConfig?.salesDocumentMode === "invoice_receipt"
    ? "internal_invoice_receipt"
    : "internal_receipt";
}

export function getSaleDocumentLabel(documentType?: SaleDocumentType): string {
  return saleDocumentLabels[documentType || "internal_receipt"];
}

export function calculateChangeDue(total: number, amountPaid?: number): number {
  if (amountPaid === undefined || !Number.isFinite(amountPaid)) return 0;
  return Math.max(0, Math.round((amountPaid - total) * 100) / 100);
}

export function validatePaymentAmount(total: number, amountPaid?: number): string | null {
  if (amountPaid === undefined) return null;
  if (!Number.isFinite(amountPaid)) return "Informe um valor pago válido.";
  if (amountPaid < total) return "O valor pago não pode ser inferior ao total da venda.";
  return null;
}
