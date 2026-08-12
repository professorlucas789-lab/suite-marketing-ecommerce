import React, { useState, useEffect, useRef } from "react";
import { Product, BusinessSettings, PriceHistory } from "../types";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  doc, 
  writeBatch 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { calculateProductFields } from "../utils/pricing";
import { motion, AnimatePresence } from "motion/react";
import { 
  Database, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileSpreadsheet, 
  FileJson, 
  HelpCircle, 
  Trash2, 
  FileText, 
  RefreshCw, 
  Info, 
  AlertCircle 
} from "lucide-react";

interface BackupViewProps {
  products: Product[];
  settings: BusinessSettings | null;
  userId: string;
  onRefreshProducts?: () => void;
}

interface BackupLog {
  id?: string;
  userId: string;
  type: "export" | "import" | "restore";
  format: "json" | "csv";
  status: "success" | "failed";
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  createdAt: string;
  message: string;
}

interface CSVRowPreview {
  index: number;
  data: Partial<Product>;
  status: "ready" | "error" | "duplicate" | "warning";
  errors: string[];
  duplicateOf?: Product;
  resolution?: "ignore" | "update" | "new";
}

export default function BackupView({ products, settings, userId }: BackupViewProps) {
  // Activity logs from Firestore
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(true);

  // States for partial export
  const [exportScope, setExportScope] = useState<"all" | "products" | "history" | "settings">("all");
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Price history cached for exporting
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);

  // States for CSV Import
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [csvPreviews, setCSVPreviews] = useState<CSVRowPreview[]>([]);
  const [globalDuplicateResolution, setGlobalDuplicateResolution] = useState<"ignore" | "update" | "new">("ignore");
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for JSON Restore
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreMetadata, setRestoreMetadata] = useState<{
    exportedAt: string;
    productsCount: number;
    historyCount: number;
    settingsFound: boolean;
    companyName?: string;
    businessType?: string;
    userId?: string;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace" | "products" | "settings">("merge");
  const [showReplaceWarning, setShowReplaceWarning] = useState<boolean>(false);
  const [confirmReplaceText, setConfirmReplaceText] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // UI Toast helper locally for BackupView
  const [viewAlert, setViewAlert] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const triggerAlert = (message: string, type: "success" | "error" | "warning" = "success") => {
    setViewAlert({ message, type });
    setTimeout(() => setViewAlert(null), 5000);
  };

  // Fetch price history and backup logs in real-time
  useEffect(() => {
    if (!userId) return;

    setLogsLoading(true);

    // Logs query
    const qLogs = query(collection(db, "backupLogs"), where("userId", "==", userId));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const logList: BackupLog[] = [];
      snapshot.forEach((docSnap) => {
        logList.push({ id: docSnap.id, ...docSnap.data() } as BackupLog);
      });
      // Sort newest first
      logList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLogs(logList);
      setLogsLoading(false);
    }, (err) => {
      setLogsLoading(false);
      handleFirestoreError(err, OperationType.GET, "backupLogs");
    });

    // Price History query for exporting
    const qHistory = query(collection(db, "priceHistory"), where("userId", "==", userId));
    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      const historyList: PriceHistory[] = [];
      snapshot.forEach((docSnap) => {
        historyList.push({ id: docSnap.id, ...docSnap.data() } as PriceHistory);
      });
      setPriceHistory(historyList);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "priceHistory");
    });

    return () => {
      unsubscribeLogs();
      unsubscribeHistory();
    };
  }, [userId]);

  // Log function
  const createBackupLog = async (log: Omit<BackupLog, "userId" | "createdAt">) => {
    try {
      await addDoc(collection(db, "backupLogs"), {
        ...log,
        userId,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to write backup log: ", err);
    }
  };

  // Safe file size check (5MB limit)
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const isFileSizeValid = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      triggerAlert("O tamanho do ficheiro excede o limite máximo permitido (5MB).", "error");
      return false;
    }
    return true;
  };

  // 1. EXPORT ALL (COMPLETE BACKUP)
  const handleExportCompleteBackup = async () => {
    setIsExporting(true);
    try {
      const date = new Date();
      const YYYY = date.getFullYear();
      const MM = String(date.getMonth() + 1).padStart(2, "0");
      const DD = String(date.getDate()).padStart(2, "0");
      const HH = String(date.getHours()).padStart(2, "0");
      const mm = String(date.getMinutes()).padStart(2, "0");

      const backupObj = {
        app: "PrecoCerto",
        version: "1.0",
        exportedAt: date.toISOString(),
        userId: userId,
        businessSettings: settings ? {
          companyName: settings.companyName,
          businessType: settings.businessType,
          currency: settings.currency,
          country: settings.country,
          language: settings.language,
          primaryColor: settings.primaryColor,
          dateFormat: settings.dateFormat,
          numberFormat: settings.numberFormat,
          customCategories: settings.customCategories || []
        } : {},
        products: products.map(({ id, userId: pUser, ...p }) => p), // strip keys for clean transfer
        priceHistory: priceHistory.map(({ id, userId: hUser, ...h }) => h),
        customCategories: settings?.customCategories || [],
        preferences: {
          theme: localStorage.getItem("theme") || "light"
        }
      };

      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `precocerto-backup-${YYYY}-${MM}-${DD}-${HH}-${mm}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log success
      await createBackupLog({
        type: "export",
        format: "json",
        status: "success",
        totalRecords: products.length + priceHistory.length + 1,
        successfulRecords: products.length + priceHistory.length + 1,
        failedRecords: 0,
        message: "Backup completo exportado com sucesso em JSON."
      });

      triggerAlert("Backup completo gerado e descarregado!");
    } catch (err: any) {
      console.error(err);
      await createBackupLog({
        type: "export",
        format: "json",
        status: "failed",
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        message: `Falha na exportação do backup: ${err.message || err}`
      });
      triggerAlert("Erro ao exportar backup.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // 2. EXPORT PARCIAL
  const handleExportPartial = async () => {
    setIsExporting(true);
    try {
      const dateStr = new Date().toISOString().split("T")[0];
      let dataStr = "";
      let mimeType = "application/json";
      let extension = "json";

      if (exportFormat === "json") {
        let exportData: any = {};
        if (exportScope === "all") {
          exportData = {
            products: products.map(({ id, userId: pUser, ...p }) => p),
            priceHistory: priceHistory.map(({ id, userId: hUser, ...h }) => h),
            businessSettings: settings || {}
          };
        } else if (exportScope === "products") {
          exportData = products.map(({ id, userId: pUser, ...p }) => p);
        } else if (exportScope === "history") {
          exportData = priceHistory.map(({ id, userId: hUser, ...h }) => h);
        } else if (exportScope === "settings") {
          exportData = settings || {};
        }
        dataStr = JSON.stringify(exportData, null, 2);
      } else {
        // CSV Format
        mimeType = "text/csv;charset=utf-8;";
        extension = "csv";

        if (exportScope === "products") {
          const headers = [
            "nome", "categoria", "fornecedor", "custoCompra", "margemDesejada", "quantidadeComprada",
            "quantidadeVendida", "unidadeCompra", "unidadeVenda", "unidadesInternasPorEmbalagem",
            "custoTransporte", "custoEmbalagem", "outrosCustos", "publicidade", "comissao", "taxas",
            "combustivel", "validade", "lote", "principioAtivo", "dosagem", "laboratorio", "necessitaReceita"
          ];
          const csvRows = [headers.join(",")];
          for (const p of products) {
            const row = [
              p.nome,
              p.categoria,
              p.fornecedor || "",
              p.custoCompra,
              p.margemDesejada,
              p.quantidade !== undefined ? p.quantidade : 1,
              p.quantidadeVendida || 0,
              p.unidadeCompra || "unidade",
              p.unidadeVenda || "unidade",
              p.unidadesInternas !== undefined ? p.unidadesInternas : 1,
              p.custoTransporte || 0,
              p.custoEmbalagem || 0,
              p.outrosCustos || 0,
              p.custoPublicidade || 0,
              p.comissaoVenda || 0,
              p.impostoTaxa || 0,
              p.combustivel || 0,
              p.farmaciaDataValidade || "",
              p.farmaciaLote || "",
              p.farmaciaPrincipioAtivo || "",
              p.farmaciaDosagem || "",
              p.farmaciaLaboratorio || "",
              p.farmaciaNecessitaReceita || ""
            ];
            const escapedRow = row.map(val => {
              const s = String(val ?? "").replace(/"/g, '""');
              return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
            });
            csvRows.push(escapedRow.join(","));
          }
          dataStr = csvRows.join("\n");
        } else if (exportScope === "history") {
          const headers = [
            "Data", "Produto", "Categoria", "PrecoAnterior", "PrecoNovo", "CustoAnterior", "CustoNovo", "MargemAnterior", "MargemNova", "Motivo"
          ];
          const csvRows = [headers.join(",")];
          for (const h of priceHistory) {
            const row = [
              h.createdAt?.split("T")[0] || "",
              h.productName || "Produto",
              h.productCategory || "Sem Categoria",
              h.previousPrice || 0,
              h.newPrice || 0,
              h.previousCost || 0,
              h.newCost || 0,
              h.previousMargin || 0,
              h.newMargin || 0,
              h.changeReason || ""
            ];
            const escapedRow = row.map(val => {
              const s = String(val ?? "").replace(/"/g, '""');
              return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
            });
            csvRows.push(escapedRow.join(","));
          }
          dataStr = csvRows.join("\n");
        } else if (exportScope === "settings") {
          const headers = ["Chave", "Valor"];
          const csvRows = [headers.join(",")];
          if (settings) {
            const rows = [
              ["companyName", settings.companyName],
              ["businessType", settings.businessType],
              ["currency", settings.currency],
              ["country", settings.country],
              ["language", settings.language],
              ["primaryColor", settings.primaryColor],
              ["dateFormat", settings.dateFormat],
              ["numberFormat", settings.numberFormat],
              ["customCategories", (settings.customCategories || []).join(";")]
            ];
            rows.forEach(([k, v]) => {
              const sK = String(k).replace(/"/g, '""');
              const sV = String(v).replace(/"/g, '""');
              csvRows.push(`"${sK}","${sV}"`);
            });
          }
          dataStr = csvRows.join("\n");
        } else {
          // All to CSV is not practical in single CSV, export products
          triggerAlert("Exportação de 'Tudo' para CSV não é suportada diretamente. Escolha Produtos, Histórico ou use JSON.", "warning");
          setIsExporting(false);
          return;
        }
      }

      const blob = new Blob([dataStr], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `precocerto-export-${exportScope}-${dateStr}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log success
      await createBackupLog({
        type: "export",
        format: exportFormat,
        status: "success",
        totalRecords: exportScope === "all" ? products.length + priceHistory.length : (exportScope === "products" ? products.length : (exportScope === "history" ? priceHistory.length : 1)),
        successfulRecords: exportScope === "all" ? products.length + priceHistory.length : (exportScope === "products" ? products.length : (exportScope === "history" ? priceHistory.length : 1)),
        failedRecords: 0,
        message: `Exportação parcial (${exportScope}) em formato ${exportFormat.toUpperCase()} realizada.`
      });

      triggerAlert("Exportação parcial concluída com sucesso!");
    } catch (err: any) {
      console.error(err);
      triggerAlert("Falha na exportação parcial.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // 3. DOWNLOAD CSV MODEL
  const handleDownloadCSVModel = () => {
    const headers = [
      "nome", "categoria", "fornecedor", "custoCompra", "margemDesejada", "quantidadeComprada",
      "quantidadeVendida", "unidadeCompra", "unidadeVenda", "unidadesInternasPorEmbalagem",
      "custoTransporte", "custoEmbalagem", "outrosCustos", "publicidade", "comissao", "taxas",
      "combustivel", "validade", "lote", "principioAtivo", "dosagem", "laboratorio", "necessitaReceita"
    ];
    const sampleRow = [
      "Paracetamol", "Medicamentos", "Delta Lab", "1500", "45", "100", "10", "caixa", "comprimido", "20",
      "200", "50", "0", "150", "0", "5", "50", "2027-12-31", "LT9988", "Paracetamol", "500mg", "Delta Lda", "não"
    ];
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_precocerto.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 4. PARSE CSV AND PREVIEW
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isFileSizeValid(file)) {
      e.target.value = "";
      return;
    }

    if (!file.name.endsWith(".csv")) {
      triggerAlert("O ficheiro deve ter a extensão .csv", "error");
      e.target.value = "";
      return;
    }

    setCSVFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseAndValidateCSV(text);
    };
    reader.readAsText(file);
  };

  const parseAndValidateCSV = (text: string) => {
    try {
      const parsedLines = parseCSV(text);
      if (parsedLines.length < 2) {
        triggerAlert("O arquivo CSV está vazio ou não possui linhas de dados.", "error");
        setCSVPreviews([]);
        return;
      }

      const headers = parsedLines[0].map(h => h.toLowerCase().trim());
      const rows = parsedLines.slice(1);

      // Identify header indexes
      const getIndex = (name: string) => headers.indexOf(name.toLowerCase());

      const previews: CSVRowPreview[] = rows.map((row, idx) => {
        const lineNum = idx + 2; // CSV is 1-indexed, headers is line 1
        const errors: string[] = [];

        // Helper to grab cell value by header name
        const getVal = (headerName: string): string => {
          const index = getIndex(headerName);
          return index !== -1 && index < row.length ? row[index].trim() : "";
        };

        const nome = getVal("nome");
        const categoria = getVal("categoria");
        const fornecedor = getVal("fornecedor");
        
        // Custo Compra
        const rawCusto = getVal("custoCompra");
        const custoCompra = rawCusto === "" ? 0 : parseFloat(rawCusto);

        // Margem Desejada
        const rawMargem = getVal("margemDesejada");
        const margemDesejada = rawMargem === "" ? 0 : parseFloat(rawMargem);

        // Quantidade Comprada
        const rawQtyComprada = getVal("quantidadeComprada");
        const quantidadeComprada = rawQtyComprada === "" ? 1 : parseFloat(rawQtyComprada);

        // Quantidade Vendida
        const rawQtyVendida = getVal("quantidadeVendida");
        const quantidadeVendida = rawQtyVendida === "" ? 0 : parseFloat(rawQtyVendida);

        // Validate mandatory columns
        if (!nome) errors.push(`Linha ${lineNum}: O nome do produto é obrigatório.`);
        if (!categoria) errors.push(`Linha ${lineNum}: A categoria é obrigatória.`);
        
        if (isNaN(custoCompra) || custoCompra < 0) {
          errors.push(`Linha ${lineNum}: custoCompra inválido. Deve ser maior ou igual a 0.`);
        }
        if (isNaN(margemDesejada) || margemDesejada <= 0 || margemDesejada >= 100) {
          errors.push(`Linha ${lineNum}: margemDesejada inválida. Deve estar entre 1% e 99%.`);
        }
        if (isNaN(quantidadeComprada) || quantidadeComprada <= 0) {
          errors.push(`Linha ${lineNum}: quantidadeComprada inválida. Deve ser maior que 0.`);
        }
        if (isNaN(quantidadeVendida) || quantidadeVendida < 0) {
          errors.push(`Linha ${lineNum}: quantidadeVendida inválida.`);
        } else if (quantidadeVendida > quantidadeComprada) {
          errors.push(`Linha ${lineNum}: quantidadeVendida (${quantidadeVendida}) não pode ser maior que quantidadeComprada (${quantidadeComprada}).`);
        }

        // Validade Date Format Check
        const validade = getVal("validade");
        if (validade) {
          const isDateValid = !isNaN(Date.parse(validade));
          if (!isDateValid) {
            errors.push(`Linha ${lineNum}: data de validade "${validade}" inválida. Utilize o formato YYYY-MM-DD.`);
          }
        }

        // Gather all other optional values
        const unidadeCompra = getVal("unidadeCompra") || "unidade";
        const unidadeVenda = getVal("unidadeVenda") || "unidade";
        const rawUnidadesInternas = getVal("unidadesInternasPorEmbalagem");
        const unidadesInternas = rawUnidadesInternas === "" ? 1 : (parseInt(rawUnidadesInternas) || 1);

        const custoTransporte = parseFloat(getVal("custoTransporte")) || 0;
        const custoEmbalagem = parseFloat(getVal("custoEmbalagem")) || 0;
        const outrosCustos = parseFloat(getVal("outrosCustos")) || 0;
        const publicidade = parseFloat(getVal("publicidade")) || 0;
        const comissao = parseFloat(getVal("comissao")) || 0;
        const taxas = parseFloat(getVal("taxas")) || 0;
        const combustivel = parseFloat(getVal("combustivel")) || 0;

        const lote = getVal("lote");
        const principioAtivo = getVal("principioAtivo");
        const dosagem = getVal("dosagem");
        const laboratorio = getVal("laboratorio");
        const necessitaReceita = getVal("necessitaReceita").toLowerCase();

        // Inferred types
        const isFarmacia = !!(principioAtivo || lote || validade || necessitaReceita);
        const tipoProduto = isFarmacia ? "medicamento/farmácia" : "produto comum";

        // Map into Product structure
        const prodData: Partial<Product> = {
          nome,
          categoria,
          fornecedor,
          custoCompra,
          margemDesejada,
          quantidade: quantidadeComprada,
          quantidadeDisponivel: quantidadeComprada - quantidadeVendida,
          quantidadeVendida,
          unidadeCompra,
          unidadeVenda,
          unidadesInternas,
          venderEmbalagemInteira: unidadesInternas <= 1,
          tipoProduto,
          custoTransporte,
          custoEmbalagem,
          outrosCustos,
          custoPublicidade: publicidade,
          comissaoVenda: comissao,
          impostoTaxa: taxas,
          combustivel,
          farmaciaLote: lote,
          farmaciaDataValidade: validade,
          farmaciaPrincipioAtivo: principioAtivo,
          farmaciaDosagem: dosagem,
          farmaciaLaboratorio: laboratorio,
          farmaciaNecessitaReceita: (necessitaReceita === "sim" || necessitaReceita === "não") ? necessitaReceita as "sim" | "não" : "não informado",
          observacoes: "Importado via CSV",
          custoTransporteTipo: "unidade",
          custoEmbalagemTipo: "unidade",
          outrosCustosTipo: "unidade",
          comissaoVendaTipo: "unidade",
          taxaBancariaTipo: "unidade",
          taxaMarketplaceTipo: "unidade",
          custoPublicidadeTipo: "unidade",
          custoEntregaTipo: "unidade",
          combustivelTipo: "unidade",
          impostoTaxaTipo: "unidade",
          perdasDesperdiciosTipo: "unidade",
          energiaTipo: "unidade",
          internetTipo: "unidade",
          rendaTipo: "unidade",
          salarioTipo: "unidade",
          aguaTipo: "unidade",
          contabilidadeTipo: "unidade",
          segurancaTipo: "unidade",
          outrosCustosFixosTipo: "unidade"
        };

        // If no errors, evaluate duplicate and compute financial pricing outputs
        let status: "ready" | "error" | "duplicate" | "warning" = errors.length > 0 ? "error" : "ready";
        let duplicateOf: Product | undefined;

        if (status === "ready") {
          // Check for duplicate
          duplicateOf = products.find(p => {
            const sameName = p.nome.toLowerCase().trim() === nome.toLowerCase().trim();
            const sameSupp = (p.fornecedor || "").toLowerCase().trim() === (fornecedor || "").toLowerCase().trim();
            const sameCat = p.categoria.toLowerCase().trim() === categoria.toLowerCase().trim();
            
            // Optional lot/expiry matching
            const sameLote = lote ? (p.farmaciaLote || "").trim() === lote.trim() : true;
            const sameVal = validade ? (p.farmaciaDataValidade || "").trim() === validade.trim() : true;

            return sameName && sameSupp && sameCat && sameLote && sameVal;
          });

          if (duplicateOf) {
            status = "duplicate";
          }
        }

        return {
          index: idx,
          data: prodData,
          status,
          errors,
          duplicateOf,
          resolution: status === "duplicate" ? "ignore" : undefined
        };
      });

      setCSVPreviews(previews);
    } catch (err: any) {
      console.error(err);
      triggerAlert("Falha ao analisar arquivo CSV. Verifique a estrutura.", "error");
      setCSVPreviews([]);
    }
  };

  const handleApplyResolutionToAll = (val: "ignore" | "update" | "new") => {
    setGlobalDuplicateResolution(val);
    setCSVPreviews(prev => prev.map(p => {
      if (p.status === "duplicate") {
        return { ...p, resolution: val };
      }
      return p;
    }));
  };

  const handleRowResolutionChange = (index: number, val: "ignore" | "update" | "new") => {
    setCSVPreviews(prev => prev.map(p => {
      if (p.index === index) {
        return { ...p, resolution: val };
      }
      return p;
    }));
  };

  // Run final import
  const handleConfirmCSVImport = async () => {
    if (csvPreviews.length === 0) return;
    setIsImporting(true);

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    try {
      const timestamp = new Date().toISOString();

      for (const preview of csvPreviews) {
        if (preview.status === "error") {
          failedCount++;
          continue;
        }

        const calculated = calculateProductFields(preview.data as any);
        const finalProduct = {
          ...preview.data,
          ...calculated,
          userId,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        if (preview.status === "duplicate") {
          const resolution = preview.resolution || globalDuplicateResolution;
          if (resolution === "ignore") {
            skippedCount++;
            continue;
          } else if (resolution === "update" && preview.duplicateOf?.id) {
            // Update existing Firestore product
            const docRef = doc(db, "products", preview.duplicateOf.id);
            await updateDoc(docRef, {
              ...finalProduct,
              createdAt: preview.duplicateOf.createdAt, // keep original
              updatedAt: timestamp
            });
            successCount++;
          } else {
            // Create as new
            await addDoc(collection(db, "products"), finalProduct);
            successCount++;
          }
        } else {
          // Standard insert
          await addDoc(collection(db, "products"), finalProduct);
          successCount++;
        }
      }

      // Write Log
      await createBackupLog({
        type: "import",
        format: "csv",
        status: successCount > 0 ? "success" : "failed",
        totalRecords: csvPreviews.length,
        successfulRecords: successCount,
        failedRecords: failedCount,
        message: `Importação de CSV concluída. ${successCount} produtos importados/atualizados, ${skippedCount} ignorados, ${failedCount} falhas devido a erros de validação.`
      });

      triggerAlert(`Importação concluída! Sucesso: ${successCount}, Pulados: ${skippedCount}, Erros: ${failedCount}`);
      
      // Clear CSV state
      setCSVFile(null);
      setCSVPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error(err);
      await createBackupLog({
        type: "import",
        format: "csv",
        status: "failed",
        totalRecords: csvPreviews.length,
        successfulRecords: 0,
        failedRecords: csvPreviews.length,
        message: `Erro na execução da importação: ${err.message || err}`
      });
      triggerAlert("Falha crítica ao gravar produtos importados.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  // 5. PARSE JSON RESTORE
  const handleJSONFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isFileSizeValid(file)) {
      e.target.value = "";
      return;
    }

    if (!file.name.endsWith(".json")) {
      triggerAlert("O arquivo de backup deve ter a extensão .json", "error");
      e.target.value = "";
      return;
    }

    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.app !== "PrecoCerto") {
          triggerAlert("O arquivo de backup selecionado não é um ficheiro válido do PreçoCerto.", "error");
          setRestoreFile(null);
          setRestoreMetadata(null);
          e.target.value = "";
          return;
        }

        setRestoreMetadata({
          exportedAt: json.exportedAt || "Não informada",
          productsCount: Array.isArray(json.products) ? json.products.length : 0,
          historyCount: Array.isArray(json.priceHistory) ? json.priceHistory.length : 0,
          settingsFound: !!json.businessSettings,
          companyName: json.businessSettings?.companyName,
          businessType: json.businessSettings?.businessType,
          userId: json.userId
        });
      } catch (err) {
        triggerAlert("Falha ao analisar o ficheiro JSON de backup.", "error");
        setRestoreFile(null);
        setRestoreMetadata(null);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Run Restore logic
  const handleRunRestore = async () => {
    if (!restoreFile || !restoreMetadata) return;

    if (restoreMode === "replace") {
      setShowReplaceWarning(true);
      return;
    }

    executeRestore();
  };

  const executeRestore = async () => {
    setIsRestoring(false);
    setShowReplaceWarning(false);
    setConfirmReplaceText("");
    setIsRestoring(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const json = JSON.parse(evt.target?.result as string);
          const timestamp = new Date().toISOString();
          
          let importProds = Array.isArray(json.products) ? json.products : [];
          let importHistories = Array.isArray(json.priceHistory) ? json.priceHistory : [];
          let importSettings = json.businessSettings || null;

          // Prevent importing with foreign userId. ALWAYS overwrite with current user
          importProds = importProds.map((p: any) => ({
            ...p,
            userId,
            // Fallback for compatibility under section 12
            unidadeCompra: p.unidadeCompra || "unidade",
            unidadeVenda: p.unidadeVenda || "unidade",
            unidadesInternas: p.unidadesInternas !== undefined ? p.unidadesInternas : 1,
            quantidade: p.quantidade !== undefined ? p.quantidade : 1,
            quantidadeVendida: p.quantidadeVendida || 0,
            quantidadeDisponivel: p.quantidadeDisponivel !== undefined ? p.quantidadeDisponivel : (p.quantidade || 1),
            tipoProduto: p.tipoProduto || "produto comum",
            createdAt: p.createdAt || timestamp,
            updatedAt: timestamp
          }));

          importHistories = importHistories.map((h: any) => ({
            ...h,
            userId,
            createdAt: h.createdAt || timestamp
          }));

          if (restoreMode === "replace") {
            // Delete all current products
            const productsSnap = await getDocs(query(collection(db, "products"), where("userId", "==", userId)));
            for (const docSnap of productsSnap.docs) {
              await deleteDoc(doc(db, "products", docSnap.id));
            }

            // Delete all history
            const historySnap = await getDocs(query(collection(db, "priceHistory"), where("userId", "==", userId)));
            for (const docSnap of historySnap.docs) {
              await deleteDoc(doc(db, "priceHistory", docSnap.id));
            }

            // Write backup settings if found, or update
            if (importSettings) {
              const settingsSnap = await getDocs(query(collection(db, "businessSettings"), where("userId", "==", userId)));
              if (!settingsSnap.empty) {
                await updateDoc(doc(db, "businessSettings", settingsSnap.docs[0].id), {
                  ...importSettings,
                  userId,
                  updatedAt: timestamp
                });
              } else {
                await addDoc(collection(db, "businessSettings"), {
                  ...importSettings,
                  userId,
                  createdAt: timestamp,
                  updatedAt: timestamp
                });
              }
            }

            // Insert new products
            for (const p of importProds) {
              await addDoc(collection(db, "products"), p);
            }

            // Insert new histories
            for (const h of importHistories) {
              await addDoc(collection(db, "priceHistory"), h);
            }

            await createBackupLog({
              type: "restore",
              format: "json",
              status: "success",
              totalRecords: importProds.length + importHistories.length,
              successfulRecords: importProds.length + importHistories.length,
              failedRecords: 0,
              message: "Restauro completo realizado (Modo: SUBSTITUIR). Todos os dados anteriores foram removidos."
            });

            triggerAlert("Dados restaurados e substituídos com sucesso!");
          } else if (restoreMode === "merge") {
            // Merge mode (skip duplicates, insert unique, merge settings categories)
            let prodsAdded = 0;
            let prodsSkipped = 0;

            for (const p of importProds) {
              const duplicate = products.find(existing => {
                return existing.nome.toLowerCase().trim() === p.nome.toLowerCase().trim() &&
                  existing.categoria.toLowerCase().trim() === p.categoria.toLowerCase().trim() &&
                  (existing.fornecedor || "").toLowerCase().trim() === (p.fornecedor || "").toLowerCase().trim();
              });

              if (duplicate) {
                prodsSkipped++;
                continue;
              }

              await addDoc(collection(db, "products"), p);
              prodsAdded++;
            }

            // Merge histories
            for (const h of importHistories) {
              await addDoc(collection(db, "priceHistory"), h);
            }

            // Merge settings categories
            if (importSettings && importSettings.customCategories && settings) {
              const combinedCats = Array.from(new Set([
                ...(settings.customCategories || []),
                ...importSettings.customCategories
              ]));
              const settingsSnap = await getDocs(query(collection(db, "businessSettings"), where("userId", "==", userId)));
              if (!settingsSnap.empty) {
                await updateDoc(doc(db, "businessSettings", settingsSnap.docs[0].id), {
                  customCategories: combinedCats,
                  updatedAt: timestamp
                });
              }
            }

            await createBackupLog({
              type: "restore",
              format: "json",
              status: "success",
              totalRecords: importProds.length + importHistories.length,
              successfulRecords: prodsAdded + importHistories.length,
              failedRecords: 0,
              message: `Restauro em modo MESCLAR finalizado. ${prodsAdded} produtos adicionados, ${prodsSkipped} duplicados ignorados.`
            });

            triggerAlert(`Restauro mesclado concluído! Produtos novos: ${prodsAdded}, Duplicados pulados: ${prodsSkipped}`);
          } else if (restoreMode === "products") {
            // Restore only products (merge strategy)
            let prodsAdded = 0;
            for (const p of importProds) {
              await addDoc(collection(db, "products"), p);
              prodsAdded++;
            }

            await createBackupLog({
              type: "restore",
              format: "json",
              status: "success",
              totalRecords: importProds.length,
              successfulRecords: prodsAdded,
              failedRecords: 0,
              message: `Restauro apenas de produtos realizado com sucesso. ${prodsAdded} inseridos.`
            });

            triggerAlert(`${prodsAdded} produtos restaurados com sucesso!`);
          } else if (restoreMode === "settings") {
            // Restore only settings
            if (importSettings) {
              const settingsSnap = await getDocs(query(collection(db, "businessSettings"), where("userId", "==", userId)));
              if (!settingsSnap.empty) {
                await updateDoc(doc(db, "businessSettings", settingsSnap.docs[0].id), {
                  ...importSettings,
                  userId,
                  updatedAt: timestamp
                });
              } else {
                await addDoc(collection(db, "businessSettings"), {
                  ...importSettings,
                  userId,
                  createdAt: timestamp,
                  updatedAt: timestamp
                });
              }

              await createBackupLog({
                type: "restore",
                format: "json",
                status: "success",
                totalRecords: 1,
                successfulRecords: 1,
                failedRecords: 0,
                message: "Restauro apenas de configurações de negócio efetuado."
              });

              triggerAlert("Configurações do negócio restauradas com sucesso!");
            } else {
              triggerAlert("Nenhuma configuração encontrada no ficheiro de backup.", "warning");
            }
          }

          // Reset restore view
          setRestoreFile(null);
          setRestoreMetadata(null);
          if (jsonInputRef.current) jsonInputRef.current.value = "";
        } catch (err: any) {
          console.error(err);
          triggerAlert("Falha ao restaurar dados do backup.", "error");
        } finally {
          setIsRestoring(false);
        }
      };
      reader.readAsText(restoreFile);
    } catch (err: any) {
      console.error(err);
      setIsRestoring(false);
      triggerAlert("Falha crítica no ficheiro de backup.", "error");
    }
  };

  // CSV parsing core function
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = "";
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentVal.trim());
        lines.push(row);
        row = [];
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      lines.push(row);
    }
    return lines.filter(l => l.length > 1 || (l.length === 1 && l[0] !== ""));
  };

  return (
    <div id="backup-view-root" className="flex flex-col gap-6">
      
      {/* Dynamic View Toast Alert */}
      <AnimatePresence>
        {viewAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl flex items-center gap-3 border text-xs font-semibold shadow-xs ${
              viewAlert.type === "success" 
                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/40" 
                : viewAlert.type === "error"
                  ? "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/40"
                  : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/40"
            }`}
          >
            {viewAlert.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>{viewAlert.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <Database className="text-emerald-500" />
            Backup e Gestão de Dados
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Proteja, exporte, importe ou restaure os dados comerciais e de precificação de forma privada e segura.
          </p>
        </div>
      </div>

      {/* Main cards layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. EXPORT BLOCK */}
        <div id="export-backup-card" className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Download size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">1. Exportar Dados</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Descarregue os seus dados em JSON ou CSV.</p>
              </div>
            </div>

            {/* Quick full backup */}
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-950/30 rounded-xl mb-5">
              <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                <Database size={12} />
                Backup Completo (Recomendado)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Gera um arquivo JSON contendo todas as configurações, produtos, categorias e históricos do utilizador.
              </p>
              <button
                id="full-backup-btn"
                onClick={handleExportCompleteBackup}
                disabled={isExporting}
                className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isExporting ? "A Exportar..." : "Descarregar Backup Completo"}
              </button>
            </div>

            {/* Custom partial export */}
            <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Exportação Personalizada</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">DADOS A EXPORTAR</label>
                  <select
                    id="export-scope-select"
                    value={exportScope}
                    onChange={(e: any) => setExportScope(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
                  >
                    <option value="all">Tudo (Produtos, Histórico, Configurações)</option>
                    <option value="products">Produtos</option>
                    <option value="history">Histórico de Alterações</option>
                    <option value="settings">Configurações Comerciais</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">FORMATO DO FICHEIRO</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportFormat("json")}
                      className={`py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                        exportFormat === "json"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                          : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <FileJson size={12} />
                      JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat("csv")}
                      className={`py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                        exportFormat === "csv"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                          : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <FileSpreadsheet size={12} />
                      CSV (Excel/Sheets)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            id="partial-export-btn"
            onClick={handleExportPartial}
            disabled={isExporting}
            className="mt-6 w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? "A Exportar..." : "Exportar Seleção"}
          </button>
        </div>

        {/* 2. IMPORT BLOCK */}
        <div id="import-data-card" className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Upload size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">2. Importar Produtos (CSV)</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Adicione produtos em massa usando ficheiro CSV.</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Mapeie os seus produtos num ficheiro CSV seguindo a estrutura padrão do sistema. O sistema efetuará todos os cálculos financeiros automaticamente no momento da importação.
            </p>

            <button
              id="download-model-btn"
              onClick={handleDownloadCSVModel}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200/50 dark:border-indigo-800/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mb-5"
            >
              <FileText size={14} />
              Descarregar Modelo CSV
            </button>

            {/* CSV selector */}
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
              <input
                type="file"
                id="csv-file-selector"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleCSVFileChange}
                className="hidden"
              />
              <label htmlFor="csv-file-selector" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload size={22} className="text-slate-400 dark:text-slate-600" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {csvFile ? csvFile.name : "Selecionar Ficheiro CSV"}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">
                  Extensão .csv permitida até 5MB
                </span>
              </label>
            </div>
          </div>

          {csvPreviews.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total: {csvPreviews.length} registros</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  csvPreviews.some(p => p.status === "error") ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                }`}>
                  {csvPreviews.filter(p => p.status === "error").length} Erros
                </span>
              </div>

              {/* Duplicate Handling Option */}
              {csvPreviews.some(p => p.status === "duplicate") && (
                <div className="bg-amber-50/70 dark:bg-amber-950/10 border border-amber-200/40 p-3 rounded-lg mb-4">
                  <h4 className="text-[10px] font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={11} />
                    Duplicados Detectados
                  </h4>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 mb-2">
                    Alguns produtos já existem. Escolha a ação de resolução:
                  </p>
                  <select
                    id="duplicate-resolution-select"
                    value={globalDuplicateResolution}
                    onChange={(e: any) => handleApplyResolutionToAll(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1.5 rounded-md text-[10px] focus:ring-1 focus:ring-emerald-500 outline-hidden"
                  >
                    <option value="ignore">Ignorar (Não importar duplicados)</option>
                    <option value="update">Atualizar Existente (Substituir dados)</option>
                    <option value="new">Criar como Novo (Duplicar no sistema)</option>
                  </select>
                </div>
              )}

              <button
                id="execute-import-btn"
                onClick={handleConfirmCSVImport}
                disabled={isImporting || csvPreviews.length === 0}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isImporting ? "Importando..." : "Confirmar Importação"}
              </button>
            </div>
          )}
        </div>

        {/* 3. RESTORE BLOCK */}
        <div id="restore-backup-card" className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl">
                <RefreshCw size={18} className="animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">3. Restaurar Backup (JSON)</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Restaure configurações e produtos de backup.</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Carregue um arquivo JSON de backup completo anteriormente exportado do PreçoCerto para restaurar o estado da sua aplicação.
            </p>

            {/* JSON file upload */}
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all mb-4">
              <input
                type="file"
                id="json-file-selector"
                ref={jsonInputRef}
                accept=".json"
                onChange={handleJSONFileChange}
                className="hidden"
              />
              <label htmlFor="json-file-selector" className="cursor-pointer flex flex-col items-center gap-2">
                <FileJson size={22} className="text-slate-400 dark:text-slate-600" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {restoreFile ? restoreFile.name : "Selecionar Backup JSON"}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">
                  Ficheiro de backup precocerto-backup-*.json
                </span>
              </label>
            </div>

            {restoreMetadata && (
              <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                {/* Metadata preview */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg text-[10px] text-slate-600 dark:text-slate-400 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Data de Exportação:</span>
                    <span>{new Date(restoreMetadata.exportedAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Produtos no Ficheiro:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{restoreMetadata.productsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Histórico no Ficheiro:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{restoreMetadata.historyCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Empresa / Negócio:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{restoreMetadata.companyName || "Padrão"}</span>
                  </div>
                </div>

                {/* Restoration Options */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1.5">MODO DE RESTAURO</label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="restoreMode"
                        value="merge"
                        checked={restoreMode === "merge"}
                        onChange={() => setRestoreMode("merge")}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500 h-3 w-3"
                      />
                      <div>
                        <span className="font-bold text-[11px] block text-slate-800 dark:text-slate-200">Mesclar com dados atuais</span>
                        <span className="text-[9px] text-slate-400">Preserva dados existentes e adiciona registros do backup. Evita duplicar produtos iguais.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="restoreMode"
                        value="replace"
                        checked={restoreMode === "replace"}
                        onChange={() => setRestoreMode("replace")}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500 h-3 w-3"
                      />
                      <div>
                        <span className="font-bold text-[11px] block text-rose-600 dark:text-rose-400">Substituir dados atuais (Subscrever)</span>
                        <span className="text-[9px] text-slate-400">Apaga completamente todos os produtos e históricos atuais do utilizador antes de restaurar o backup.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="restoreMode"
                        value="products"
                        checked={restoreMode === "products"}
                        onChange={() => setRestoreMode("products")}
                        className="mt-0.5 text-slate-600 focus:ring-slate-500 h-3 w-3"
                      />
                      <div>
                        <span className="font-bold text-[11px] block text-slate-800 dark:text-slate-200">Restaurar apenas produtos</span>
                        <span className="text-[9px] text-slate-400">Ignora histórico de preços e configurações comerciais. Importa apenas os produtos.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="restoreMode"
                        value="settings"
                        checked={restoreMode === "settings"}
                        onChange={() => setRestoreMode("settings")}
                        className="mt-0.5 text-slate-600 focus:ring-slate-500 h-3 w-3"
                      />
                      <div>
                        <span className="font-bold text-[11px] block text-slate-800 dark:text-slate-200">Restaurar apenas configurações</span>
                        <span className="text-[9px] text-slate-400">Modifica as configurações comerciais (empresa, moeda, categorias) com base no backup.</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {restoreMetadata && (
            <button
              id="execute-restore-btn"
              onClick={handleRunRestore}
              disabled={isRestoring}
              className={`mt-6 w-full py-2 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                restoreMode === "replace" ? "bg-rose-600 hover:bg-rose-500" : "bg-violet-600 hover:bg-violet-500"
              }`}
            >
              {isRestoring ? "Restaurando..." : "Iniciar Restauração"}
            </button>
          )}
        </div>

      </div>

      {/* CSV IMPORT ERROR AND PREVIEW GRID TABLE (IF SELECTED) */}
      {csvPreviews.length > 0 && (
        <div id="csv-preview-details-container" className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
            <Info size={14} className="text-indigo-500" />
            Pré-visualização e Validação do Ficheiro CSV
          </h3>
          
          {/* Show full list of raw validation errors if any */}
          {csvPreviews.some(p => p.errors.length > 0) && (
            <div className="mb-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 p-4 rounded-xl text-[11px] text-rose-700 dark:text-rose-400 space-y-1">
              <h4 className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1 mb-1">
                <AlertCircle size={13} />
                Erros de Validação Identificados (As seguintes linhas com erros não serão importadas):
              </h4>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {csvPreviews.flatMap(p => p.errors).map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            </div>
          )}

          {/* Preview grid */}
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Linha</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Fornecedor</th>
                  <th className="py-2.5 px-3">Custo Un.</th>
                  <th className="py-2.5 px-3">Margem %</th>
                  <th className="py-2.5 px-3">Quantidade</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Resolução Duplicados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {csvPreviews.map((preview, i) => {
                  const lineNum = preview.index + 2;
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">#{lineNum}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-100">{preview.data.nome || "-"}</td>
                      <td className="py-2.5 px-3 text-slate-500">{preview.data.categoria || "-"}</td>
                      <td className="py-2.5 px-3 text-slate-500">{preview.data.fornecedor || "-"}</td>
                      <td className="py-2.5 px-3 font-mono">Kz {preview.data.custoCompra?.toLocaleString("pt-BR")}</td>
                      <td className="py-2.5 px-3 font-mono">{preview.data.margemDesejada}%</td>
                      <td className="py-2.5 px-3 font-mono">{preview.data.quantidade}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          preview.status === "error" 
                            ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400" 
                            : preview.status === "duplicate"
                              ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {preview.status === "error" ? "Erro" : preview.status === "duplicate" ? "Duplicado" : "Pronto para Importar"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {preview.status === "duplicate" ? (
                          <select
                            value={preview.resolution || globalDuplicateResolution}
                            onChange={(e: any) => handleRowResolutionChange(preview.index, e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-[10px]"
                          >
                            <option value="ignore">Ignorar</option>
                            <option value="update">Atualizar Existente</option>
                            <option value="new">Duplicar</option>
                          </select>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STRONG WARNING REPLACEMENT DIALOG (MODAL OVERLAY) */}
      <AnimatePresence>
        {showReplaceWarning && (
          <div id="replace-warning-modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-950/50 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-2 text-rose-600 mb-3">
                <AlertTriangle size={22} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirmação de Substituição Crítica</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                <strong>ATENÇÃO:</strong> Esta ação é irreversível. Todos os seus produtos, históricos de preços e dados atuais serão apagados completamente para dar lugar ao backup restaurado.
              </p>
              <div className="bg-rose-50 dark:bg-rose-950/20 p-3 rounded-lg border border-rose-100/50 dark:border-rose-900/40 text-[11px] text-rose-700 dark:text-rose-400 mb-4">
                Para confirmar a exclusão e substituição, escreva <strong>CONFIRMAR</strong> no campo abaixo.
              </div>
              <input
                type="text"
                value={confirmReplaceText}
                onChange={(e) => setConfirmReplaceText(e.target.value)}
                placeholder="CONFIRMAR"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs uppercase font-bold tracking-wider text-center focus:ring-1 focus:ring-rose-500 outline-hidden mb-4"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReplaceWarning(false);
                    setConfirmReplaceText("");
                  }}
                  className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={executeRestore}
                  disabled={confirmReplaceText !== "CONFIRMAR"}
                  className="py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  Confirmar e Substituir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BACKUP LOGS AUDIT TRAIL */}
      <div id="backup-logs-card" className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-1.5">
          <Clock size={14} className="text-emerald-500" />
          Histórico e Log de Atividades
        </h3>

        {logsLoading ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            Carregando log de atividades...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-100 dark:border-slate-800/80 rounded-xl">
            Nenhuma atividade de backup, importação ou restauração registrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3">Data e Hora</th>
                  <th className="py-2 px-3">Operação</th>
                  <th className="py-2 px-3">Formato</th>
                  <th className="py-2 px-3">Sucesso/Registros</th>
                  <th className="py-2 px-3">Mensagem</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {logs.slice(0, 15).map((log, i) => {
                  const dateFormatted = new Date(log.createdAt).toLocaleString("pt-BR");
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                      <td className="py-2 px-3 text-[10px] text-slate-400 font-mono shrink-0 whitespace-nowrap">{dateFormatted}</td>
                      <td className="py-2 px-3">
                        <span className="font-bold uppercase text-[10px] text-slate-800 dark:text-slate-200">
                          {log.type === "export" ? "Exportação" : log.type === "import" ? "Importação" : "Restauro"}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] uppercase text-slate-400">{log.format}</td>
                      <td className="py-2 px-3 text-[10px]">
                        {log.successfulRecords} / {log.totalRecords}
                      </td>
                      <td className="py-2 px-3 text-[10px] max-w-[300px] truncate" title={log.message}>{log.message}</td>
                      <td className="py-2 px-3 text-center shrink-0">
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          log.status === "success" 
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" 
                            : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                        }`}>
                          {log.status === "success" ? "Sucesso" : "Falha"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
