import type { PurchaseLine, PurchaseLineInput, PurchasePaymentStatus, Supplier, SupplierSummary } from '../types/purchasing';

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export function calculatePurchaseLineTotal(quantity: number, unitCost: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('A quantidade comprada deve ser maior que zero.');
  }

  if (!Number.isFinite(unitCost) || unitCost <= 0) {
    throw new Error('O custo unitário da compra deve ser maior que zero.');
  }

  return roundMoney(quantity * unitCost);
}

export function calculateWeightedAverageCost(
  currentStock: number,
  currentUnitCost: number,
  incomingQuantity: number,
  incomingUnitCost: number
): number {
  if (incomingQuantity <= 0) throw new Error('A quantidade recebida deve ser maior que zero.');
  if (incomingUnitCost <= 0) throw new Error('O custo recebido deve ser maior que zero.');

  const normalizedStock = Math.max(0, Number(currentStock) || 0);
  const normalizedCurrentCost = Math.max(0, Number(currentUnitCost) || 0);
  const totalQuantity = normalizedStock + incomingQuantity;

  if (totalQuantity <= 0) return roundMoney(incomingUnitCost);

  return roundMoney(((normalizedStock * normalizedCurrentCost) + (incomingQuantity * incomingUnitCost)) / totalQuantity);
}

export function calculatePurchaseTotal(lines: Array<Pick<PurchaseLineInput, 'quantity' | 'unitCost'>>): number {
  return roundMoney(lines.reduce((sum, line) => sum + calculatePurchaseLineTotal(line.quantity, line.unitCost), 0));
}

export function calculatePurchaseBalance(totalAmount: number, amountPaid: number | undefined, paymentStatus: PurchasePaymentStatus): number {
  const paid = paymentStatus === 'unpaid' ? 0 : roundMoney(amountPaid || 0);
  if (paid < 0) throw new Error('O valor pago não pode ser negativo.');
  if (paid > totalAmount) throw new Error('O valor pago não pode ser maior que o total da compra.');
  if (paymentStatus === 'paid' && paid < totalAmount) return 0;
  return roundMoney(Math.max(0, totalAmount - paid));
}

export function normalizePurchasePayment(totalAmount: number, amountPaid: number | undefined, paymentStatus: PurchasePaymentStatus): {
  amountPaid: number;
  balanceDue: number;
} {
  const paid = paymentStatus === 'paid'
    ? totalAmount
    : paymentStatus === 'unpaid'
      ? 0
      : roundMoney(amountPaid || 0);

  return {
    amountPaid: paid,
    balanceDue: calculatePurchaseBalance(totalAmount, paid, paymentStatus),
  };
}

export function buildSupplierSummary(suppliers: Supplier[]): SupplierSummary {
  return {
    totalSuppliers: suppliers.length,
    activeSuppliers: suppliers.filter((supplier) => supplier.status === 'active').length,
    suppliersWithDebt: suppliers.filter((supplier) => (supplier.currentPayable || 0) > 0).length,
    totalPayable: roundMoney(suppliers.reduce((sum, supplier) => sum + (supplier.currentPayable || 0), 0)),
  };
}

export function buildPurchaseLinesSummary(lines: PurchaseLine[]): {
  totalQuantity: number;
  totalAmount: number;
} {
  return {
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    totalAmount: roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0)),
  };
}
