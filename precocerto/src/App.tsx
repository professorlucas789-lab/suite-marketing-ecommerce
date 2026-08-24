import React, { useState, useEffect, Suspense } from "react";
import {
  onAuthStateChanged,
  signOut,
  User
} from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { Product, ActiveTab, BusinessSettings } from "./types";
import { motion, AnimatePresence } from "motion/react";

// Components
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";
import ProductList from "./components/ProductList";
import ProductForm from "./components/ProductForm";
import ReverseCalculator from "./components/ReverseCalculator";
import BusinessSettingsView from "./components/BusinessSettingsView";
import GeneralHistoryView from "./components/GeneralHistoryView";
import BackupView from "./components/BackupView";
import { buildInfo } from "./buildInfo";
import { CategoriesTab } from "./components/CategoriesTab"; // NOVO (Fase 1)
import { ImportCSVModal } from "./components/ImportCSVModal"; // NOVO (Fase 5A)
import { ExportExcelButton } from "./components/ExportExcelButton"; // NOVO (Fase 5A)
import { ReportBuilder, ReportConfig } from "./components/ReportBuilder"; // NOVO (Fase 5B Item 3)
import { NotificationSettingsPanel } from "./components/NotificationSettingsPanel"; // NOVO (Fase 10 - Automação de Alertas)

// Lazy-loaded components (Performance Optimization - Fase 12)
const BatchProductForm = React.lazy(() => import("./components/BatchProductForm"));
const ReportsView = React.lazy(() => import("./components/ReportsView"));
const UsersManagementView = React.lazy(() => import("./components/UsersManagementView").then(m => ({ default: m.UsersManagementView })));
const StoreList = React.lazy(() => import("./components/StoreList").then(m => ({ default: m.StoreList })));
const UserStoresDashboard = React.lazy(() => import("./components/UserStoresDashboard").then(m => ({ default: m.UserStoresDashboard })));
const UserProfileView = React.lazy(() => import("./components/UserProfileView").then(m => ({ default: m.UserProfileView })));
const AdminDiagnostics = React.lazy(() => import("./components/AdminDiagnostics").then(m => ({ default: m.AdminDiagnostics })));
const SalesTab = React.lazy(() => import("./components/SalesTab").then(m => ({ default: m.SalesTab })));
const CustomersView = React.lazy(() => import("./components/CustomersView"));
const PurchasingView = React.lazy(() => import("./components/PurchasingView"));
const FinancialView = React.lazy(() => import("./components/FinancialView"));
const StockManagementView = React.lazy(() => import("./components/StockManagementView"));
const MultiStoreComparisonDashboard = React.lazy(() => import("./components/MultiStoreComparisonDashboard").then(m => ({ default: m.MultiStoreComparisonDashboard })));
const AlertMonitorPanel = React.lazy(() => import("./components/AlertMonitorPanel").then(m => ({ default: m.AlertMonitorPanel })));
const TwilioConfigPanel = React.lazy(() => import("./components/TwilioConfigPanel").then(m => ({ default: m.TwilioConfigPanel })));
const AlertsView = React.lazy(() => import("./components/AlertsView")); // NOVO (Fase 13 - Expiry & Stock Alerts)
const StockManagementPanel = React.lazy(() => import("./components/StockManagementPanel")); // NOVO (Fase 2 - Stock Management)
const ExecutiveDashboard = React.lazy(() => import("./components/ExecutiveDashboard")); // NOVO (Fase 17 - Executive Dashboard)
import { useUserAuth } from "./hooks/useUserAuth"; // NOVO (Fase 10 - RBAC)
import { getNavItemsForRole } from "./config/navigationConfig"; // NOVO (Fase 10 - RBAC)
import {
  exportReportToExcel,
  exportReportToPDF,
  filterProductsByConfig,
  prepareProductsForExport
} from "./utils/reportExporter"; // NOVO (Fase 5B Item 3 - Export)
import { getTailwindColorHex, injectPrimaryColorCSS } from "./utils/colorUtils"; // NOVO: Sistema de cores dinâmicas
import { useStore } from "./contexts/StoreContext";
import {
  getOperationalUnitRules,
  getStoreModuleId,
  isNavigationAllowedForUnit,
  mergeBusinessSegmentConfig,
} from "./utils/businessUnitMapping";

// Loading component for lazy-loaded sections (Fase 12 - Performance Optimization)
const LazyComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-emerald-600" size={32} />
      <p className="text-sm text-slate-600 dark:text-slate-400">Carregando...</p>
    </div>
  </div>
);


// Icons
import {
  TrendingUp,
  LogOut,
  LayoutDashboard,
  Package,
  User as UserIcon,
  Loader2,
  CheckCircle2,
  X,
  Calculator,
  Sun,
  Moon,
  Settings,
  History,
  FileText,
  Database,
  Menu,
  Folder, // NOVO (Fase 1)
  Boxes, // NOVO (Fase 3 - Batch products) - Changed from Layers to Boxes
  Upload, // NOVO (Fase 5A - CSV Import)
  Download, // NOVO (Fase 5A - Excel Export)
  BarChart3, // NOVO (Fase 5B Item 3 - Custom Reports)
  Building2, // NOVO (Fase 6 - Multi-Store)
  Bell, // NOVO (Fase 4 - Alertas de Validade)
  DollarSign, // NOVO (Fase 6 - Módulo de Vendas)
  PackageCheck, // NOVO: Gestão de stock multi-unidade
  Users,
  Truck,
  WalletCards
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState<boolean>(true);

  // NOVO (Fase 10 - RBAC): Obter dados do utilizador com papel
  const { papel, isAdmin, isLojaManager, isFuncionario } = useUserAuth();
  const { currentStore, userStores } = useStore();
  const currentUnitRules = getOperationalUnitRules(currentStore?.unitType);

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    }
    return "light";
  });

  // Apply dark class to root
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Navigation states
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false); // NOVO (Fase 5A)
  const [isReportBuilderOpen, setIsReportBuilderOpen] = useState<boolean>(false); // NOVO (Fase 5B Item 3)

  // User notifications toast state
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Auto dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const triggerNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
  };

  useEffect(() => {
    if (!isNavigationAllowedForUnit(activeTab, currentStore?.unitType)) {
      setActiveTab("dashboard");
    }
  }, [activeTab, currentStore?.unitType]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setProducts([]);
        setProductsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time business settings listener
  useEffect(() => {
    if (!user) {
      setBusinessSettings(null);
      setSettingsLoading(false);
      return;
    }

    setSettingsLoading(true);
    const q = query(
      collection(db, "businessSettings"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const selectedStore = userStores.find((store) => store.id === currentStore?.storeId);
      const defaultBusinessType = getStoreModuleId(selectedStore || (currentStore ? {
        tipo: currentStore.storeType,
        moduleId: currentStore.moduleId,
      } : null));

      const storeSettingsDoc = currentStore
        ? snapshot.docs.find((item) => item.data().storeId === currentStore.storeId)
        : undefined;
      const legacySettingsDoc = snapshot.docs.find((item) => !item.data().storeId);
      const docSnap = storeSettingsDoc || legacySettingsDoc;
      const data = docSnap?.data() || {};
      const hasStoreSettings = !!storeSettingsDoc;
      const segmentConfig = mergeBusinessSegmentConfig(
        currentStore?.businessSegmentId,
        data.segmentConfig
      );

      setBusinessSettings({
        id: hasStoreSettings || !currentStore ? docSnap?.id : undefined,
        userId: data.userId || user.uid,
        storeId: currentStore?.storeId,
        storeName: currentStore?.storeName,
        businessGroupId: currentStore?.businessGroupId,
        businessGroupName: currentStore?.businessGroupName,
        businessSegmentId: currentStore?.businessSegmentId,
        businessSegmentName: currentStore?.businessSegmentName,
        unitType: currentStore?.unitType,
        companyName: data.companyName || currentStore?.storeName || "PreçoCerto Lda",
        businessType: hasStoreSettings
          ? data.businessType || defaultBusinessType
          : defaultBusinessType || data.businessType || "outro",
        currency: data.currency || "Kz",
        country: data.country || "Angola",
        language: data.language || "Português",
        logoUrl: data.logoUrl || "",
        primaryColor: data.primaryColor || "emerald-600",
        dateFormat: data.dateFormat || "DD/MM/YYYY",
        numberFormat: data.numberFormat || "1.234,56",
        customCategories: data.customCategories || [],
        segmentConfig,
        defaultMargin: data.defaultMargin ?? segmentConfig.defaultMargin,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
      setSettingsLoading(false);
    }, (error) => {
      setSettingsLoading(false);
      handleFirestoreError(error, OperationType.GET, "businessSettings");
    });

    return () => unsubscribe();
  }, [
    user,
    currentStore?.storeId,
    currentStore?.storeName,
    currentStore?.storeType,
    currentStore?.moduleId,
    currentStore?.businessGroupId,
    currentStore?.businessGroupName,
    currentStore?.businessSegmentId,
    currentStore?.businessSegmentName,
    currentStore?.unitType,
    userStores,
  ]);

  // NOVO: Injetar cores CSS dinâmicas quando a cor primária mudar
  useEffect(() => {
    if (businessSettings?.primaryColor) {
      const hexColor = getTailwindColorHex(businessSettings.primaryColor);
      injectPrimaryColorCSS(hexColor);
    }
  }, [businessSettings?.primaryColor]);

  // Save handler for business settings
  const handleSaveBusinessSettings = async (settingsData: Omit<BusinessSettings, "userId" | "id">) => {
    if (!user) return;
    const timestamp = new Date().toISOString();
    const scopedSettingsData = currentStore
      ? {
          ...settingsData,
          storeId: currentStore.storeId,
          storeName: currentStore.storeName,
          businessGroupId: currentStore.businessGroupId,
          businessGroupName: currentStore.businessGroupName,
          businessSegmentId: currentStore.businessSegmentId,
          businessSegmentName: currentStore.businessSegmentName,
          unitType: currentStore.unitType,
        }
      : settingsData;

    try {
      if (businessSettings && businessSettings.id) {
        try {
          const docRef = doc(db, "businessSettings", businessSettings.id);
          await updateDoc(docRef, {
            ...scopedSettingsData,
            updatedAt: timestamp
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `businessSettings/${businessSettings.id}`);
        }
      } else {
        try {
          await addDoc(collection(db, "businessSettings"), {
            ...scopedSettingsData,
            userId: user.uid,
            createdAt: timestamp,
            updatedAt: timestamp
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, "businessSettings");
        }
      }
      triggerNotification("Configurações do negócio salvas!");
    } catch (error) {
      console.error("Error saving business settings: ", error);
      triggerNotification("Erro ao salvar configurações.", "error");
    }
  };

  // Real-time products listener (filtered by authenticated user ID)
  useEffect(() => {
    if (!user) return;

    setProductsLoading(true);
    const q = query(
      collection(db, "products"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const productStoreId = data.storeId || "";

        if (currentStore && productStoreId && productStoreId !== currentStore.storeId) {
          return;
        }

        if (currentStore && !productStoreId && userStores.length > 1) {
          return;
        }

        productsData.push({
          ...data,
          id: docSnap.id,
          nome: data.nome,
          categoria: data.categoria,
          fornecedor: data.fornecedor,
          numeroFatura: data.numeroFatura || "",
          dataEmissaoFatura: data.dataEmissaoFatura || "",
          storeId: productStoreId,
          custoCompra: data.custoCompra || 0,
          custoTransporte: data.custoTransporte || 0,
          custoEmbalagem: data.custoEmbalagem || 0,
          outrosCustos: data.outrosCustos || 0,
          
          comissaoVenda: data.comissaoVenda || 0,
          taxaBancaria: data.taxaBancaria || 0,
          taxaMarketplace: data.taxaMarketplace || 0,
          custoPublicidade: data.custoPublicidade || 0,
          custoEntrega: data.custoEntrega || 0,
          combustivel: data.combustivel || 0,
          impostoTaxa: data.impostoTaxa || 0,
          perdasDesperdicios: data.perdasDesperdicios || 0,

          energia: data.energia || 0,
          internet: data.internet || 0,
          renda: data.renda || 0,
          salario: data.salario || 0,
          agua: data.agua || 0,
          contabilidade: data.contabilidade || 0,
          seguranca: data.seguranca || 0,
          outrosCustosFixos: data.outrosCustosFixos || 0,

          margemDesejada: data.margemDesejada || 0,
          precoVendaRecomendado: data.precoVendaRecomendado || 0,
          lucroEstimado: data.lucroEstimado || 0,
          margemReal: data.margemReal || 0,
          roi: data.roi || 0,
          observacoes: data.observacoes || "",
          userId: data.userId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });

      // Sort client-side to ensure index-free 100% operation
      productsData.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setProducts(productsData);
      setProductsLoading(false);
    }, (error) => {
      setProductsLoading(false);
      handleFirestoreError(error, OperationType.GET, "products");
    });

    return () => unsubscribe();
  }, [user, currentStore?.storeId, userStores.length]);

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      triggerNotification("Sessão encerrada com sucesso.");
    } catch (error) {
      console.error("Logout error: ", error);
      triggerNotification("Erro ao encerrar sessão.", "error");
    }
  };

  // Create or Update Product Handler
  const handleSaveProduct = async (
    productData: Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">,
    changeReason?: string
  ) => {
    if (!user) return;

    const timestamp = new Date().toISOString();
    const productDataWithStore = currentStore
      ? {
          ...productData,
          storeId: productData.storeId || currentStore.storeId,
          storeName: productData.storeName || currentStore.storeName,
        }
      : productData;

    try {
      if (editingProduct && editingProduct.id) {
        // Check if there are relevant changes in price, cost, margin, etc.
        const prevQ = editingProduct.quantidade || 1;
        const prevPrice = editingProduct.venderEmbalagemInteira === false && editingProduct.precoRecomendadoUnidadeVenda !== undefined
          ? editingProduct.precoRecomendadoUnidadeVenda
          : editingProduct.precoVendaRecomendado;
        
        const prevCost = editingProduct.custoRealUnidadeVenda !== undefined
          ? editingProduct.custoRealUnidadeVenda
          : (editingProduct.custoCompra + (editingProduct.custoTransporte || 0) + (editingProduct.custoEmbalagem || 0) + (editingProduct.outrosCustos || 0)) / prevQ;

        const prevMargin = editingProduct.margemReal || 0;
        const prevROI = editingProduct.roi || 0;
        const prevProfit = editingProduct.venderEmbalagemInteira === false && editingProduct.lucroUnidadeVenda !== undefined
          ? editingProduct.lucroUnidadeVenda
          : editingProduct.lucroEstimado;

        // New values
        const newQ = productData.quantidade || 1;
        const newPrice = productData.venderEmbalagemInteira === false && productData.precoRecomendadoUnidadeVenda !== undefined
          ? productData.precoRecomendadoUnidadeVenda
          : productData.precoVendaRecomendado;

        const newCost = productData.custoRealUnidadeVenda !== undefined
          ? productData.custoRealUnidadeVenda
          : (productData.custoCompra + (productData.custoTransporte || 0) + (productData.custoEmbalagem || 0) + (productData.outrosCustos || 0)) / newQ;

        const newMargin = productData.margemReal || 0;
        const newROI = productData.roi || 0;
        const newProfit = productData.venderEmbalagemInteira === false && productData.lucroUnidadeVenda !== undefined
          ? productData.lucroUnidadeVenda
          : productData.lucroEstimado;

        const priceChanged = Math.abs((prevPrice || 0) - (newPrice || 0)) > 0.01;
        const costChanged = Math.abs((prevCost || 0) - (newCost || 0)) > 0.01;
        const marginChanged = Math.abs((prevMargin || 0) - (newMargin || 0)) > 0.01;
        const roiChanged = Math.abs((prevROI || 0) - (newROI || 0)) > 0.01;
        const profitChanged = Math.abs((prevProfit || 0) - (newProfit || 0)) > 0.01;

        const qtyChanged = (editingProduct.quantidade || 1) !== newQ;
        const unitsChanged = (editingProduct.unidadesInternas || 1) !== (productData.unidadesInternas || 1);
        const uVendaChanged = (editingProduct.unidadeVenda || "") !== (productData.unidadeVenda || "");
        const modeChanged = (editingProduct.venderEmbalagemInteira ?? true) !== (productData.venderEmbalagemInteira ?? true);
        const margemDesejadaChanged = (editingProduct.margemDesejada || 0) !== (productData.margemDesejada || 0);
        const categoryChanged =
          (editingProduct.categoryId || "") !== (productData.categoryId || "") ||
          (editingProduct.categoria || "").trim().toLocaleLowerCase("pt-PT") !==
            (productData.categoria || "").trim().toLocaleLowerCase("pt-PT");

        const hasRelevantChanges = priceChanged || costChanged || marginChanged || roiChanged || profitChanged || qtyChanged || unitsChanged || uVendaChanged || modeChanged || margemDesejadaChanged || categoryChanged;

        // Update mode
        try {
          const productRef = doc(db, "products", editingProduct.id);
          await updateDoc(productRef, {
            ...productDataWithStore,
            updatedAt: timestamp
          });

          // Save history if there are changes
          if (hasRelevantChanges) {
            await addDoc(collection(db, "priceHistory"), {
              productId: editingProduct.id,
              productName: productData.nome,
              productCategory: productData.categoria || "Outros",
              userId: user.uid,
              previousPrice: Math.round((prevPrice || 0) * 100) / 100,
              newPrice: Math.round((newPrice || 0) * 100) / 100,
              previousCost: Math.round((prevCost || 0) * 100) / 100,
              newCost: Math.round((newCost || 0) * 100) / 100,
              previousMargin: Math.round((prevMargin || 0) * 100) / 100,
              newMargin: Math.round((newMargin || 0) * 100) / 100,
              previousROI: Math.round((prevROI || 0) * 100) / 100,
              newROI: Math.round((newROI || 0) * 100) / 100,
              previousProfit: Math.round((prevProfit || 0) * 100) / 100,
              newProfit: Math.round((newProfit || 0) * 100) / 100,
              changeReason: changeReason || "Sem motivo informado",
              createdAt: timestamp
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `products/${editingProduct.id}`);
        }
        triggerNotification(`Produto "${productData.nome}" atualizado com sucesso!`);
      } else {
        // Create mode
        try {
          const docRef = await addDoc(collection(db, "products"), {
            ...productDataWithStore,
            userId: user.uid,
            createdAt: timestamp,
            updatedAt: timestamp
          });

          // Also save the initial pricing in priceHistory
          const initialPrice = productData.venderEmbalagemInteira === false && productData.precoRecomendadoUnidadeVenda !== undefined
            ? productData.precoRecomendadoUnidadeVenda
            : productData.precoVendaRecomendado;

          const initialCost = productData.custoRealUnidadeVenda !== undefined
            ? productData.custoRealUnidadeVenda
            : (productData.custoCompra + (productData.custoTransporte || 0) + (productData.custoEmbalagem || 0) + (productData.outrosCustos || 0)) / (productData.quantidade || 1);

          const initialMargin = productData.margemReal || 0;
          const initialROI = productData.roi || 0;
          const initialProfit = productData.venderEmbalagemInteira === false && productData.lucroUnidadeVenda !== undefined
            ? productData.lucroUnidadeVenda
            : productData.lucroEstimado;

          await addDoc(collection(db, "priceHistory"), {
            productId: docRef.id,
            productName: productData.nome,
            productCategory: productData.categoria || "Outros",
            userId: user.uid,
            previousPrice: 0,
            newPrice: Math.round((initialPrice || 0) * 100) / 100,
            previousCost: 0,
            newCost: Math.round((initialCost || 0) * 100) / 100,
            previousMargin: 0,
            newMargin: Math.round((initialMargin || 0) * 100) / 100,
            previousROI: 0,
            newROI: Math.round((initialROI || 0) * 100) / 100,
            previousProfit: 0,
            newProfit: Math.round((initialProfit || 0) * 100) / 100,
            changeReason: "Cadastro inicial do produto",
            createdAt: timestamp
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, "products");
        }
        triggerNotification(`Produto "${productData.nome}" cadastrado com sucesso!`);
      }
      
      // Navigate back to listing
      setActiveTab("products");
      setEditingProduct(null);
    } catch (error) {
      console.error("Error saving product: ", error);
      triggerNotification("Erro ao gravar dados do produto.", "error");
      throw error;
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, "products", id));
      triggerNotification("Produto removido com sucesso.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  // Duplicate Product Handler
  const handleDuplicateProduct = async (product: Product) => {
    if (!user) return;
    const timestamp = new Date().toISOString();
    try {
      const { id, ...originalProductWithoutId } = product;
      const duplicatedProduct = {
        ...originalProductWithoutId,
        nome: `${originalProductWithoutId.nome} Cópia`,
        ...(currentStore
          ? {
              storeId: originalProductWithoutId.storeId || currentStore.storeId,
              storeName: originalProductWithoutId.storeName || currentStore.storeName,
            }
          : {}),
        createdAt: timestamp,
        updatedAt: timestamp,
        userId: user.uid,
      };

      try {
        const docRef = await addDoc(collection(db, "products"), duplicatedProduct);

        // Also save priceHistory for duplicated product
        const initialPrice = duplicatedProduct.venderEmbalagemInteira === false && duplicatedProduct.precoRecomendadoUnidadeVenda !== undefined
          ? duplicatedProduct.precoRecomendadoUnidadeVenda
          : duplicatedProduct.precoVendaRecomendado;

        const initialCost = duplicatedProduct.custoRealUnidadeVenda !== undefined
          ? duplicatedProduct.custoRealUnidadeVenda
          : (duplicatedProduct.custoCompra + (duplicatedProduct.custoTransporte || 0) + (duplicatedProduct.custoEmbalagem || 0) + (duplicatedProduct.outrosCustos || 0)) / (duplicatedProduct.quantidade || 1);

        const initialMargin = duplicatedProduct.margemReal || 0;
        const initialROI = duplicatedProduct.roi || 0;
        const initialProfit = duplicatedProduct.venderEmbalagemInteira === false && duplicatedProduct.lucroUnidadeVenda !== undefined
          ? duplicatedProduct.lucroUnidadeVenda
          : duplicatedProduct.lucroEstimado;

        await addDoc(collection(db, "priceHistory"), {
          productId: docRef.id,
          productName: duplicatedProduct.nome,
          productCategory: duplicatedProduct.categoria || "Outros",
          userId: user.uid,
          previousPrice: 0,
          newPrice: Math.round((initialPrice || 0) * 100) / 100,
          previousCost: 0,
          newCost: Math.round((initialCost || 0) * 100) / 100,
          previousMargin: 0,
          newMargin: Math.round((initialMargin || 0) * 100) / 100,
          previousROI: 0,
          newROI: Math.round((initialROI || 0) * 100) / 100,
          previousProfit: 0,
          newProfit: Math.round((initialProfit || 0) * 100) / 100,
          changeReason: "Duplicação de produto",
          createdAt: timestamp
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "products");
      }
      triggerNotification(`Produto "${duplicatedProduct.nome}" duplicado com sucesso!`);
    } catch (error) {
      console.error("Error duplicating product: ", error);
      triggerNotification("Erro ao duplicar o produto.", "error");
    }
  };

  // Generate Custom Report Handler (Fase 5B Item 3)
  const handleGenerateReport = (reportConfig: ReportConfig) => {
    try {
      const enabledColumns = reportConfig.columns.filter(c => c.enabled);

      if (enabledColumns.length === 0) {
        triggerNotification("Seleccione pelo menos uma coluna para o relatório.", "error");
        return;
      }

      // Filter and sort products
      const filteredProducts = filterProductsByConfig(products, reportConfig);

      triggerNotification(`Relatório "${reportConfig.title}" gerado com ${filteredProducts.length} produtos!`);
      setIsReportBuilderOpen(false);
    } catch (error) {
      console.error("Error generating report: ", error);
      triggerNotification("Erro ao gerar o relatório.", "error");
    }
  };

  // Export Report Handler (Fase 5B Item 3)
  const handleExportReport = (reportConfig: ReportConfig, format: 'excel' | 'pdf') => {
    try {
      const enabledColumns = reportConfig.columns.filter(c => c.enabled);

      if (enabledColumns.length === 0) {
        triggerNotification("Seleccione pelo menos uma coluna para o relatório.", "error");
        return;
      }

      // Filter and prepare products
      const filteredProducts = filterProductsByConfig(products, reportConfig);

      if (filteredProducts.length === 0) {
        triggerNotification("Nenhum produto corresponde aos critérios de filtro.", "error");
        return;
      }

      // Prepare export data
      const exportColumns = enabledColumns.map(col => ({
        key: col.key as string,
        label: col.label
      }));

      const exportData = prepareProductsForExport(filteredProducts, exportColumns);

      // Export based on format
      if (format === 'excel') {
        exportReportToExcel({
          title: reportConfig.title,
          columns: exportColumns,
          data: exportData,
          generatedAt: new Date().toLocaleDateString('pt-PT'),
          companyName: businessSettings?.companyName
        });
        triggerNotification(`Relatório exportado para Excel com sucesso!`);
      } else if (format === 'pdf') {
        exportReportToPDF({
          title: reportConfig.title,
          columns: exportColumns,
          data: exportData,
          generatedAt: new Date().toLocaleDateString('pt-PT'),
          companyName: businessSettings?.companyName
        });
        triggerNotification(`Relatório exportado para PDF com sucesso!`);
      }

      setIsReportBuilderOpen(false);
    } catch (error) {
      console.error(`Error exporting report to ${format}:`, error);
      triggerNotification(`Erro ao exportar o relatório para ${format.toUpperCase()}.`, "error");
    }
  };

  // Batch Products Handler
  const handleSaveBatchProducts = async (
    productsData: Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">[]
  ) => {
    if (!user) return;

    const timestamp = new Date().toISOString();
    const savedProducts: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const productData of productsData) {
        try {
          const productDataWithStore = currentStore
            ? {
                ...productData,
                storeId: productData.storeId || currentStore.storeId,
                storeName: productData.storeName || currentStore.storeName,
              }
            : productData;

          // Create product document
          const docRef = await addDoc(collection(db, "products"), {
            ...productDataWithStore,
            userId: user.uid,
            createdAt: timestamp,
            updatedAt: timestamp
          });

          // Save initial price history
          const initialPrice = productData.venderEmbalagemInteira === false && productData.precoRecomendadoUnidadeVenda !== undefined
            ? productData.precoRecomendadoUnidadeVenda
            : productData.precoVendaRecomendado;

          const initialCost = productData.custoRealUnidadeVenda !== undefined
            ? productData.custoRealUnidadeVenda
            : (productData.custoCompra + (productData.custoTransporte || 0) + (productData.custoEmbalagem || 0) + (productData.outrosCustos || 0)) / (productData.quantidade || 1);

          const initialMargin = productData.margemReal || 0;
          const initialROI = productData.roi || 0;
          const initialProfit = productData.venderEmbalagemInteira === false && productData.lucroUnidadeVenda !== undefined
            ? productData.lucroUnidadeVenda
            : productData.lucroEstimado;

          await addDoc(collection(db, "priceHistory"), {
            productId: docRef.id,
            productName: productData.nome,
            productCategory: productData.categoria || "Outros",
            userId: user.uid,
            previousPrice: 0,
            newPrice: Math.round((initialPrice || 0) * 100) / 100,
            previousCost: 0,
            newCost: Math.round((initialCost || 0) * 100) / 100,
            previousMargin: 0,
            newMargin: Math.round((initialMargin || 0) * 100) / 100,
            previousROI: 0,
            newROI: Math.round((initialROI || 0) * 100) / 100,
            previousProfit: 0,
            newProfit: Math.round((initialProfit || 0) * 100) / 100,
            changeReason: "Cadastro em lote de produtos",
            createdAt: timestamp
          });

          savedProducts.push(productData.nome);
          successCount++;
        } catch (error) {
          console.error(`Erro ao salvar produto ${productData.nome}:`, error);
          errorCount++;
          handleFirestoreError(error, OperationType.CREATE, `products (batch item: ${productData.nome})`);
        }
      }

      if (successCount > 0) {
        triggerNotification(
          `${successCount} produto(s) cadastrado(s) com sucesso!${errorCount > 0 ? ` (${errorCount} falha(s))` : ""}`,
          errorCount > 0 ? "error" : "success"
        );
      }

      // Navigate back to products list
      setActiveTab("products");
    } catch (error) {
      console.error("Erro geral ao salvar lote de produtos: ", error);
      triggerNotification("Erro ao salvar lote de produtos.", "error");
    }
  };

  // Navigation callbacks
  const handleEditTrigger = (product: Product) => {
    setEditingProduct(product);
    setActiveTab("edit-product");
  };

  const handleAddNewTrigger = () => {
    setEditingProduct(null);
    setActiveTab("add-product");
  };

  // Splash Loading Screen
  if (authLoading) {
    return (
      <div id="splash-screen" className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
        <div className="flex flex-col items-center">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="h-14 w-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4"
          >
            <TrendingUp size={28} className="stroke-[2.5]" />
          </motion.div>
          <h2 className="text-lg font-bold tracking-tight">PreçoCerto</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Carregando sistema financeiro...</p>
        </div>
      </div>
    );
  }

  const getPrimaryColorHex = (colorName: string) => {
    const map: Record<string, string> = {
      "emerald-600": "#059669",
      "blue-600": "#2563eb",
      "amber-600": "#d97706",
      "pink-600": "#db2777",
      "purple-600": "#9333ea",
      "teal-600": "#0d9488",
      "cyan-600": "#0891b2",
      "orange-600": "#ea580c",
      "red-600": "#dc2626",
      "slate-600": "#475569"
    };
    return map[colorName] || "#059669";
  };

  const primaryHex = getPrimaryColorHex(businessSettings?.primaryColor || "emerald-600");

  interface SidebarNavItem {
    id: "dashboard" | "alertas" | "products" | "batch-products" | "categories" | "reverse-calculator" | "estoque" | "vendas" | "clientes" | "fornecedores" | "financeiro" | "history" | "reports" | "settings" | "backup" | "users" | "stores" | "user-profile"; // NOVO (Fase 13): alertas
    label: string;
    icon: React.ComponentType<any>;
    badge?: number;
  }

  // Mapa de ícones baseado no nome
  const iconMap: Record<string, React.ComponentType<any>> = {
    LayoutDashboard,
    Package,
    Boxes,
    Folder,
    Calculator,
    Building2,
    History,
    FileText,
    User: UserIcon,
    Settings,
    Database,
    PackageCheck,
    Users,
    Truck,
    WalletCards,
  };

  // NOVO (Fase 10 - RBAC): Gerar navigationItems dinamicamente baseado no papel
  const allNavigationItems: SidebarNavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "alertas", label: "Alertas", icon: Bell }, // NOVO (Fase 13 - Expiry & Stock Alerts)
    { id: "products", label: "Lista de Produtos", icon: Package, badge: products.length },
    { id: "batch-products", label: "Cadastro em Lote", icon: Boxes }, // NOVO (Fase 3)
    { id: "categories", label: "Categorias", icon: Folder }, // NOVO (Fase 1)
    { id: "reverse-calculator", label: "Calculadora Reversa", icon: Calculator },
    { id: "estoque", label: "Stock", icon: PackageCheck },
    { id: "stores", label: "Unidades", icon: Building2 }, // Base multi-negócio
    { id: "history", label: "Histórico", icon: History },
    { id: "reports", label: "Relatórios", icon: FileText },
    { id: "vendas", label: "Vendas", icon: DollarSign }, // NOVO (Fase 6 - Módulo de Vendas)
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "fornecedores", label: "Fornecedores", icon: Truck },
    { id: "financeiro", label: "Financeiro", icon: WalletCards },
    { id: "users", label: "Utilizadores", icon: UserIcon }, // NOVO (Fase 10)
    { id: "user-profile", label: "Meu Perfil", icon: UserIcon }, // NOVO (Fase 11 - User Profile)
    { id: "settings", label: "Configurações", icon: Settings },
    { id: "backup", label: "Backup e Dados", icon: Database }
  ];

  // Filtrar itens baseado no papel do utilizador (NOVO Fase 10 - RBAC)
  const configItems = getNavItemsForRole(papel);
  const navigationItems = allNavigationItems.filter((item) =>
    configItems.some((cfgItem) => cfgItem.id === item.id) &&
    isNavigationAllowedForUnit(item.id, currentStore?.unitType)
  );

  const isTabActive = (tabId: string) => {
    if (tabId === "products" && (activeTab === "add-product" || activeTab === "edit-product")) {
      return true;
    }
    return activeTab === tabId;
  };

  const renderSidebarContent = (isDrawer = false) => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-colors">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {businessSettings?.logoUrl ? (
            <img 
              src={businessSettings.logoUrl} 
              alt="Logo" 
              className="h-8 w-8 rounded-lg object-contain bg-slate-50 border border-slate-100 shrink-0" 
              referrerPolicy="no-referrer" 
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div 
              style={{ backgroundColor: primaryHex }}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
            >
              <TrendingUp size={16} className="stroke-[2.5]" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-slate-100 truncate">
              {businessSettings?.companyName || "PreçoCerto"}
            </span>
            <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-bold tracking-wider uppercase mt-px">
              Gestão Comercial
            </span>
          </div>
        </div>

        {isDrawer && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            title="Fechar menu"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Navigation Items (Scrollable list) */}
      <div className="px-3.5 py-4 space-y-1 flex-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const isSelected = isTabActive(item.id);
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}-sidebar-btn`}
              onClick={() => {
                setActiveTab(item.id);
                if (isDrawer) setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all relative cursor-pointer group ${
                isSelected 
                  ? "font-bold" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/45"
              }`}
              style={{
                backgroundColor: isSelected ? `${primaryHex}12` : "transparent",
                color: isSelected ? primaryHex : undefined
              }}
            >
              <div className="flex items-center gap-3">
                <IconComponent 
                  size={16} 
                  className={`transition-colors ${isSelected ? "" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}
                  style={{ color: isSelected ? primaryHex : undefined }}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  style={isSelected ? { backgroundColor: `${primaryHex}20`, color: primaryHex } : undefined}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer (Theme, profile & logout) */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 shrink-0">
        {/* User profile details */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/50 border border-slate-200/30 dark:border-slate-700/30">
          <div className="h-6.5 w-6.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <UserIcon size={12} className="stroke-[2.5]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate" title={user?.email || ""}>
              {user?.email}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              Utilizador Ativo
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Theme Selector */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="flex items-center justify-center gap-1.5 px-2 py-2 border border-slate-100 dark:border-slate-800/60 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 shadow-2xs cursor-pointer text-[10.5px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            title={theme === "light" ? "Alternar para Tema Escuro" : "Alternar para Tema Claro"}
          >
            {theme === "light" ? (
              <>
                <Moon size={12} className="text-slate-500" />
                <span>Escuro</span>
              </>
            ) : (
              <>
                <Sun size={12} className="text-amber-400 animate-pulse" />
                <span>Claro</span>
              </>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 px-2 py-2 border border-transparent rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 bg-slate-100/50 hover:text-rose-600 dark:hover:text-rose-400 dark:bg-slate-850/60 shadow-2xs cursor-pointer text-[10.5px] font-bold text-slate-600 dark:text-slate-400 transition-colors"
            title="Sair do PreçoCerto"
          >
            <LogOut size={12} className="text-rose-500/80" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Not authenticated? Show Login/Sign Up
  if (!user) {
    return (
      <>
        <AuthScreen />
        <Toast notification={notification} onClose={() => setNotification(null)} />
      </>
    );
  }

  return (
    <div id="app-root-layout" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors">
      
      {/* Permanent Left Sidebar on Desktop */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 shrink-0 z-20">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 shadow-xs px-4 py-3 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2.5">
          {businessSettings?.logoUrl ? (
            <img 
              src={businessSettings.logoUrl} 
              alt="Logo" 
              className="h-8 w-8 rounded-lg object-contain bg-slate-50 border border-slate-100 shrink-0" 
              referrerPolicy="no-referrer" 
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div 
              style={{ backgroundColor: primaryHex }}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
            >
              <TrendingUp size={16} className="stroke-[2.5]" />
            </div>
          )}
          <span className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-slate-100">
            {businessSettings?.companyName || "PreçoCerto"}
          </span>
        </div>

        <button
          id="hamburger-menu-btn"
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -mr-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Abrir menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile Sidebar Drawer (slide-out overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />
            {/* Drawer container */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 z-50 md:hidden shadow-2xl flex flex-col"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
          
          {/* View Switcher Router */}
          <div className="flex-1">
            {productsLoading || settingsLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 size={36} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-3">Carregando informações do negócio...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === "dashboard" && (
                  <motion.div
                    key="dashboard-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Dashboard
                      products={products}
                      settings={businessSettings}
                      unitRules={currentUnitRules}
                      onNavigate={(tab) => setActiveTab(tab)}
                    />
                  </motion.div>
                )}

                {/* NOVO (Fase 17): Executive Dashboard - Analytics & Metrics - Lazy loaded (Fase 12) */}
                {activeTab === "dashboard-executivo" && (
                  <motion.div
                    key="dashboard-executivo-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <ExecutiveDashboard />
                    </Suspense>
                  </motion.div>
                )}

                {/* NOVO (Fase 13): Expiry & Stock Alerts Dashboard - Lazy loaded (Fase 12) */}
                {activeTab === "alertas" && (
                  <motion.div
                    key="alertas-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <AlertsView />
                    </Suspense>
                  </motion.div>
                )}

                {/* NOVO (Fase 2): Stock Management Panel - Lazy loaded (Fase 12) */}
                {activeTab === "estoque" && (
                  <motion.div
                    key="estoque-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <StockManagementPanel />
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "products" && (
                  <motion.div
                    key="products-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* NOVO (Fase 5A): Action buttons header */}
                    <div className="mb-6 flex gap-3 flex-wrap">
                      {currentUnitRules.canManageProducts && (
                        <>
                          <button
                            onClick={handleAddNewTrigger}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                          >
                            <Package size={18} />
                            Novo Produto
                          </button>
                          <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                          >
                            <Upload size={18} />
                            Importar CSV
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setIsReportBuilderOpen(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                      >
                        <BarChart3 size={18} />
                        Relatório Personalizado
                      </button>
                      <ExportExcelButton
                        products={products}
                        settings={businessSettings}
                      />
                    </div>

                    <ProductList
                      products={products}
                      settings={businessSettings}
                      canManageProducts={currentUnitRules.canManageProducts}
                      onAddProduct={handleAddNewTrigger}
                      onEditProduct={handleEditTrigger}
                      onDeleteProduct={handleDeleteProduct}
                      onDuplicateProduct={handleDuplicateProduct}
                    />
                  </motion.div>
                )}

                {/* NOVO (Fase 3): Batch Products Tab - Lazy loaded (Fase 12) */}
                {activeTab === "batch-products" && (
                  <motion.div
                    key="batch-products-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <BatchProductForm
                        onSave={handleSaveBatchProducts}
                        onCancel={() => {
                          setActiveTab("products");
                        }}
                        settings={businessSettings}
                      />
                    </Suspense>
                  </motion.div>
                )}

                {/* NOVO (Fase 1): Categories Tab */}
                {activeTab === "categories" && (
                  <motion.div
                    key="categories-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <CategoriesTab
                      businessType={businessSettings?.businessType || "supermercado"}
                    />
                  </motion.div>
                )}

                {activeTab === "reverse-calculator" && (
                  <motion.div
                    key="reverse-calculator-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ReverseCalculator 
                      products={products} 
                      settings={businessSettings}
                    />
                  </motion.div>
                )}

                {activeTab === "history" && user && (
                  <motion.div
                    key="general-history-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <GeneralHistoryView 
                      products={products} 
                      settings={businessSettings}
                      userId={user.uid}
                    />
                  </motion.div>
                )}

                {activeTab === "reports" && user && (
                  <motion.div
                    key="reports-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <ReportsView
                        products={products}
                        settings={businessSettings}
                        userId={user.uid}
                      />
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "estoque" && user && (
                  <motion.div
                    key="estoque-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <StockManagementView
                        products={products}
                        userId={user.uid}
                        userName={user.displayName || user.email || ""}
                        onNotification={triggerNotification}
                      />
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "vendas" && user && (
                  <motion.div
                    key="vendas-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <SalesTab
                        products={products}
                        settings={businessSettings}
                        onNotification={triggerNotification}
                      />
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "clientes" && user && (
                  <motion.div
                    key="clientes-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <CustomersView onNotification={triggerNotification} />
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "fornecedores" && user && (
                  <motion.div
                    key="fornecedores-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <PurchasingView
                        products={products}
                        onNotification={triggerNotification}
                      />
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "financeiro" && user && (
                  <motion.div
                    key="financeiro-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <FinancialView onNotification={triggerNotification} />
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "multi-loja" && isAdmin && (
                  <motion.div
                    key="multi-loja-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <MultiStoreComparisonDashboard />
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "stores" && (
                  <motion.div
                    key="stores-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* NOVO (Fase 14): UserStoresDashboard para não-admin, StoreList para admin - Lazy loaded (Fase 12) */}
                    <Suspense fallback={<LazyComponentLoader />}>
                      {isAdmin ? <StoreList /> : <UserStoresDashboard />}
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "settings" && (
                  <motion.div
                    key="settings-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <BusinessSettingsView
                      settings={businessSettings}
                      onSave={handleSaveBusinessSettings}
                    />
                  </motion.div>
                )}

                {activeTab === "users" && (
                  <motion.div
                    key="users-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <UsersManagementView />
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "user-profile" && (
                  <motion.div
                    key="user-profile-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <UserProfileView
                        onNavigate={(tab) => setActiveTab(tab)}
                      />
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "notificacoes" && user && (
                  <motion.div
                    key="notificacoes-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <NotificationSettingsPanel />
                  </motion.div>
                )}

                {activeTab === "automacao" && (isAdmin || isLojaManager) && (
                  <motion.div
                    key="automacao-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <AlertMonitorPanel />
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "twilio-config" && isAdmin && (
                  <motion.div
                    key="twilio-config-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <TwilioConfigPanel />
                    </Suspense>
                  </motion.div>
                )}

                {/* NOVO: Admin Diagnostics Tab - Lazy loaded (Fase 12) */}
                {activeTab === "diagnostics" && isAdmin && (
                  <motion.div
                    key="diagnostics-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Suspense fallback={<LazyComponentLoader />}>
                      <AdminDiagnostics />
                    </Suspense>
                  </motion.div>
                )}

                {activeTab === "backup" && (
                  <motion.div
                    key="backup-view"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <BackupView
                      products={products}
                      settings={businessSettings}
                      userId={user ? user.uid : ""}
                    />
                  </motion.div>
                )}

                {(activeTab === "add-product" || activeTab === "edit-product") && (
                  <motion.div
                    key="form-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ProductForm 
                      productToEdit={activeTab === "edit-product" ? editingProduct : null}
                      settings={businessSettings}
                      onSave={handleSaveProduct}
                      onCancel={() => {
                        setActiveTab("products");
                        setEditingProduct(null);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

        </main>

        {/* NOVO (Fase 5A): Import CSV Modal */}
        <ImportCSVModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleSaveBatchProducts}
        />

        {/* NOVO (Fase 5B Item 3): Report Builder Modal */}
        <AnimatePresence>
          {isReportBuilderOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsReportBuilderOpen(false)}
                className="fixed inset-0 bg-black z-40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-2xl max-h-[90vh] z-50 bg-white dark:bg-slate-900 rounded-lg shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BarChart3 size={24} className="text-purple-600" />
                    Construtor de Relatórios
                  </h2>
                  <button
                    onClick={() => setIsReportBuilderOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <ReportBuilder
                    products={products}
                    onGenerateReport={handleGenerateReport}
                    onExport={handleExportReport}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Toast Alert Component */}
        <Toast notification={notification} onClose={() => setNotification(null)} />

        {/* Humble footer */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-4 text-center mt-auto text-xs text-slate-400 dark:text-slate-500 transition-colors">
          <p>© 2026 PreçoCerto Pessoal • Todos os dados salvos em nuvem de forma privada.</p>
          <p className="mt-1 font-mono text-[10px] text-slate-400 dark:text-slate-600">
            v{buildInfo.appVersion} • {buildInfo.deployTarget} • {buildInfo.gitCommit}
          </p>
        </footer>
      </div>

    </div>
  );
}

// Inline Toast Notification
function Toast({ notification, onClose }: { 
  notification: { message: string; type: "success" | "error" } | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          id="toast-notification"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-slate-900 border border-slate-800 text-slate-100 p-4 rounded-xl shadow-xl max-w-sm"
        >
          {notification.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <span className="text-base shrink-0">⚠️</span>
          )}
          <span className="text-xs font-semibold">{notification.message}</span>
          <button
            id="toast-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 ml-auto hover:bg-slate-800 rounded-md cursor-pointer"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
