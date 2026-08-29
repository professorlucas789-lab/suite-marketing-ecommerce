import React, { useState } from "react";
import { ChevronDown, Receipt, FileText, Truck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type DocumentCategory = "faturacao" | "retificacao" | "informativo" | "transporte";
export type DocumentType =
  | "fatura"
  | "fatura-pro-forma"
  | "fatura-recibo"
  | "nota-credito"
  | "orcamento"
  | "encomenda"
  | "guia-transporte"
  | "guia-remessa";

interface DocumentGroup {
  category: DocumentCategory;
  label: string;
  icon: React.ReactNode;
  documents: {
    type: DocumentType;
    label: string;
    description: string;
  }[];
}

const DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    category: "faturacao",
    label: "Faturação",
    icon: <Receipt className="w-4 h-4" />,
    documents: [
      {
        type: "fatura",
        label: "Fatura",
        description: "Fatura completa com INSS",
      },
      {
        type: "fatura-pro-forma",
        label: "Fatura Pró-Forma",
        description: "Cotação com valores indicativos",
      },
      {
        type: "fatura-recibo",
        label: "Fatura Recibo",
        description: "Fatura com comprovativo de pagamento",
      },
    ],
  },
  {
    category: "retificacao",
    label: "Retificação",
    icon: <FileText className="w-4 h-4" />,
    documents: [
      {
        type: "nota-credito",
        label: "Nota de Crédito",
        description: "Devolução ou ajuste de fatura",
      },
    ],
  },
  {
    category: "informativo",
    label: "Informativo",
    icon: <FileText className="w-4 h-4" />,
    documents: [
      {
        type: "orcamento",
        label: "Orçamento",
        description: "Proposta de venda não vinculativo",
      },
      {
        type: "encomenda",
        label: "Encomenda",
        description: "Registo de encomenda do cliente",
      },
    ],
  },
  {
    category: "transporte",
    label: "Transporte",
    icon: <Truck className="w-4 h-4" />,
    documents: [
      {
        type: "guia-transporte",
        label: "Guia de Transporte",
        description: "Autorização de transporte de bens",
      },
      {
        type: "guia-remessa",
        label: "Guia de Remessa",
        description: "Comprovativo de remessa de bens",
      },
    ],
  },
];

interface DocumentTypeSelectorProps {
  selectedDocument: DocumentType;
  onDocumentChange: (docType: DocumentType) => void;
}

export default function DocumentTypeSelector({
  selectedDocument,
  onDocumentChange,
}: DocumentTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedGroup = DOCUMENT_GROUPS.find((group) =>
    group.documents.some((doc) => doc.type === selectedDocument)
  );

  const selectedDoc = selectedGroup?.documents.find(
    (doc) => doc.type === selectedDocument
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-white text-sm font-medium transition-colors"
      >
        <FileText className="w-4 h-4" />
        <span className="hidden sm:inline">Alterar</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50"
          >
            <div className="max-h-96 overflow-y-auto">
              {DOCUMENT_GROUPS.map((group) => (
                <div key={group.category} className="border-b border-slate-700 last:border-b-0">
                  <div className="px-4 py-2 flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-900/50">
                    {group.icon}
                    {group.label}
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {group.documents.map((doc) => (
                      <button
                        key={doc.type}
                        onClick={() => {
                          onDocumentChange(doc.type);
                          setIsOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                          selectedDocument === doc.type
                            ? "bg-emerald-500/20 border-l-2 border-emerald-500"
                            : "hover:bg-slate-700/50"
                        }`}
                      >
                        <div className="font-medium text-white">{doc.label}</div>
                        <div className="text-xs text-slate-400">{doc.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Display selected document type as chip */}
      {selectedDoc && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-2 inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded text-xs font-medium text-emerald-400"
        >
          {selectedDoc.label}
        </motion.div>
      )}
    </div>
  );
}
