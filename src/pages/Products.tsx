import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/ui/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  Filter,
  Loader2,
  TrendingUp,
  Boxes,
  ImagePlus,
  X,
  FileText,
  Printer,
  ScanBarcode,
  Barcode,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Minus,
} from "lucide-react";
import { useApp, Product } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { CameraBarcodeScanner } from "@/components/CameraBarcodeScanner";
import { LabelPrintDialog } from "@/components/LabelPrintDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductImage } from "@/components/ProductImage";
import { resolveFullBarcodeInfo, parseRawBarcodeData } from "@/lib/barcodeParser";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";

import { BarcodeGraphic, generateValidEan13 } from "@/components/BarcodeGraphic";
import { loadLabelOptions, type LabelProductData } from "@/lib/labelPrinter";
import { printHardwareLabel } from "@/lib/hardwareManager";
import { isBluetoothPrinterConnected, connectBluetoothPrinter } from "@/lib/bluetoothPrinter";

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string;
  name: string;
  description?: string;
  product_count?: number;
}

const Products = () => {
  const { state, addProduct, updateProduct, deleteProduct } = useApp();
  const { products, transactions, isLoading } = state;
  const { user } = useAuth();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("semua");
  const [selectedOwnership, setSelectedOwnership] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [viewMode, setViewMode] = useState<'table' | 'grid-2' | 'grid-3' | 'list'>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [printBarcodeProduct, setPrintBarcodeProduct] = useState<Product | null>(null);
  const [batchPrintProducts, setBatchPrintProducts] = useState<Product[] | null>(null);
  const [showLabelSettingsDialog, setShowLabelSettingsDialog] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showProductCameraScanner, setShowProductCameraScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbBrands, setDbBrands] = useState<Brand[]>([]);

  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [isSavingNewBrand, setIsSavingNewBrand] = useState(false);

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSavingNewCategory, setIsSavingNewCategory] = useState(false);

  const [dbSubCategories, setDbSubCategories] = useState<SubCategory[]>([]);
  const [isCreatingSubCategory, setIsCreatingSubCategory] = useState(false);
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  const [isSavingNewSubCategory, setIsSavingNewSubCategory] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    subCategory: "",
    brand: "",
    price: "",
    costPrice: "",
    stock: "",
    minStock: "",
    unit: "pcs",
    sku: "",
    barcode: "",
    description: "",
    image: "",
    showInOnlineStore: false,
    isActive: true,
    productType: "physical" as "physical" | "digital",
    ownershipType: "owned" as "owned" | "consignment",
    supplier: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openLabelSettings') === 'true') {
      setShowLabelSettingsDialog(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (location.state && (location.state as any).autoBarcode) {
      const code = (location.state as any).autoBarcode;
      const prefill = (location.state as any).prefillData;
      setEditingProduct(null);
      if (prefill) {
        setFormData(prev => ({
          ...prev,
          barcode: prefill.barcode || code,
          sku: prefill.sku || code,
          name: prefill.name || prev.name,
          brand: prefill.brand || prev.brand,
          category: prefill.category || prev.category,
          price: prefill.price ? String(prefill.price) : prev.price,
          costPrice: prefill.costPrice ? String(prefill.costPrice) : prev.costPrice,
          unit: prefill.unit || prev.unit,
        }));
      } else {
        setFormData(prev => ({ ...prev, barcode: code }));
        handleMasterBarcodeSearch(code);
      }
      setIsDialogOpen(true);
    }
  }, [location.state]);

  const handleMasterBarcodeSearch = async (barcodeToSearch?: string) => {
    const targetCode = (barcodeToSearch || formData.barcode).trim();
    if (!targetCode) {
      toast.info("Silakan isi atau scan kode barcode terlebih dahulu.");
      return;
    }

    toast.loading("Menganalisis & mengekstrak data barcode/QR...", { id: "barcode-lookup" });
    const resolved = await resolveFullBarcodeInfo(targetCode);

    setFormData(prev => ({
      ...prev,
      barcode: resolved.barcode || targetCode,
      sku: prev.sku ? prev.sku : (resolved.sku || resolved.barcode || targetCode),
      name: resolved.name || prev.name,
      brand: resolved.brand || prev.brand,
      category: resolved.category || prev.category,
      price: resolved.price !== undefined ? String(resolved.price) : prev.price,
      costPrice: resolved.costPrice !== undefined ? String(resolved.costPrice) : prev.costPrice,
      unit: resolved.unit || prev.unit,
      stock: resolved.stock !== undefined ? String(resolved.stock) : prev.stock,
    }));

    if (resolved.name || resolved.brand || resolved.category || resolved.isStructured) {
      const brandInfo = resolved.brand ? ` | Merk: ${resolved.brand}` : '';
      const catInfo = resolved.category ? ` | Kategori: ${resolved.category}` : '';
      const priceInfo = resolved.price ? ` | Harga: Rp${resolved.price.toLocaleString('id-ID')}` : '';
      toast.success(`✨ Barcode terdeteksi: "${resolved.name || resolved.barcode}"${brandInfo}${catInfo}${priceInfo}`, { 
        id: "barcode-lookup",
        duration: 5000 
      });
    } else {
      toast.info(`Kode barcode "${targetCode}" belum ada di database katalog. Silakan lengkapi nama & harga produk.`, { id: "barcode-lookup" });
    }
  };

  const consignmentStats = useMemo(() => {
    const report: Record<string, { supplier: string, sold: number, debt: number, commission: number }> = {};
    
    // Get all consignment products
    const safeProducts = Array.isArray(products) ? products : [];
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const consignmentProducts = safeProducts.filter(p => p && p.ownershipType === 'consignment');
    
    // Get all completed transactions
    const completedTransactions = safeTransactions.filter(t => t && t.status === 'completed');
    
    completedTransactions.forEach(t => {
        if (!t || !Array.isArray(t.items)) return;
        t.items.forEach(item => {
            if (!item) return;
            const product = consignmentProducts.find(p => p && p.id === item.productId);
            if (product) {
                const supplier = product.supplier || 'Unknown';
                if (!report[supplier]) {
                    report[supplier] = { supplier, sold: 0, debt: 0, commission: 0 };
                }
                
                const quantity = Number(item.quantity) || 0;
                const cost = Number(product.costPrice) || 0;
                const price = Number(item.price) || 0;
                
                report[supplier].sold += quantity;
                report[supplier].debt += quantity * cost;
                report[supplier].commission += (price - cost) * quantity;
            }
        });
    });
    
    return Object.values(report);
  }, [products, transactions]);

  const totalConsignmentDebt = (consignmentStats || []).reduce((acc, curr) => acc + (curr?.debt || 0), 0);
  const totalConsignmentCommission = (consignmentStats || []).reduce((acc, curr) => acc + (curr?.commission || 0), 0);

  useEffect(() => {
    if (user) {
      loadCategories();
      loadBrands();
      loadSubCategories();
    }
  }, [user]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      setDbCategories(res.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadSubCategories = async () => {
    try {
      const res = await api.get('/sub-categories');
      setDbSubCategories(res.data || []);
    } catch (error) {
      console.error('Error loading sub-categories:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const res = await api.get('/brands');
      setDbBrands(res.data);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const handleQuickCreateBrand = async () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) {
      toast.error("Nama merek tidak boleh kosong");
      return;
    }
    setIsSavingNewBrand(true);
    try {
      await api.post('/brands', { name: trimmed, description: null });
      toast.success(`Merek "${trimmed}" berhasil dibuat dan disimpan!`);
      await loadBrands();
      setFormData(prev => ({ ...prev, brand: trimmed }));
      setIsCreatingBrand(false);
      setNewBrandName("");
    } catch (error: any) {
      console.error("Error creating brand:", error);
      const msg = error.response?.data?.error || error.message;
      toast.error("Gagal membuat merek: " + msg);
    } finally {
      setIsSavingNewBrand(false);
    }
  };

  const handleQuickCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    setIsSavingNewCategory(true);
    try {
      await api.post('/categories', { name: trimmed, description: null, color: '#6366f1' });
      toast.success(`Kategori "${trimmed}" berhasil dibuat dan disimpan!`);
      await loadCategories();
      setFormData(prev => ({ ...prev, category: trimmed }));
      setIsCreatingCategory(false);
      setNewCategoryName("");
    } catch (error: any) {
      console.error("Error creating category:", error);
      const msg = error.response?.data?.error || error.message;
      toast.error("Gagal membuat kategori: " + msg);
    } finally {
      setIsSavingNewCategory(false);
    }
  };

  const handleQuickCreateSubCategory = async () => {
    const trimmed = newSubCategoryName.trim();
    if (!trimmed) {
      toast.error("Nama sub-kategori tidak boleh kosong");
      return;
    }
    if (!formData.category) {
      toast.error("Silakan pilih Kategori induk terlebih dahulu!");
      return;
    }
    const parentCat = dbCategories.find(c => c.name === formData.category);
    const parentCatId = parentCat?.id || "";

    setIsSavingNewSubCategory(true);
    try {
      await api.post('/sub-categories', {
        name: trimmed,
        category_id: parentCatId,
        category_name: formData.category,
      });
      toast.success(`Sub-kategori "${trimmed}" berhasil dibuat untuk kategori "${formData.category}"!`);
      await loadSubCategories();
      setFormData(prev => ({ ...prev, subCategory: trimmed }));
      setIsCreatingSubCategory(false);
      setNewSubCategoryName("");
    } catch (error: any) {
      console.error("Error creating sub-category:", error);
      const msg = error.response?.data?.error || error.message;
      toast.error("Gagal membuat sub-kategori: " + msg);
    } finally {
      setIsSavingNewSubCategory(false);
    }
  };

  const safeProductsList = Array.isArray(products) ? products : [];
  const allCategoryNames = [...new Set([
    ...dbCategories.map(c => c?.name).filter(Boolean),
    ...safeProductsList.map(p => p?.category).filter(Boolean)
  ])];
  const filterCategories = ["semua", ...allCategoryNames];

  const allBrands = [...new Set([
    ...dbBrands.map(b => b?.name).filter(Boolean),
    ...safeProductsList.map(p => p?.brand).filter(Boolean)
  ])];

  const allSubCategories = [...new Set([
    ...dbSubCategories.map(sc => sc?.name).filter(Boolean),
    ...safeProductsList.map(p => (p as any).subCategory || (p as any).sub_category).filter(Boolean)
  ])];

  const activeCategoryObj = dbCategories.find(c => c.name === formData.category);
  const availableSubCategoriesForForm = dbSubCategories.filter(sc => {
    if (!formData.category) return false;
    return (activeCategoryObj && sc.category_id === activeCategoryObj.id) ||
           sc.category_name?.toLowerCase() === formData.category.toLowerCase();
  });

  const filteredProducts = safeProductsList.filter(product => {
    if (!product) return false;
    const prodSubCat = (product as any).subCategory || (product as any).sub_category || '';
    const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prodSubCat && prodSubCat.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "semua" || product.category === selectedCategory;
    const matchesOwnership = selectedOwnership === "all" || 
      (selectedOwnership === "owned" && (product.ownershipType === "owned" || !product.ownershipType)) ||
      (selectedOwnership === "consignment" && product.ownershipType === "consignment");
    const matchesStatus = selectedStatus === "all" ||
      (selectedStatus === "active" && product.isActive !== false) ||
      (selectedStatus === "inactive" && product.isActive === false);
    
    return matchesSearch && matchesCategory && matchesOwnership && matchesStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedOwnership, selectedStatus]);

  const totalPages = Math.ceil((filteredProducts.length || 1) / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return (filteredProducts || []).slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllPaginatedSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProductIds.includes(p.id));
  
  const toggleSelectAllPaginated = () => {
    if (isAllPaginatedSelected) {
      const pageIds = new Set(paginatedProducts.map(p => p.id));
      setSelectedProductIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = paginatedProducts.map(p => p.id);
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedProductIds(filteredProducts.map(p => p.id));
  };

  const handleClearSelection = () => {
    setSelectedProductIds([]);
  };

  // Quick Print Dialog States
  const [quickPrintProduct, setQuickPrintProduct] = useState<Product | null>(null);
  const [quickPrintQuantity, setQuickPrintQuantity] = useState<number>(1);
  const [isExecutingQuickPrint, setIsExecutingQuickPrint] = useState<boolean>(false);

  const handleExecuteQuickPrint = async () => {
    if (!quickPrintProduct || isExecutingQuickPrint) return;
    setIsExecutingQuickPrint(true);
    const product = quickPrintProduct;
    const copies = Math.max(1, quickPrintQuantity);
    const toastId = `print-${product.id}`;

    try {
      if (!isBluetoothPrinterConnected()) {
        toast.info("Menghubungkan ke printer Bluetooth...", { id: toastId });
        const conn = await connectBluetoothPrinter();
        if (!conn.success) {
          toast.error(conn.message || "Batal menghubungkan printer Bluetooth.", {
            id: toastId,
            action: {
              label: "Atur Barcode",
              onClick: () => navigate("/barcode-print"),
            },
          });
          setIsExecutingQuickPrint(false);
          return;
        }
      }

      toast.loading(`Mencetak ${copies} stiker "${product.name}"...`, { id: toastId });

      const opts = loadLabelOptions();
      const currentStoreName = opts.customStoreName || state.settings?.businessName || state.settings?.business_name || 'TOKO RYO';
      const labelProduct: LabelProductData = {
        name: product.name,
        barcode: product.barcode || product.sku || '',
        sku: product.sku || '',
        price: product.price,
        brand: product.brand || '',
        storeName: currentStoreName,
        category: product.category,
      };

      const ok = await printHardwareLabel(labelProduct, { ...opts, copies, customStoreName: currentStoreName }, 'bluetooth');
      if (ok) {
        toast.success(`🏷️ ${copies} stiker "${product.name}" berhasil dicetak!`, { id: toastId });
        setQuickPrintProduct(null);
      } else {
        toast.error(`Gagal mengirim data ke printer Bluetooth.`, {
          id: toastId,
          action: {
            label: "Atur Barcode",
            onClick: () => navigate("/barcode-print"),
          },
        });
      }
    } catch (err: any) {
      toast.error(`Error mencetak: ${err?.message || err}`, { id: toastId });
    } finally {
      setIsExecutingQuickPrint(false);
    }
  };

  const handleOpenBatchPrint = (productsToPrint?: Product[]) => {
    const list = productsToPrint || safeProductsList.filter(p => selectedProductIds.includes(p.id));
    if (list.length === 0) {
      toast.warning("Pilih setidaknya 1 produk untuk mencetak stiker barcode.");
      return;
    }
    setBatchPrintProducts(list);
  };

  const lowStockProducts = safeProductsList.filter(product => product && (product.stock || 0) <= (product.minStock || 0));
  const inventoryValue = safeProductsList.reduce((total, product) => {
    if (!product || product.ownershipType === 'consignment') return total;
    const cost = Number(product.costPrice) || 0;
    const stock = Number(product.stock) || 0;
    return total + (cost * stock);
  }, 0);
  const avgMargin = safeProductsList.length > 0
    ? safeProductsList.reduce((total, product) => {
      if (!product) return total;
      const price = Number(product.price) || 0;
      const cost = Number(product.costPrice) || 0;
      const margin = cost > 0 ? ((price - cost) / cost * 100) : 0;
      return total + margin;
    }, 0) / safeProductsList.length
    : 0;

  // Calculate totals for filtered products
  const totalStock = (filteredProducts || []).reduce((total, product) => total + (Number(product?.stock) || 0), 0);
  const totalCostValue = (filteredProducts || []).reduce((total, product) => {
    return total + ((Number(product?.costPrice) || 0) * (Number(product?.stock) || 0));
  }, 0);
  const totalSellingValue = (filteredProducts || []).reduce((total, product) => {
    return total + ((Number(product?.price) || 0) * (Number(product?.stock) || 0));
  }, 0);
  
  const potentialProfit = (filteredProducts || []).reduce((total, product) => {
    const cost = Number(product?.costPrice) || 0;
    const price = Number(product?.price) || 0;
    const stock = Number(product?.stock) || 0;
    return total + ((price - cost) * stock);
  }, 0);

  const formatCurrency = (amount: number | string | undefined | null) => {
    const num = Number(amount);
    const safeAmount = isNaN(num) || num === null || num === undefined ? 0 : num;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(safeAmount);
  };

  const getStockBadge = (product: Product) => {
    if (product.stock === 0) return <Badge variant="destructive" className="font-normal">Habis</Badge>;
    if (product.stock <= product.minStock) return <Badge variant="secondary" className="bg-warning/10 text-warning hover:bg-warning/20 border-0 font-normal">Stok Menipis</Badge>;
    return <Badge variant="secondary" className="bg-success/10 text-success hover:bg-success/20 border-0 font-normal">Tersedia</Badge>;
  };

  function calculateProfit(price: number | string | undefined | null, costPrice: number | string | undefined | null) {
    const p = Number(price) || 0;
    const c = Number(costPrice) || 0;
    if (c === 0 || isNaN(p) || isNaN(c)) return "0.0";
    const profit = ((p - c) / c) * 100;
    return isNaN(profit) ? "0.0" : profit.toFixed(1);
  }

  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.isActive === false ? true : false;
    try {
      await updateProduct({ ...product, isActive: newStatus });
      toast.success(`Status produk "${product.name}" diubah menjadi ${newStatus ? 'Aktif' : 'Non-Aktif'}`);
    } catch (error) {
      toast.error('Gagal mengubah status produk');
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      subCategory: "",
      brand: "",
      price: "",
      costPrice: "",
      stock: "",
      minStock: "",
      unit: "pcs",
      sku: "",
      barcode: "",
      description: "",
      image: "",
      showInOnlineStore: false,
      isActive: true,
      productType: "physical",
      ownershipType: "owned",
      supplier: "",
    });
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
    setIsCreatingBrand(false);
    setNewBrandName("");
    setIsCreatingCategory(false);
    setNewCategoryName("");
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name, 
      category: product.category || "", 
      subCategory: (product as any).subCategory || (product as any).sub_category || "",
      brand: product.brand || "",
      price: String(product.price ?? 0),
      costPrice: String(product.costPrice ?? 0), 
      stock: String(product.stock ?? 0),
      minStock: String(product.minStock ?? 0), 
      unit: product.unit || "pcs",
      sku: product.sku || "", 
      barcode: product.barcode || "",
      description: product.description || "",
      image: product.image || "",
      showInOnlineStore: product.showInOnlineStore || false,
      isActive: product.isActive !== false,
      productType: product.productType || "physical",
      ownershipType: product.ownershipType || "owned",
      supplier: product.supplier || "",
    });
    setImagePreview(product.image ? `${import.meta.env.VITE_API_URL?.replace('/api', '') ?? ''}${product.image}` : null);
    setIsDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran gambar maksimal 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let imageUrl = formData.image;

      // Upload image if new file selected
      if (imageFile) {
        setIsUploadingImage(true);
        const formDataUpload = new FormData();
        formDataUpload.append('image', imageFile);
        const uploadRes = await api.post('/upload/product-image', formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        imageUrl = uploadRes.data.imageUrl;
        setIsUploadingImage(false);
      }

      const productData = {
        name: formData.name,
        category: formData.category,
        subCategory: formData.subCategory,
        sub_category: formData.subCategory,
        brand: formData.brand,
        price: parseFloat(formData.price) || 0,
        costPrice: parseFloat(formData.costPrice) || 0,
        stock: parseInt(formData.stock) || 0,
        minStock: parseInt(formData.minStock) || 0,
        unit: formData.unit || "pcs",
        sku: formData.sku,
        barcode: formData.barcode,
        description: formData.description,
        image: imageUrl,
        show_in_online_store: formData.showInOnlineStore,
        is_active: formData.isActive,
        product_type: formData.productType,
        ownership_type: formData.ownershipType,
        supplier: formData.supplier,
      };

      // Auto-generate valid EAN-13 Barcode if left blank by the user
      if (!productData.barcode || productData.barcode.trim() === '') {
        productData.barcode = generateValidEan13();
      }

      // Auto-generate SKU if left blank by the user
      if (!productData.sku || productData.sku.trim() === '') {
        productData.sku = productData.barcode || `PRD-${Math.random().toString(36).substring(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`;
      }

      // Auto-save Brand to DB if it's a new brand not in dbBrands
      if (productData.brand && productData.brand !== 'tanpa-merek') {
        const brandExists = dbBrands.some(b => b.name.toLowerCase() === productData.brand.toLowerCase());
        if (!brandExists) {
          try {
            await api.post('/brands', { name: productData.brand, description: null });
            loadBrands();
          } catch (e) {
            console.warn('Auto-save brand failed:', e);
          }
        }
      }

      // Auto-save Category to DB if it's a new category not in dbCategories
      if (productData.category) {
        const categoryExists = dbCategories.some(c => c.name.toLowerCase() === productData.category.toLowerCase());
        if (!categoryExists) {
          try {
            await api.post('/categories', { name: productData.category, description: null, color: '#6366f1' });
            loadCategories();
          } catch (e) {
            console.warn('Auto-save category failed:', e);
          }
        }
      }

      if (editingProduct) await updateProduct({ ...editingProduct, ...productData });
      else await addProduct(productData);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error('Gagal menyimpan produk');
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) await deleteProduct(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        <div className="flex gap-2 w-full sm:w-auto">
          <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none text-xs sm:text-sm h-9 px-3 sm:px-4">
                <FileText className="w-4 h-4 mr-1.5 sm:mr-2" />
                <span className="inline sm:hidden">Laporan</span>
                <span className="hidden sm:inline">Laporan Konsinyasi</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Laporan Penjualan Konsinyasi</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Terjual</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{consignmentStats.reduce((acc, curr) => acc + curr.sold, 0)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Hutang ke Pemilik</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(totalConsignmentDebt)}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Komisi Toko</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(totalConsignmentCommission)}</div></CardContent>
                </Card>
              </div>
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-center">Terjual (Qty)</TableHead>
                    <TableHead className="text-right">Hutang ke Pemilik</TableHead>
                    <TableHead className="text-right">Komisi Toko</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consignmentStats.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center">Belum ada data penjualan konsinyasi</TableCell></TableRow>
                  ) : (
                    consignmentStats.map((stat, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{stat.supplier}</TableCell>
                        <TableCell className="text-center">{stat.sold}</TableCell>
                        <TableCell className="text-right">{formatCurrency(stat.debt)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">{formatCurrency(stat.commission)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-bold">Total</TableCell>
                    <TableCell className="text-center font-bold">{consignmentStats.reduce((acc, curr) => acc + curr.sold, 0)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totalConsignmentDebt)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(totalConsignmentCommission)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none text-xs sm:text-sm h-9 px-3 sm:px-4 text-primary border-primary/30 hover:bg-primary/10 gap-1.5"
            onClick={() => setShowLabelSettingsDialog(true)}
            title="Buka Pengaturan Barcode, Ukuran Kertas & Format Desain Label Langsung di Produk"
          >
            <Barcode className="w-4 h-4 text-primary" />
            <span className="inline sm:hidden">Setting Barcode</span>
            <span className="hidden sm:inline">Pengaturan Barcode & Label</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none text-xs sm:text-sm h-9 px-3 sm:px-4 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800"
            onClick={() => handleOpenBatchPrint(filteredProducts)}
            title="Cetak stiker barcode untuk semua produk yang sedang tampil sekaligus"
          >
            <Boxes className="w-4 h-4 mr-1.5 text-indigo-500" />
            <span className="inline sm:hidden">Cetak Massal</span>
            <span className="hidden sm:inline">Cetak Massal Barcode ({filteredProducts.length})</span>
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { 
            setIsDialogOpen(open); 
            if (!open) resetForm(); 
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90 shadow-md flex-1 sm:flex-none text-xs sm:text-sm h-9 px-3 sm:px-4">
                <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
                <span className="inline sm:hidden">Tambah</span>
                <span className="hidden sm:inline">Tambah Produk</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[950px] lg:max-w-[1150px] max-h-[90vh] w-[95vw] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="p-6 pb-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  {editingProduct ? "Edit Detail Produk" : "Tambah Produk Baru"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Kolom Kiri: Informasi Dasar & Klasifikasi */}
                  <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span>📋</span> Informasi & Klasifikasi Produk
                    </h3>

                    {/* Nama Produk */}
                    <div>
                      <Label htmlFor="name" className="font-semibold text-xs">Nama Produk *</Label>
                      <Input
                        id="name"
                        placeholder="Masukkan nama produk..."
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>

                    {/* Barcode Scanner Input */}
                    <div>
                      <Label htmlFor="barcode" className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-xs">Kode Barcode</span>
                        <span className="text-[10px] text-primary font-bold">💡 Tembak scanner / scan HP</span>
                      </Label>
                      <div className="flex flex-wrap sm:flex-nowrap gap-1.5">
                        <Input 
                          id="barcode" 
                          placeholder="Tembak scanner USB / ketik barcode..." 
                          value={formData.barcode} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({ ...prev, barcode: val, sku: prev.sku ? prev.sku : val }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleMasterBarcodeSearch(formData.barcode);
                            }
                          }}
                          className="font-mono text-xs font-bold text-primary focus:border-primary flex-1 min-w-[140px]"
                          autoFocus
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 text-xs px-2.5 h-9 font-semibold text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 gap-1"
                          onClick={() => {
                            const newBarcode = generateValidEan13();
                            setFormData(prev => ({
                              ...prev,
                              barcode: newBarcode,
                              sku: prev.sku ? prev.sku : newBarcode
                            }));
                            toast.success(`✨ Barcode standar (EAN-13 / Code128) dibuat: ${newBarcode}`);
                          }}
                          title="Buat barcode acak standar EAN-13 (899...)"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Buat Barcode</span>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="shrink-0 text-xs px-2.5 h-9"
                          onClick={() => handleMasterBarcodeSearch()}
                          title="Cari di Katalog Master"
                        >
                          <Search className="w-3.5 h-3.5 mr-1" />
                          Cari
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 text-primary border-primary/30 h-9 w-9"
                          onClick={() => setShowProductCameraScanner(true)}
                          title="Buka Kamera HP/Webcam"
                        >
                          <ScanBarcode className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Live On-Screen Barcode Preview for direct scanning from screen */}
                      {formData.barcode && formData.barcode.trim() && (
                        <div className="mt-2.5 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center shadow-sm">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
                            Preview Barcode (Bisa di-scan langsung dari layar HP/Scanner):
                          </p>
                          <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col items-center w-full max-w-[320px]">
                            <BarcodeGraphic
                              value={formData.barcode}
                              className="h-16 sm:h-20 w-full"
                              width={2.2}
                              height={65}
                              displayValue={true}
                              fontSize={12}
                              margin={6}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SKU */}
                    <div>
                      <Label htmlFor="sku" className="font-semibold text-xs">SKU / Kode Barang</Label>
                      <Input
                        id="sku"
                        placeholder="Otomatis terisi jika kosong"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>

                    {/* Merek & Kategori Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Merek */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="brand" className="font-semibold text-xs">Merek</Label>
                          {!isCreatingBrand && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 text-xs text-primary font-medium hover:bg-primary/10 px-1.5 rounded flex items-center gap-1"
                              onClick={() => {
                                setNewBrandName("");
                                setIsCreatingBrand(true);
                              }}
                            >
                              <Plus className="w-3 h-3" /> + Merek
                            </Button>
                          )}
                        </div>
                        {isCreatingBrand ? (
                          <div className="flex gap-1.5 items-center bg-white dark:bg-slate-950 p-2 rounded-lg border border-primary/40 shadow-sm">
                            <Input
                              placeholder="Merek baru..."
                              value={newBrandName}
                              onChange={(e) => setNewBrandName(e.target.value)}
                              className="h-8 text-xs flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleQuickCreateBrand();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs px-2.5"
                              onClick={handleQuickCreateBrand}
                              disabled={isSavingNewBrand}
                            >
                              {isSavingNewBrand ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs px-1.5"
                              onClick={() => setIsCreatingBrand(false)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={formData.brand}
                            onValueChange={(value) => {
                              if (value === '__add_new_brand__') {
                                setNewBrandName("");
                                setIsCreatingBrand(true);
                              } else {
                                setFormData({ ...formData, brand: value });
                              }
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Pilih Merek..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tanpa-merek" className="italic text-muted-foreground">Tanpa Merek</SelectItem>
                              {allBrands.filter(b => b !== 'tanpa-merek').map(brand => (
                                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                              ))}
                              <SelectItem value="__add_new_brand__" className="text-primary font-semibold border-t mt-1 pt-1">
                                ✨ + Tambah Merek Baru...
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Kategori */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="category" className="font-semibold text-xs">Kategori</Label>
                          {!isCreatingCategory && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 text-xs text-primary font-medium hover:bg-primary/10 px-1.5 rounded flex items-center gap-1"
                              onClick={() => {
                                setNewCategoryName("");
                                setIsCreatingCategory(true);
                              }}
                            >
                              <Plus className="w-3 h-3" /> + Kategori
                            </Button>
                          )}
                        </div>
                        {isCreatingCategory ? (
                          <div className="flex gap-1.5 items-center bg-white dark:bg-slate-950 p-2 rounded-lg border border-primary/40 shadow-sm">
                            <Input
                              placeholder="Kategori baru..."
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              className="h-8 text-xs flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleQuickCreateCategory();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs px-2.5"
                              onClick={handleQuickCreateCategory}
                              disabled={isSavingNewCategory}
                            >
                              {isSavingNewCategory ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs px-1.5"
                              onClick={() => setIsCreatingCategory(false)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={formData.category}
                            onValueChange={(value) => {
                              if (value === '__add_new_category__') {
                                setNewCategoryName("");
                                setIsCreatingCategory(true);
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  category: value,
                                  subCategory: "" // reset sub-category agar sinkron dengan kategori induk baru
                                }));
                              }
                            }}
                          >
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                            <SelectContent>
                              {dbCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                              ))}
                              <SelectItem value="__add_new_category__" className="text-primary font-semibold border-t mt-1 pt-1">
                                ✨ + Tambah Kategori Baru...
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Sub-Kategori (Berinduk pada Kategori) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Label htmlFor="subCategory" className="font-semibold text-xs">Sub-Kategori</Label>
                            {formData.category && (
                              <span className="text-[10px] text-muted-foreground">
                                (Induk: {formData.category})
                              </span>
                            )}
                          </div>
                          {!isCreatingSubCategory && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!formData.category}
                              className="h-5 text-xs text-primary font-medium hover:bg-primary/10 px-1.5 rounded flex items-center gap-1 disabled:opacity-40"
                              onClick={() => {
                                if (!formData.category) {
                                  toast.error("Pilih kategori induk terlebih dahulu!");
                                  return;
                                }
                                setNewSubCategoryName("");
                                setIsCreatingSubCategory(true);
                              }}
                              title={!formData.category ? "Pilih kategori induk terlebih dahulu" : "Tambah sub-kategori baru"}
                            >
                              <Plus className="w-3 h-3" /> + Sub-Kategori
                            </Button>
                          )}
                        </div>

                        {isCreatingSubCategory ? (
                          <div className="flex gap-1.5 items-center bg-white dark:bg-slate-950 p-2 rounded-lg border border-primary/40 shadow-sm">
                            <Input
                              placeholder={`Sub-kategori untuk ${formData.category}...`}
                              value={newSubCategoryName}
                              onChange={(e) => setNewSubCategoryName(e.target.value)}
                              className="h-8 text-xs flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleQuickCreateSubCategory();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs px-2.5 font-bold"
                              onClick={handleQuickCreateSubCategory}
                              disabled={isSavingNewSubCategory}
                            >
                              {isSavingNewSubCategory ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs px-1.5"
                              onClick={() => setIsCreatingSubCategory(false)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={formData.subCategory || "tanpa-sub"}
                            disabled={!formData.category}
                            onValueChange={(value) => {
                              if (value === '__add_new_sub__') {
                                setNewSubCategoryName("");
                                setIsCreatingSubCategory(true);
                              } else if (value === 'tanpa-sub') {
                                setFormData({ ...formData, subCategory: "" });
                              } else {
                                setFormData({ ...formData, subCategory: value });
                              }
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={formData.category ? "Pilih Sub-Kategori..." : "Pilih Kategori Induk Terlebih Dahulu"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tanpa-sub" className="italic text-muted-foreground">
                                Tanpa Sub-Kategori
                              </SelectItem>
                              {availableSubCategoriesForForm.map((sc) => (
                                <SelectItem key={sc.id} value={sc.name}>
                                  {sc.name}
                                </SelectItem>
                              ))}
                              {formData.subCategory && !availableSubCategoriesForForm.some(sc => sc.name === formData.subCategory) && (
                                <SelectItem value={formData.subCategory}>
                                  {formData.subCategory}
                                </SelectItem>
                              )}
                              <SelectItem value="__add_new_sub__" className="text-primary font-semibold border-t mt-1 pt-1">
                                ✨ + Tambah Sub-Kategori Baru...
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {/* Deskripsi Lengkap Produk */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="description" className="font-semibold text-xs">Deskripsi Lengkap Produk</Label>
                        <span className="text-[10px] text-muted-foreground">Muncul di Toko Online &amp; Nota</span>
                      </div>
                      <Textarea
                        id="description"
                        placeholder="Tuliskan deskripsi produk, manfaat/khasiat, aturan pakai, dan rincian lainnya..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="text-xs resize-y"
                      />
                    </div>

                    {/* Jenis Produk & Kepemilikan */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="productType" className="font-semibold text-xs">Jenis Produk</Label>
                        <Select
                          value={formData.productType}
                          onValueChange={(value) => setFormData({ ...formData, productType: value as "physical" | "digital" })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Pilih jenis" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="physical">📦 Produk Fisik</SelectItem>
                            <SelectItem value="digital">💻 Produk Digital</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="ownershipType" className="font-semibold text-xs">Kepemilikan</Label>
                        <Select
                          value={formData.ownershipType}
                          onValueChange={(value) => setFormData({ ...formData, ownershipType: value as "owned" | "consignment" })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Pilih kepemilikan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owned">🏪 Milik Toko</SelectItem>
                            <SelectItem value="consignment">🤝 Konsinyasi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {formData.ownershipType === 'consignment' && (
                      <div>
                        <Label htmlFor="supplier" className="font-semibold text-xs">Supplier / Pemilik Konsinyasi</Label>
                        <Input
                          id="supplier"
                          value={formData.supplier}
                          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                          placeholder="Nama pemilik barang konsinyasi"
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  {/* Kolom Kanan: Harga, Stok & Media */}
                  <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span>💰</span> Harga, Stok & Gambar
                    </h3>

                    {/* Harga Jual & Harga Modal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price" className="font-semibold text-xs">Harga Jual (Rp) *</Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="0"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                          className="mt-1 font-bold text-emerald-600 dark:text-emerald-400 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="costPrice" className="font-semibold text-xs">Harga Modal (Rp)</Label>
                        <Input
                          id="costPrice"
                          type="number"
                          placeholder="0"
                          value={formData.costPrice}
                          onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                          className="mt-1 text-sm"
                        />
                      </div>
                    </div>

                    {/* Profit Margin Preview */}
                    {Number(formData.price) > 0 && Number(formData.costPrice) > 0 && (
                      <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between border border-emerald-500/20">
                        <span>Perkiraan Keuntungan / Item:</span>
                        <span className="font-bold">
                          Rp {(Number(formData.price) - Number(formData.costPrice)).toLocaleString('id-ID')} ({calculateProfit(formData.price, formData.costPrice)}%)
                        </span>
                      </div>
                    )}

                    {/* Stok, Min Stok & Satuan */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="stock" className="font-semibold text-xs">Jumlah Stok</Label>
                        <Input
                          id="stock"
                          type="number"
                          placeholder="0"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="minStock" className="font-semibold text-xs">Stok Minimum Alert</Label>
                        <Input
                          id="minStock"
                          type="number"
                          placeholder="5"
                          value={formData.minStock}
                          onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit" className="font-semibold text-xs">Satuan (Unit)</Label>
                        <Input
                          id="unit"
                          placeholder="pcs / unit / box"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Gambar Produk */}
                    <div className="space-y-1.5">
                      <Label className="font-semibold text-xs">Gambar Produk (Opsional)</Label>
                      <div>
                        {imagePreview ? (
                          <div className="relative w-full h-32 bg-muted rounded-xl overflow-hidden border-2 border-dashed flex items-center justify-center">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7 rounded-full shadow"
                              onClick={removeImage}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <label htmlFor="image-upload" className="cursor-pointer block">
                            <div className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl hover:bg-primary/5 transition-colors border-slate-300 dark:border-slate-700">
                              <ImagePlus className="w-7 h-7 text-muted-foreground mb-1" />
                              <p className="text-xs font-semibold text-muted-foreground">Klik untuk upload gambar</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Maksimal 5MB (JPG, PNG, WEBP)</p>
                            </div>
                            <Input
                              id="image-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageChange}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Status Active Checkbox & Online Store Checkbox */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div>
                          <Label htmlFor="isActive" className="cursor-pointer text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                            Status Produk (Aktif)
                          </Label>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Produk aktif akan muncul di transaksi Kasir (POS)</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/50">
                        <input
                          type="checkbox"
                          id="showInOnlineStore"
                          checked={formData.showInOnlineStore}
                          onChange={(e) => setFormData({ ...formData, showInOnlineStore: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <Label htmlFor="showInOnlineStore" className="cursor-pointer text-xs font-semibold text-blue-900 dark:text-blue-200">
                            Tampilkan di Katalog Toko Online
                          </Label>
                          <p className="text-[10px] text-blue-700 dark:text-blue-400">Produk akan bisa diorder pelanggan di toko web</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="pt-4 border-t flex items-center justify-end gap-3 sticky bottom-0 bg-background/95 backdrop-blur py-3 -mx-6 px-6 z-10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-6"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || isUploadingImage}
                    className="bg-gradient-primary hover:opacity-90 min-w-[150px] px-6 shadow-md"
                  >
                    {isSubmitting || isUploadingImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isUploadingImage ? 'Uploading...' : 'Menyimpan...'}
                      </>
                    ) : (
                      editingProduct ? "Simpan Perubahan" : "Tambah Produk"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
        </Dialog>
      </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        <StatCard title="Total Produk" value={products.length.toString()} icon={Package} iconColor="blue" className="p-3.5 sm:p-5" />
        <StatCard title="Stok Menipis" value={lowStockProducts.length.toString()} icon={AlertTriangle} iconColor="yellow" className="p-3.5 sm:p-5" />
        <StatCard title="Nilai Inventori" value={formatCurrency(inventoryValue)} icon={Boxes} iconColor="green" className="p-3.5 sm:p-5" />
        <StatCard title="Margin Rata-rata" value={`${avgMargin.toFixed(1)}%`} icon={TrendingUp} iconColor="purple" className="p-3.5 sm:p-5" />
      </div>

      <Card className="bg-gradient-card border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Cari produk atau SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-9 text-sm" />
            </div>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">🟢 Status: Aktif</SelectItem>
                <SelectItem value="inactive">🔴 Status: Non-Aktif</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedOwnership} onValueChange={setSelectedOwnership}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                <SelectValue placeholder="Filter Kepemilikan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kepemilikan</SelectItem>
                <SelectItem value="owned">Milik Sendiri</SelectItem>
                <SelectItem value="consignment">Konsinyasi</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm capitalize font-semibold text-foreground bg-card">
                <SelectValue placeholder="Pilih Kategori" />
              </SelectTrigger>
              <SelectContent>
                {filterCategories.map((category) => (
                  <SelectItem key={category} value={category} className="capitalize font-medium">
                    {category === "semua" ? "Semua Kategori" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Layout Selector */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Tampilan Produk:</span>
            <div className="flex bg-muted p-0.5 rounded-md gap-1">
              <Button
                type="button"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-[10px] hidden lg:inline-flex"
                onClick={() => setViewMode('table')}
              >
                Tabel
              </Button>
              <Button
                type="button"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-[10px]"
                onClick={() => setViewMode('list')}
              >
                1 Kolom
              </Button>
              <Button
                type="button"
                variant={viewMode === 'grid-2' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-[10px]"
                onClick={() => setViewMode('grid-2')}
              >
                2 Kolom
              </Button>
              <Button
                type="button"
                variant={viewMode === 'grid-3' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-[10px]"
                onClick={() => setViewMode('grid-3')}
              >
                3 Kolom
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🚀 Bulk Products Selection Action Bar */}
      {selectedProductIds.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border-2 border-primary/30 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1 font-bold shadow-sm">
              ✓ {selectedProductIds.length} Produk Terpilih
            </Badge>
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              dari total {filteredProducts.length} produk yang difilter
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenBatchPrint()}
              className="h-8 text-xs font-bold gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Barcode Terpilih ({selectedProductIds.length})
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSelectAllFiltered}
              className="h-8 text-xs font-medium"
            >
              Pilih Seluruh ({filteredProducts.length})
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleClearSelection}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      <Card className="bg-white dark:bg-slate-900 border-0 shadow-xl overflow-hidden">
        <CardHeader className="border-b bg-gray-50/50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Daftar Produk</CardTitle>
            <Badge variant="outline" className="font-normal">{filteredProducts.length} Produk</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-lg font-medium">Tidak ada produk ditemukan</p>
              <p className="text-sm">Coba sesuaikan pencarian atau filter Anda</p>
            </div>
          ) : (
            <>
            {/* Desktop Table View */}
            {viewMode === 'table' && (
              <div className="hidden lg:block overflow-x-auto rounded-md border shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-10 px-3">
                        <Checkbox
                          checked={isAllPaginatedSelected}
                          onCheckedChange={toggleSelectAllPaginated}
                          aria-label="Pilih semua di halaman ini"
                        />
                      </TableHead>
                      <TableHead className="w-[280px] font-bold">Produk</TableHead>
                      <TableHead className="font-bold hidden md:table-cell">SKU</TableHead>
                      <TableHead className="font-bold hidden lg:table-cell">Merek</TableHead>
                      <TableHead className="font-bold hidden lg:table-cell">Kategori</TableHead>
                      <TableHead className="text-center font-bold">Stok</TableHead>
                      <TableHead className="text-center font-bold">Status</TableHead>
                      <TableHead className="text-right font-bold">Harga Jual</TableHead>
                      <TableHead className="text-right font-bold hidden sm:table-cell">Harga Modal</TableHead>
                      <TableHead className="text-center font-bold hidden xl:table-cell">Margin</TableHead>
                      <TableHead className="text-right font-bold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => (
                      <TableRow 
                        key={product.id} 
                        className={cn(
                          "group transition-all duration-200 hover:bg-muted/20",
                          selectedProductIds.includes(product.id) && "bg-primary/5 dark:bg-primary/10"
                        )}
                      >
                        <TableCell className="w-10 px-3">
                          <Checkbox
                            checked={selectedProductIds.includes(product.id)}
                            onCheckedChange={() => toggleSelectProduct(product.id)}
                            aria-label={`Pilih ${product.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800">
                              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground leading-tight truncate max-w-[120px] sm:max-w-none">
                                {product.name}
                              </span>
                              <div className="mt-1 flex flex-wrap gap-1 items-center">
                                {getStockBadge(product)}
                                {product.ownershipType === 'consignment' ? (
                                  <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 bg-amber-50">
                                    Konsinyasi
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground hidden md:table-cell">{product.sku || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{product.brand || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-0 font-normal">
                              {product.category || '-'}
                            </Badge>
                            {((product as any).subCategory || (product as any).sub_category) && (
                              <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">
                                {(product as any).subCategory || (product as any).sub_category}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center"><div className="flex flex-col items-center"><span className={cn("font-bold text-sm sm:text-base", product.stock <= product.minStock ? "text-red-500" : "text-foreground")}>{product.stock}</span><span className="text-[10px] text-muted-foreground uppercase tracking-wider">{product.unit || 'Unit'}</span></div></TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(product)}
                            title={product.isActive !== false ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                            className="cursor-pointer transition-transform active:scale-95 inline-block"
                          >
                            {product.isActive !== false ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30 gap-1 font-semibold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Aktif
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 border-slate-300 gap-1 font-semibold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Non-Aktif
                              </Badge>
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400 text-sm sm:text-base">{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right text-muted-foreground hidden sm:table-cell">{formatCurrency(product.costPrice)}</TableCell>
                        <TableCell className="text-center hidden xl:table-cell"><Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-0 font-medium">{calculateProfit(product.price, product.costPrice)}%</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Cetak Stiker Barcode"
                              className="h-8 w-8 sm:h-9 sm:w-9 text-slate-700 hover:text-purple-600 hover:bg-purple-50 dark:text-slate-300 dark:hover:text-purple-400 rounded-lg transition-colors"
                              onClick={() => {
                                setQuickPrintProduct(product);
                                setQuickPrintQuantity(1);
                              }}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit Produk"
                              className="h-8 w-8 sm:h-9 sm:w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              onClick={() => openEditDialog(product)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Hapus Produk"
                              className="h-8 w-8 sm:h-9 sm:w-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-t-2 border-slate-200 dark:border-slate-700 hidden md:table-footer-group">
                    <TableRow>
                      <TableCell colSpan={6} className="font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-5 h-5 text-primary" />
                          Total ({filteredProducts.length} Produk)
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-lg text-primary">{totalStock.toLocaleString('id-ID')}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Unit</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalSellingValue)}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Nilai Jual</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        <div className="flex flex-col items-end">
                          <span className="font-medium text-muted-foreground">{formatCurrency(totalCostValue)}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Nilai Modal</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center hidden xl:table-cell">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(potentialProfit)}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Potensi Untung</span>
                        </div>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}

            {/* Mobile Card View (Conditional Layout) */}
            {(viewMode === 'list' || viewMode === 'table') ? (
              /* Mobile List Layout */
              <div className="lg:hidden flex flex-col gap-2 pb-4 px-3 pt-2">
                {paginatedProducts.map((product) => (
                  <Card 
                    key={product.id} 
                    className={cn(
                      "overflow-hidden shadow-sm border-slate-200 dark:border-slate-800 bg-gradient-card transition-all",
                      selectedProductIds.includes(product.id) && "ring-2 ring-primary border-primary/50 bg-primary/5"
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2.5">
                        <div className="pt-1.5 shrink-0">
                          <Checkbox
                            checked={selectedProductIds.includes(product.id)}
                            onCheckedChange={() => toggleSelectProduct(product.id)}
                            aria-label={`Pilih ${product.name}`}
                          />
                        </div>
                        <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden mt-0.5">
                          <ProductImage src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          {/* Row 1: Product Name */}
                          <div className="font-bold text-sm text-foreground leading-tight truncate">
                            {product.name}
                          </div>
                          
                          {/* Row 2: Badges (SKU, Category, Status, Consignment) */}
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(product)}
                              className="cursor-pointer"
                            >
                              {product.isActive !== false ? (
                                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">🟢 Aktif</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-slate-100 dark:bg-slate-800 text-slate-500">🔴 Non-Aktif</Badge>
                              )}
                            </button>
                            {product.sku && <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-muted-foreground">{product.sku}</span>}
                            {product.category && <span className="bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[9px] font-medium">{product.category}</span>}
                            {((product as any).subCategory || (product as any).sub_category) && (
                              <span className="bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[9px] font-medium">
                                {(product as any).subCategory || (product as any).sub_category}
                              </span>
                            )}
                            {product.ownershipType === 'consignment' && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-400 text-amber-600 bg-amber-50">Consign</Badge>
                            )}
                          </div>
                          
                          {/* Row 3: Price and Stock Status (Auto Wraps) */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                            <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm whitespace-nowrap">
                              {formatCurrency(product.price)}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-muted-foreground font-medium">Stok: <span className="font-bold text-foreground">{product.stock}</span></span>
                              {getStockBadge(product)}
                            </div>
                          </div>
                          
                          {/* Row 4: Action Buttons */}
                          <div className="flex justify-end items-center gap-1.5 mt-2 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Cetak Stiker Barcode"
                              className="h-7 px-2 text-xs text-slate-700 dark:text-slate-300 hover:text-purple-600 flex items-center gap-1 hover:bg-purple-50/60"
                              onClick={() => {
                                setQuickPrintProduct(product);
                                setQuickPrintQuantity(1);
                              }}
                            >
                              <Printer className="w-3.5 h-3.5" /> Stiker
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:bg-blue-50/50"
                              onClick={() => openEditDialog(product)}
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-red-500 flex items-center gap-1 hover:bg-red-50/50"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : viewMode === 'grid-2' ? (
              /* Mobile Grid 2 Column Layout */
              <div className="lg:hidden grid grid-cols-2 gap-2 pb-4 px-3 pt-2">
                {paginatedProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden shadow-sm border-slate-200 dark:border-slate-800 bg-gradient-card flex flex-col justify-between">
                    <CardContent className="p-2.5 flex-1 flex flex-col justify-between gap-2.5">
                      <div>
                        <div className="aspect-square rounded-lg overflow-hidden border">
                          <ProductImage src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <h4 className="font-bold text-xs text-foreground mt-2 line-clamp-2 min-h-[32px] leading-tight">
                          {product.name}
                        </h4>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{product.sku || '-'}</p>
                      </div>
                      
                      <div className="mt-1">
                        <div className="flex flex-wrap justify-between items-center text-[10px] text-muted-foreground border-t pt-1.5 border-dashed border-slate-200 dark:border-slate-800 gap-1">
                          <span>Stok: <span className="font-bold text-foreground">{product.stock}</span></span>
                          {getStockBadge(product)}
                        </div>
                        <div className="font-extrabold text-blue-600 dark:text-blue-400 text-xs sm:text-sm mt-1">
                          {formatCurrency(product.price)}
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            title="Cetak Stiker Barcode"
                            className="h-7 w-7 text-slate-700 dark:text-slate-300 hover:text-purple-600 p-0"
                            onClick={() => {
                              setQuickPrintProduct(product);
                              setQuickPrintQuantity(1);
                            }}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 flex-1 text-[10px] px-1 text-blue-600 border-blue-200 hover:bg-blue-50/50"
                            onClick={() => openEditDialog(product)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 flex-1 text-[10px] px-1 text-red-500 border-red-200 hover:bg-red-50/50"
                            onClick={() => handleDelete(product.id)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Mobile Grid 3 Column Layout */
              <div className="lg:hidden grid grid-cols-3 gap-1.5 pb-4 px-2 pt-2">
                {paginatedProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden shadow-xs border-slate-200 dark:border-slate-800 bg-gradient-card flex flex-col justify-between">
                    <CardContent className="p-2 flex-1 flex flex-col justify-between gap-1.5">
                      <div>
                        <div className="aspect-square rounded-md overflow-hidden border">
                          <ProductImage src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <h4 className="font-semibold text-[10px] text-foreground mt-1 line-clamp-2 min-h-[28px] leading-tight">
                          {product.name}
                        </h4>
                      </div>
                      
                      <div>
                        <div className="font-bold text-blue-600 dark:text-blue-400 text-[10px] sm:text-[11px] mt-0.5 truncate">
                          {formatCurrency(product.price)}
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-1 border-t pt-1 border-dashed border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <span>Stok: <span className="font-bold text-foreground">{product.stock}</span></span>
                        </div>
                        <div className="flex gap-1 mt-1.5 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Cetak Stiker Barcode"
                            className="h-6 w-6 text-slate-600 hover:text-purple-600 p-0"
                            onClick={() => {
                              setQuickPrintProduct(product);
                              setQuickPrintQuantity(1);
                            }}
                          >
                            <Printer className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            className="h-6 w-6 text-blue-500 hover:bg-blue-50/50 p-0"
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Hapus"
                            className="h-6 w-6 text-red-500 hover:bg-red-50/50 p-0"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination Controls Footer */}
            {filteredProducts.length > 0 && (
              <div className="p-3 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <div>
                  Menampilkan <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</strong> dari <strong>{filteredProducts.length}</strong> produk
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={String(itemsPerPage)}
                    onValueChange={(v) => {
                      setItemsPerPage(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / hal</SelectItem>
                      <SelectItem value="15">15 / hal</SelectItem>
                      <SelectItem value="25">25 / hal</SelectItem>
                      <SelectItem value="50">50 / hal</SelectItem>
                      <SelectItem value="100">100 / hal</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="px-2 font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="lg:hidden grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 border-t rounded-b-xl">
              <div className="p-2.5 bg-background rounded-lg border border-slate-100 dark:border-slate-800/50 flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Stok</span>
                <span className="text-sm font-bold text-foreground">{totalStock.toLocaleString('id-ID')} Unit</span>
              </div>
              <div className="p-2.5 bg-background rounded-lg border border-slate-100 dark:border-slate-800/50 flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Nilai Jual</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 truncate">{formatCurrency(totalSellingValue)}</span>
              </div>
              <div className="p-2.5 bg-background rounded-lg border border-slate-100 dark:border-slate-800/50 flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Nilai Modal</span>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 truncate">{formatCurrency(totalCostValue)}</span>
              </div>
              <div className="p-2.5 bg-background rounded-lg border border-slate-100 dark:border-slate-800/50 flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Potensi Untung</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">{formatCurrency(potentialProfit)}</span>
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Universal Label & Barcode Print & Settings Dialog */}
      <LabelPrintDialog
        product={printBarcodeProduct}
        products={batchPrintProducts}
        open={Boolean(printBarcodeProduct || (batchPrintProducts && batchPrintProducts.length > 0) || showLabelSettingsDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setPrintBarcodeProduct(null);
            setBatchPrintProducts(null);
            setShowLabelSettingsDialog(false);
          }
        }}
      />

      {/* Product Camera Scanner Modal */}
      <Dialog open={showProductCameraScanner} onOpenChange={setShowProductCameraScanner}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader className="mb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ScanBarcode className="w-5 h-5 text-primary" />
              Scan Barcode Produk Lewat Kamera HP
            </DialogTitle>
          </DialogHeader>

          {showProductCameraScanner && (
            <CameraBarcodeScanner
              onScan={(scannedCode) => {
                setShowProductCameraScanner(false);
                handleMasterBarcodeSearch(scannedCode);
              }}
              onClose={() => setShowProductCameraScanner(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Print Confirmation Dialog */}
      <Dialog open={Boolean(quickPrintProduct)} onOpenChange={(open) => !open && setQuickPrintProduct(null)}>
        <DialogContent className="max-w-md p-5 rounded-2xl">
          <DialogHeader className="mb-1">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Printer className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Konfirmasi Cetak Stiker Barcode
            </DialogTitle>
          </DialogHeader>

          {quickPrintProduct && (
            <div className="space-y-4 pt-1">
              {/* Product Info Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                  <Barcode className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-foreground truncate">{quickPrintProduct.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                    <span>Barcode: {quickPrintProduct.barcode || quickPrintProduct.sku || '-'}</span>
                    <span>•</span>
                    <span>Stok: <strong className="text-foreground">{quickPrintProduct.stock || 0}</strong></span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(quickPrintProduct.price)}
                  </span>
                </div>
              </div>

              {/* Quantity Stepper & Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    Berapa stiker yang ingin dicetak?
                  </Label>
                  <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold">
                    {quickPrintQuantity} stiker
                  </span>
                </div>

                <div className="flex items-center justify-center border rounded-xl overflow-hidden bg-background h-10 w-full shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQuickPrintQuantity((prev) => Math.max(1, prev - 1))}
                    disabled={quickPrintQuantity <= 1}
                    className="w-12 h-full flex items-center justify-center hover:bg-muted disabled:opacity-30 text-foreground font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={quickPrintQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setQuickPrintQuantity(isNaN(val) || val < 1 ? 1 : val);
                    }}
                    className="w-full h-full text-center font-bold text-base bg-transparent border-0 focus:outline-hidden text-purple-700 dark:text-purple-300 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setQuickPrintQuantity((prev) => prev + 1)}
                    className="w-12 h-full flex items-center justify-center hover:bg-muted text-foreground font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-muted-foreground mr-1">Preset:</span>
                  {[
                    { label: '1 Stiker', qty: 1 },
                    { label: '3 (1 Baris)', qty: 3 },
                    { label: '6 (2 Baris)', qty: 6 },
                    { label: '12 (4 Baris)', qty: 12 },
                  ].map((p) => (
                    <button
                      key={p.qty}
                      type="button"
                      onClick={() => setQuickPrintQuantity(p.qty)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        quickPrintQuantity === p.qty
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  {quickPrintProduct.stock !== undefined && quickPrintProduct.stock > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuickPrintQuantity(quickPrintProduct.stock || 1)}
                      className="px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 text-xs font-semibold transition-all ml-auto"
                    >
                      Sesuai Stok ({quickPrintProduct.stock})
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuickPrintProduct(null)}
                  disabled={isExecutingQuickPrint}
                  className="rounded-xl h-9 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteQuickPrint}
                  disabled={isExecutingQuickPrint}
                  className="rounded-xl h-9 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-md"
                >
                  {isExecutingQuickPrint ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mencetak...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Cetak ({quickPrintQuantity} Stiker)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;

