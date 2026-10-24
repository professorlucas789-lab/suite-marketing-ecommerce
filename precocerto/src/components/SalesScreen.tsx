import React, { useState } from "react";
import { Product } from "../types";
import SalesModule from "./SalesModule";
import { SalesHistory } from "./SalesHistory";

interface SalesScreenProps {
  products: Product[];
  onSaleComplete?: () => void;
}

/**
 * Ecrã de Vendas: registo da venda + histórico de recibos (onde se anula uma venda).
 * O histórico só carrega ao abrir; a chave muda a cada venda para o voltar a carregar
 * e o recibo novo aparecer logo, com o botão Anular.
 */
export default function SalesScreen({ products, onSaleComplete }: SalesScreenProps) {
  const [versaoHistorico, setVersaoHistorico] = useState(0);

  return (
    <div className="space-y-8">
      <SalesModule
        products={products}
        onSaleComplete={() => {
          setVersaoHistorico((v) => v + 1);
          onSaleComplete?.();
        }}
      />
      <SalesHistory key={versaoHistorico} />
    </div>
  );
}
