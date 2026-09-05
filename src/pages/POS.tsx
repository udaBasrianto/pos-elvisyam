import { useEffect, useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { useHardware } from "@/contexts/HardwareContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProductImage } from "@/components/ProductImage";
import { toast } from "sonner";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Calculator,
  Package,
  Loader2,
  Percent,
  Edit3,
  Calendar,
  Check,
  X,
  Wallet,
  Users,
  AlertCircle,
  ScanBarcode,
  Camera,
  Store,
  Printer,
  Zap,
  Monitor,
  LayoutGrid,
  List,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import ReceiptDialog from "@/components/ReceiptDialog";
import { UniversalBarcodeScanner } from "@/components/UniversalBarcodeScanner";
import { useNavigate } from "react-router-dom";
import { CashierShiftDialog, CashShift } from "@/components/CashierShiftDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

import { Product, ProductUnit } from "@/contexts/AppContext";
import api from "@/lib/api";
import { 
  playScanBeep, 
  playQtySound, 
  playRemoveSound, 
  playSuccessSound, 
  playErrorSound, 
  playBeep 
} from "@/lib/sound";
import { resolveFullBarcodeInfo, parseRawBarcodeData } from "@/lib/barcodeParser";

interface CartItem extends Product {
  quantity: number;
  customPrice?: number;
  itemDiscount?: number;
  selectedUnitName?: string;
  conversionQty?: number;
  cartItemId?: string;
  selectedUnit?: any;
}

interface TransactionData {
  id?: string;
  customerName: string;
  items: {
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentAmount: number;
  changeAmount: number;
  earnedPoints?: number;
  accumulatedPoints?: number;
}

interface PromoCode {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  description?: string;
}

const POS = () => {
  const { state, addTransaction, loadData } = useApp();
  const { user } = useAuth();
  const { 
    openCashDrawer, 
    broadcastToDisplay, 
    clearDisplay,
    config: hwConfig,
    printerStatus,
    activePrinterType,
    autoDetectDevices,
    isScanningDevices,
  } = useHardware();
  const [searchQuery, setSearchQuery] = useState("");
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Error getting GPS location:", error);
        }
      );
    }
  }, []);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("semua");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'transfer' | 'ewallet' | 'balance' | 'credit'>('cash');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<TransactionData | null>(null);

  // Discount state
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [categoryDiscounts, setCategoryDiscounts] = useState<{ category: string; percent: number }[]>([]);
  const [categoryDiscountCategory, setCategoryDiscountCategory] = useState<string>("");
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [categoryDiscountPercent, setCategoryDiscountPercent] = useState<string>("");
  const [promoCode, setPromoCode] = useState<string>("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; type: 'percent' | 'fixed'; value: number } | null>(null);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);

  // Custom date state
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());

  // Barcode scanner states
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  // Shift state
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);

  // Refs for high-speed cashier keyboard shortcuts (F1 - F10)
  const searchInputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);

  const findProductByBarcode = (code: string) => {
    if (!code) return { product: undefined, unit: undefined, parsed: undefined };
    const parsed = parseRawBarcodeData(code);
    const candidateCodes = [
      parsed.barcode,
      parsed.sku,
      code.trim(),
    ].filter(Boolean) as string[];

    let found: Product | undefined = undefined;
    let matchedUnit: ProductUnit | undefined = undefined;

    for (const c of candidateCodes) {
      const q = c.toLowerCase().trim();
      const qRaw = c.trim();
      const qNoZeros = q.replace(/^0+/, '');

      found = state.products.find(p => 
        (p.barcode && p.barcode.trim().toLowerCase() === q) ||
        (p.barcode && p.barcode.trim() === qRaw) ||
        (p.sku && p.sku.trim().toLowerCase() === q) ||
        (p.sku && p.sku.trim() === qRaw) ||
        (p.barcode && qNoZeros && p.barcode.trim().toLowerCase() === qNoZeros) ||
        (p.id.toLowerCase() === q) ||
        (p.name && p.name.trim().toLowerCase() === q)
      );

      if (found) break;

      // Check product units
      for (const p of state.products) {
        if (p.units && p.units.length > 0) {
          const u = p.units.find(unit => 
            (unit.unitBarcode && unit.unitBarcode.trim().toLowerCase() === q) ||
            (unit.unitBarcode && unit.unitBarcode.trim() === qRaw)
          );
          if (u) {
            found = p;
            matchedUnit = u;
            break;
          }
        }
      }
      if (found) break;
    }

    return { product: found, unit: matchedUnit, parsed };
  };

  const handleCameraBarcodeScan = async (code: string) => {
    const codeClean = code.trim();
    const { product, unit } = findProductByBarcode(codeClean);

    setShowCameraScanner(false);

    if (product) {
      addToCart(product, unit);
    } else {
      const resolved = await resolveFullBarcodeInfo(codeClean);
      playErrorSound();

      const brandDesc = resolved.brand ? ` [Merk: ${resolved.brand}]` : '';
      const catDesc = resolved.category ? ` [Kategori: ${resolved.category}]` : '';
      const labelDesc = resolved.name ? `"${resolved.name}"${brandDesc}${catDesc}` : `"${resolved.barcode || codeClean}"`;

      toast.error(`Barcode ${labelDesc} terdeteksi! Namun belum terdaftar di stok toko.`, {
        duration: 9000,
        action: {
          label: "➕ Daftarkan Produk",
          onClick: () => {
            navigate("/products", { 
              state: { 
                autoBarcode: resolved.barcode || codeClean,
                prefillData: {
                  barcode: resolved.barcode || codeClean,
                  sku: resolved.sku || resolved.barcode || codeClean,
                  name: resolved.name,
                  brand: resolved.brand,
                  category: resolved.category,
                  price: resolved.price,
                  costPrice: resolved.costPrice,
                  unit: resolved.unit,
                }
              } 
            });
          }
        }
      });
    }
  };

  // Edit price state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");

  // Pagination state for high-performance rendering (e.g. 4,000+ products)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(24);

  const products = state.products;
  const categories = useMemo(() => {
    return ["semua", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (product.isActive === false) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        product.name.toLowerCase().includes(q) ||
        (product.barcode && product.barcode.toLowerCase().includes(q)) ||
        (product.sku && product.sku.toLowerCase().includes(q)) ||
        (product.brand && product.brand.toLowerCase().includes(q));
      const matchesCategory = selectedCategory === "semua" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Reset to page 1 whenever search query, category, or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, itemsPerPage]);

  const totalItemsCount = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItemsCount / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const startItemIdx = totalItemsCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItemIdx = Math.min(currentPage * itemsPerPage, totalItemsCount);

  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (current <= 3) {
      pages.push(1, 2, 3, 4, '...', total);
    } else if (current >= total - 2) {
      pages.push(1, '...', total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    return pages;
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === 'NumpadEnter') && searchQuery.trim()) {
      e.preventDefault();
      const q = searchQuery.trim();
      const { product, unit } = findProductByBarcode(q);

      if (product) {
        addToCart(product, unit);
        setSearchQuery("");
      } else if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearchQuery("");
      } else {
        const resolved = await resolveFullBarcodeInfo(q);
        playErrorSound();
        const brandDesc = resolved.brand ? ` [Merk: ${resolved.brand}]` : '';
        const catDesc = resolved.category ? ` [Kategori: ${resolved.category}]` : '';
        const labelDesc = resolved.name ? `"${resolved.name}"${brandDesc}${catDesc}` : `"${resolved.barcode || q}"`;

        toast.error(`Produk ${labelDesc} belum terdaftar di stok toko.`, {
          duration: 9000,
          action: {
            label: "➕ Daftarkan Produk",
            onClick: () => {
              navigate("/products", { 
                state: { 
                  autoBarcode: resolved.barcode || q,
                  prefillData: {
                    barcode: resolved.barcode || q,
                    sku: resolved.sku || resolved.barcode || q,
                    name: resolved.name,
                    brand: resolved.brand,
                    category: resolved.category,
                    price: resolved.price,
                    costPrice: resolved.costPrice,
                    unit: resolved.unit,
                  }
                } 
              });
            }
          }
        });
      }
    }
  };

  const addToCart = (product: Product, selectedUnit?: ProductUnit) => {
    const requiredQty = selectedUnit ? selectedUnit.conversionQty : 1;
    if (product.stock < requiredQty) {
      playErrorSound();
      toast.error(`Stok ${product.name} tidak mencukupi (sisa ${product.stock} ${product.unit || 'pcs'}).`);
      return;
    }

    // 🔊 Play barcode scanner beep tone on every product addition
    playScanBeep();

    setCart(prev => {
      const cartKey = selectedUnit ? `${product.id}-${selectedUnit.id}` : product.id;
      const existing = prev.find(item => item.cartItemId === cartKey || (!selectedUnit && !item.selectedUnit && item.id === product.id));

      if (existing) {
        return prev.map(item =>
          item === existing
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      const itemPrice = selectedUnit ? selectedUnit.price : product.price;
      const itemUnitName = selectedUnit ? selectedUnit.unitName : (product.unit || 'pcs');

      return [
        ...prev,
        {
          ...product,
          cartItemId: cartKey,
          price: itemPrice,
          unit: itemUnitName,
          selectedUnit: selectedUnit,
          quantity: 1,
        },
      ];
    });

    toast.success(`${product.name}${selectedUnit ? ` (${selectedUnit.unitName})` : ''} +1 ke keranjang`, { 
      duration: 1000, 
      position: "top-center" 
    });
  };

  // Global Hardware Barcode Scanner Listener (USB / Bluetooth / Wireless / Mobile POS HID Scanner)
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();
    let autoFlushTimer: any = null;

    const processBuffer = (targetInput?: HTMLInputElement | null) => {
      if (barcodeBuffer.trim().length >= 2) {
        const codeRaw = barcodeBuffer.trim();
        const { product, unit } = findProductByBarcode(codeRaw);

        if (product) {
          addToCart(product, unit);
          const unitLabel = unit ? ` [${unit.unitName}]` : '';
          toast.success(`⚡ [Scan Success] ${product.name}${unitLabel} ditambahkan!`);
          setSearchQuery("");
          if (targetInput) {
            targetInput.value = "";
          }
        } else {
          playErrorSound();
          toast.error(`⚡ [Scan Terdeteksi] Barcode "${codeRaw}" terbaca, namun belum terdaftar di produk.`, { duration: 5000 });
        }
        barcodeBuffer = "";
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock'].includes(e.key)) {
        return;
      }

      const target = e.target as HTMLElement;
      const isSearchInput = target && (target as HTMLInputElement).id === 'pos-search-input';

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Reset buffer if more than 350ms passed between keystrokes
      if (timeDiff > 350) {
        barcodeBuffer = "";
      }

      if (autoFlushTimer) {
        clearTimeout(autoFlushTimer);
        autoFlushTimer = null;
      }

      const isEnter = e.key === 'Enter' || e.key === 'NumpadEnter' || e.code === 'Enter' || e.code === 'NumpadEnter';
      const isTab = e.key === 'Tab' || e.code === 'Tab';

      if (isEnter || isTab) {
        if (barcodeBuffer.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          processBuffer(isSearchInput ? (target as HTMLInputElement) : null);
          barcodeBuffer = "";
        }
      } else if (e.key && e.key.length === 1) {
        barcodeBuffer += e.key;

        // Auto-flush fallback for scanners without Enter suffix
        autoFlushTimer = setTimeout(() => {
          if (barcodeBuffer.length >= 4 && timeDiff < 80) {
            processBuffer(isSearchInput ? (target as HTMLInputElement) : null);
          }
          barcodeBuffer = "";
        }, 120);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      if (autoFlushTimer) clearTimeout(autoFlushTimer);
    };
  }, [state.products]);

  // High-Speed Cashier Keyboard Hotkeys Listener (F1, F2, F4, F8, F10, Esc)
  useEffect(() => {
    const handleHotkeys = (e: KeyboardEvent) => {
      // F1: Focus Search Input / Barcode Field
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        toast.info("🔍 [F1] Mode Cari / Scan Barcode", { duration: 1500 });
      }

      // F2: Cycle Payment Methods
      if (e.key === 'F2') {
        e.preventDefault();
        const methods: ('cash' | 'transfer' | 'ewallet' | 'balance' | 'credit')[] = ['cash', 'transfer', 'ewallet', 'balance', 'credit'];
        setSelectedPaymentMethod(prev => {
          const nextIdx = (methods.indexOf(prev) + 1) % methods.length;
          const nextMethod = methods[nextIdx];
          toast.info(`💳 [F2] Metode Bayar: ${nextMethod.toUpperCase()}`, { duration: 1500 });
          return nextMethod;
        });
      }

      // F8: Focus Nominal Uang Bayar
      if (e.key === 'F8') {
        e.preventDefault();
        if (selectedPaymentMethod !== 'cash') {
          setSelectedPaymentMethod('cash');
        }
        setTimeout(() => {
          paymentInputRef.current?.focus();
          paymentInputRef.current?.select();
          toast.info("💵 [F8] Input Nominal Uang Bayar", { duration: 1500 });
        }, 50);
      }

      // F10: Fast Checkout / Bayar & Cetak Struk
      if (e.key === 'F10') {
        e.preventDefault();
        if (cart.length > 0) {
          processPayment();
        } else {
          toast.error("Keranjang masih kosong.");
        }
      }

      // Esc: Reset Keranjang Belanjaan
      if (e.key === 'Escape') {
        if (!showCameraScanner && !showReceipt && cart.length > 0) {
          e.preventDefault();
          if (window.confirm("⚠️ Batalkan dan kosongkan semua item di keranjang?")) {
            setCart([]);
            localStorage.removeItem('pos_cart');
            toast.info("🗑️ Keranjang telah dikosongkan.");
          }
        }
      }
    };

    window.addEventListener('keydown', handleHotkeys);
    return () => window.removeEventListener('keydown', handleHotkeys);
  }, [cart, selectedPaymentMethod, showCameraScanner, showReceipt]);

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity === 0) {
      playRemoveSound();
      setCart(cart.filter(item => item.id !== id));
      return;
    }

    const product = products.find(p => p.id === id);
    if (product && newQuantity > product.stock) {
      playErrorSound();
      toast.error(`Stok ${product.name} hanya tersisa ${product.stock}.`);
      return;
    }

    playQtySound();
    setCart(cart.map(item =>
      item.id === id
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (id: string) => {
    playRemoveSound();
    setCart(cart.filter(item => item.id !== id));
  };

  const loadPromoCodes = async () => {
    try {
      const res = await api.get('/promo-codes');
      const data = res.data as PromoCode[] | undefined;
      if (data && Array.isArray(data)) {
        setPromoCodes(
          data.map((code) => ({
            id: code.id,
            code: code.code,
            type: code.type === 'fixed' ? 'fixed' : 'percent',
            value: Number(code.value) || 0,
            description: code.description,
          }))
        );
      } else {
        setPromoCodes([]);
      }
    } catch (error) {
      console.error('Failed to load promo codes', error);
    }
  };

  useEffect(() => {
    loadPromoCodes();
    loadData();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pos_cart');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('pos_cart', JSON.stringify(cart));
      // Dispatch custom event for real-time synchronization with NavBottom / Sidebar
      window.dispatchEvent(new Event("pos-cart-updated"));
    } catch {}
  }, [cart]);

  const getCategoryDiscountForItem = (item: CartItem) => {
    const rule = categoryDiscounts.find(r => r.category === item.category);
    if (!rule) return 0;
    const price = item.customPrice ?? item.price;
    const itemTotal = price * item.quantity;
    return Math.round(itemTotal * (rule.percent / 100));
  };

  const subtotalBeforeDiscount = cart.reduce((total, item) => {
    const price = item.customPrice ?? item.price;
    const itemTotal = price * item.quantity;
    return total + itemTotal;
  }, 0);

  const itemDiscountTotal = cart.reduce((total, item) => {
    const discount = item.itemDiscount ?? 0;
    return total + discount;
  }, 0);

  const categoryDiscountTotal = cart.reduce((total, item) => {
    return total + getCategoryDiscountForItem(item);
  }, 0);

  const subtotalAmount = subtotalBeforeDiscount - itemDiscountTotal - categoryDiscountTotal;

  const rawGlobalDiscount = discountType === 'percent'
    ? Math.round(subtotalAmount * (globalDiscount / 100))
    : globalDiscount;
  const globalDiscountAmount = Math.max(0, Math.min(rawGlobalDiscount, Math.max(0, subtotalAmount)));

  const rawPromoDiscount = appliedPromo
    ? appliedPromo.type === 'percent'
      ? Math.round(subtotalAmount * (appliedPromo.value / 100))
      : appliedPromo.value
    : 0;

  const promoDiscount = Math.max(0, Math.min(rawPromoDiscount, Math.max(0, subtotalAmount - globalDiscountAmount)));

  const afterDiscountAmount = subtotalAmount - globalDiscountAmount - promoDiscount;
  const taxAmount = Math.round(afterDiscountAmount * (state.settings.taxRate / 100));

  const selectedCustomerObj = selectedCustomer ? state.customers.find(c => c.id === selectedCustomer) : null;
  const isCustomerMember = selectedCustomerObj ? (selectedCustomerObj.isMember || (selectedCustomerObj.totalSpent || 0) >= (state.settings.minSpendForMember || 100000)) : false;
  const customerPoints = selectedCustomerObj?.points || 0;
  const pointValue = state.settings.pointValue || 100;
  const pointDiscountAmount = Math.min(pointsToRedeem * pointValue, Math.max(0, afterDiscountAmount + taxAmount));

  const totalAmount = Math.max(0, afterDiscountAmount + taxAmount - pointDiscountAmount);
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const paidAmount = parseFloat(paymentAmount) || 0;
  const changeAmount = paidAmount - totalAmount;

  // 🖥️ Live sync to external Customer Display monitor
  useEffect(() => {
    if (cart.length === 0) {
      return;
    }

    broadcastToDisplay({
      type: 'cart_update',
      storeName: state.settings?.businessName || 'Toko Kami',
      items: cart.map(item => {
        const unitPrice = item.customPrice ?? item.price;
        const discount = item.itemDiscount ?? 0;
        const sub = (unitPrice * item.quantity) - discount;
        return {
          name: item.name + (item.selectedUnit ? ` (${item.selectedUnit.unitName})` : ''),
          qty: item.quantity,
          price: unitPrice,
          subtotal: sub,
        };
      }),
      total: totalAmount,
    });
  }, [cart, totalAmount, state.settings?.businessName, broadcastToDisplay]);

  const handleAddCategoryDiscount = () => {
    if (!categoryDiscountCategory) {
      toast.error("Pilih kategori untuk diskon.");
      return;
    }
    const percent = parseFloat(categoryDiscountPercent);
    if (!percent || percent <= 0) {
      toast.error("Persentase diskon kategori harus lebih dari 0.");
      return;
    }
    setCategoryDiscounts(prev => {
      const filtered = prev.filter(r => r.category === categoryDiscountCategory ? false : true);
      return [...filtered, { category: categoryDiscountCategory, percent }];
    });
    setCategoryDiscountPercent("");
  };

  const handleRemoveCategoryDiscount = (category: string) => {
    setCategoryDiscounts(prev => prev.filter(r => r.category !== category));
  };

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setAppliedPromo(null);
      return;
    }
    const promo = promoCodes.find(p => p.code.toUpperCase() === code);
    if (!promo) {
      toast.error("Kode promo tidak dikenali.");
      setAppliedPromo(null);
      return;
    }
    setAppliedPromo({ code: promo.code.toUpperCase(), type: promo.type, value: promo.value });
  };

  // Update item price
  const updateItemPrice = (id: string, newPrice: number) => {
    setCart(cart.map(item =>
      item.id === id
        ? { ...item, customPrice: newPrice }
        : item
    ));
    setEditingPriceId(null);
  };

  // Update item discount
  const updateItemDiscount = (id: string, discount: number) => {
    setCart(cart.map(item =>
      item.id === id
        ? { ...item, itemDiscount: discount }
        : item
    ));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      toast.error("Tambahkan produk ke keranjang terlebih dahulu.");
      return;
    }

    if (selectedPaymentMethod === 'cash' && paidAmount < totalAmount) {
      toast.error("Jumlah pembayaran kurang dari total.");
      return;
    }

    if (selectedPaymentMethod === 'credit') {
      if (!selectedCustomer) {
        toast.error("Pilih pelanggan terlebih dahulu untuk transaksi kredit.");
        return;
      }
    }

    setIsProcessingPayment(true);

    try {
      const customer = selectedCustomer ? state.customers.find(c => c.id === selectedCustomer) : null;

      const transactionData = {
        customerId: selectedCustomer || undefined,
        customerName: customer ? customer.name : "Walk-in Customer",
        items: cart.map(item => {
          const price = item.customPrice ?? item.price;
          const itemTotal = price * item.quantity;
          const discount = (item.itemDiscount ?? 0) + getCategoryDiscountForItem(item);
          return {
            productId: item.id,
            productName: item.name,
            price: price,
            quantity: item.quantity,
            subtotal: itemTotal - discount,
          };
        }),
        subtotal: subtotalAmount,
        discount: globalDiscountAmount + promoDiscount,
        tax: taxAmount,
        total: totalAmount,
        paymentMethod: selectedPaymentMethod,
        paymentAmount: ['balance', 'transfer', 'ewallet'].includes(selectedPaymentMethod)
          ? totalAmount
          : selectedPaymentMethod === 'credit'
            ? 0
            : paidAmount,
        changeAmount: ['balance', 'transfer', 'ewallet', 'credit'].includes(selectedPaymentMethod)
          ? 0
          : (changeAmount > 0 ? changeAmount : 0),
        status: selectedPaymentMethod === 'credit' ? 'pending' as const : 'completed' as const,
        createdAt: useCustomDate && customDate ? customDate.toISOString() : undefined,
        latitude: gpsLocation?.latitude || null,
        longitude: gpsLocation?.longitude || null,
        pointsRedeemed: pointsToRedeem > 0 ? pointsToRedeem : undefined,
      };

      if (selectedPaymentMethod === 'balance') {
        if (!selectedCustomer) {
          toast.error("Pilih pelanggan terlebih dahulu untuk pembayaran menggunakan saldo.");
          setIsProcessingPayment(false);
          return;
        }
        if (customer && customer.balance < totalAmount) {
          toast.error("Saldo pelanggan tidak mencukupi.");
          setIsProcessingPayment(false);
          return;
        }
      }

      const newTransaction = await addTransaction(transactionData);

      // Set last transaction for receipt
      setLastTransaction({
        id: newTransaction?.invoiceNumber || (newTransaction?.id && newTransaction.id.length > 8 ? newTransaction.id.slice(0, 8).toUpperCase() : newTransaction?.id),
        customerName: transactionData.customerName,
        items: transactionData.items,
        subtotal: transactionData.subtotal,
        tax: transactionData.tax,
        discount: transactionData.discount,
        total: transactionData.total,
        paymentMethod: transactionData.paymentMethod,
        paymentAmount: transactionData.paymentAmount,
        changeAmount: transactionData.changeAmount,
        earnedPoints: newTransaction?.earnedPoints,
        accumulatedPoints: newTransaction?.accumulatedPoints,
      });

      // Show receipt dialog
      setShowReceipt(true);
      playSuccessSound();

      // 🔧 Hardware: Open Cash Drawer automatically on cash payment
      if (transactionData.paymentMethod === 'cash' || (transactionData.paymentMethod as string) === 'tunai') {
        openCashDrawer();
      }

      // 🖥️ Hardware: Broadcast full digital receipt to Customer Display
      const invoiceNum = newTransaction?.invoiceNumber || (newTransaction?.id && newTransaction.id.length > 8 ? newTransaction.id.slice(0, 8).toUpperCase() : newTransaction?.id) || 'INV-' + Date.now();
      const now = new Date();
      broadcastToDisplay({
        type: 'checkout_done',
        storeName: state.settings?.businessName || 'Toko Kami',
        storeAddress: state.settings?.businessAddress,
        storePhone: state.settings?.businessPhone,
        invoiceNumber: String(invoiceNum),
        cashierName: user?.full_name || user?.email || 'Kasir',
        customerName: selectedCustomerObj?.name || 'Umum',
        date: now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        items: transactionData.items.map((item: any) => ({
          name: item.name,
          qty: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        })),
        subtotal: transactionData.subtotal,
        discount: transactionData.discount,
        tax: transactionData.tax,
        total: transactionData.total,
        paid: transactionData.paymentAmount,
        change: transactionData.changeAmount,
        paymentMethod: transactionData.paymentMethod,
        receiptFooter: state.settings?.receiptFooter || 'Terima kasih atas kunjungan Anda!',
        earnedPoints: newTransaction?.earnedPoints,
        accumulatedPoints: newTransaction?.accumulatedPoints,
      });

      // Clear cart and reset
      setCart([]);
      localStorage.removeItem('pos_cart');
      setPaymentAmount("");
      setGlobalDiscount(0);
      setUseCustomDate(false);
      setCustomDate(new Date());
      setSelectedCustomer(null);
      setSelectedPaymentMethod('cash');

    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Terjadi kesalahan saat memproses pembayaran.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-start">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-3">
          {/* 🚀 Compact Hardware Status & Auto-Detect Bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-card rounded-xl border border-border/80 text-xs shadow-2xs">
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
              {/* Printer Status */}
              <div className="flex items-center gap-1 shrink-0 font-medium">
                <Printer className="w-3.5 h-3.5 text-primary" />
                {printerStatus === 'connected' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {activePrinterType.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Printer Off</span>
                )}
              </div>

              <span className="text-border">•</span>

              {/* Scanner Status */}
              <div className="flex items-center gap-1 shrink-0 font-medium">
                <ScanBarcode className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Scanner Aktif</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] px-2 gap-1 text-primary hover:bg-primary/10 rounded-lg font-medium"
                onClick={() => {
                  const w = window.open('/customer-display', 'customer_display', 'width=1024,height=768,left=1920,top=0');
                  if (w) {
                    toast.success('🖥️ Layar Pelanggan dibuka!');
                  } else {
                    toast.error('Izinkan popup browser untuk membuka Layar Pelanggan.');
                  }
                }}
              >
                <Monitor className="w-3 h-3" />
                <span className="hidden sm:inline">Layar Pelanggan</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground rounded-lg"
                onClick={() => navigate('/hardware-settings')}
              >
                Hardware ⚙️
              </Button>
            </div>
          </div>

          {/* Search Bar, Category Dropdown & View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                ref={searchInputRef}
                id="pos-search-input"
                placeholder="Scan Barcode / SKU / Cari Produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-9 pr-10 h-10 bg-card rounded-xl border-border/80 text-xs sm:text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowCameraScanner(true)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title="Buka Kamera Barcode Scanner"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Category Dropdown Filter */}
            <div className="w-[125px] sm:w-[165px] shrink-0">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-10 bg-card rounded-xl border-border/80 text-xs sm:text-sm font-medium capitalize">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Kategori" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="capitalize text-xs sm:text-sm cursor-pointer">
                      {category === "semua" ? "✨ Semua Kategori" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle (Grid / List) */}
            <div className="flex bg-muted/80 p-0.5 rounded-xl border border-border/60 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-card text-primary shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Tampilan Grid Kartu"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-card text-primary shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Tampilan List Kompak"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Quick Scroll Tabs */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none py-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-primary text-white shadow-xs font-bold'
                      : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70'
                  }`}
                >
                  {cat === 'semua' ? '✨ Semua' : cat}
                </button>
              ))}
            </div>
          )}

          {/* Sub-bar: Item count summary & Items Per Page Selector */}
          <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
            <span className="font-medium">
              Total <span className="font-bold text-foreground">{totalItemsCount.toLocaleString('id-ID')}</span> produk
              {searchQuery.trim() && <span className="text-primary ml-1 font-semibold">(difilter)</span>}
              {totalItemsCount > 0 && (
                <span className="hidden sm:inline ml-1 text-muted-foreground/80">
                  • Hal. {currentPage} dari {totalPages}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground hidden sm:inline">Per halaman:</span>
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[11px] font-bold">
                {[24, 48, 72, 96].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setItemsPerPage(size)}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      itemsPerPage === size
                        ? 'bg-card text-primary font-bold shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Products Grid / List */}
          {filteredProducts.length === 0 ? (
            <Card className="bg-card border-border/80 shadow-xs rounded-2xl">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Belum ada produk yang cocok dengan pencarian.</p>
              </CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {paginatedProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-card rounded-2xl border border-border/80 hover:border-primary/50 shadow-2xs hover:shadow-xs transition-all cursor-pointer group p-3 flex items-center justify-between gap-3"
                  onClick={() => addToCart(product)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden">
                      <ProductImage src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground text-xs sm:text-sm truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {product.brand && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">{product.brand}</span>
                        )}
                        <Badge 
                          variant={product.stock > 10 ? "secondary" : "destructive"} 
                          className="text-[9px] py-0 px-1.5"
                        >
                          Stok: {product.stock}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs sm:text-sm font-extrabold text-primary font-mono whitespace-nowrap">
                      {formatCurrency(product.price)}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-2xs">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
              {paginatedProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-card rounded-2xl border border-border/80 hover:border-primary/50 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between overflow-hidden p-2.5 sm:p-3"
                  onClick={() => addToCart(product)}
                >
                  <div>
                    <div className="aspect-square rounded-xl mb-2 overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                      <ProductImage src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute top-1.5 right-1.5">
                        <Badge 
                          variant={product.stock > 10 ? "secondary" : "destructive"} 
                          className="text-[9px] px-1.5 py-0 font-bold backdrop-blur-md bg-white/90 dark:bg-slate-900/90 shadow-2xs"
                        >
                          Stok: {product.stock}
                        </Badge>
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground text-xs sm:text-sm line-clamp-2 leading-tight min-h-[2rem]">
                      {product.name}
                    </h3>
                    {product.brand && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{product.brand}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                    <span className="text-xs sm:text-sm font-extrabold text-primary font-mono">
                      {formatCurrency(product.price)}
                    </span>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-2xs">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-2 border-t border-border/60 text-xs text-muted-foreground">
              <div className="text-xs font-medium">
                Menampilkan <span className="font-bold text-foreground">{startItemIdx}</span>–<span className="font-bold text-foreground">{endItemIdx}</span> dari <span className="font-bold text-foreground">{totalItemsCount.toLocaleString('id-ID')}</span> produk
              </div>
              <div className="flex items-center gap-1 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 rounded-lg"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5 rounded-lg gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Sebelumnya</span>
                </Button>

                <div className="flex items-center gap-1">
                  {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                    p === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-muted-foreground text-xs">
                        …
                      </span>
                    ) : (
                      <Button
                        key={`page-${p}`}
                        variant={currentPage === p ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(p as number)}
                        className={`h-8 w-8 p-0 rounded-lg text-xs font-semibold ${
                          currentPage === p ? 'shadow-xs' : 'hover:border-primary/50'
                        }`}
                      >
                        {p}
                      </Button>
                    )
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2.5 rounded-lg gap-1"
                >
                  <span className="hidden sm:inline text-xs">Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0 rounded-lg"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div id="pos-cart-section" className="space-y-4 lg:sticky lg:top-6">
          <Card className="bg-gradient-card border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Keranjang ({totalItems})
              </CardTitle>
              {/* Large Sticky Total Display (Fixed at Top of Cart) */}
              <div className="mt-3 p-4 bg-primary/10 rounded-lg text-center border border-primary/20 bg-card">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">TOTAL TRANSAKSI</span>
                <span className="text-2xl md:text-3xl font-black text-primary tracking-tight">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              {/* Customer Selection */}
              <div className="mt-4 space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Pelanggan</Label>
                <div className="flex gap-2">
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedCustomer || ""}
                    onChange={(e) => {
                      setSelectedCustomer(e.target.value || null);
                      setPointsToRedeem(0);
                    }}
                  >
                    <option value="">Walk-in Customer</option>
                    {state.customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.isMember ? `[Member ${c.memberTier || 'Silver'}]` : ''} ({formatCurrency(c.balance)})</option>
                    ))}
                  </select>
                </div>

                {/* Member & Points Widget */}
                {selectedCustomerObj && (
                  <div className="p-2.5 bg-primary/5 rounded-xl border border-primary/20 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        {isCustomerMember ? (
                          <Badge className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
                            selectedCustomerObj.memberTier === 'platinum' ? 'bg-purple-600 text-white' :
                            selectedCustomerObj.memberTier === 'gold' ? 'bg-amber-500 text-white' :
                            'bg-slate-700 text-white'
                          }`}>
                            🏆 Member {selectedCustomerObj.memberTier || 'Silver'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Pelanggan Reguler
                          </Badge>
                        )}
                      </div>
                      <span className="font-semibold text-primary font-mono text-[11px]">
                        Saldo: <strong>{customerPoints} Poin</strong> ({formatCurrency(customerPoints * pointValue)})
                      </span>
                    </div>

                    {!isCustomerMember && (
                      <p className="text-[10px] text-muted-foreground">
                        Belanja {formatCurrency(Math.max(0, (state.settings.minSpendForMember || 100000) - (selectedCustomerObj.totalSpent || 0)))} lagi untuk jadi <strong>Member</strong>!
                      </p>
                    )}

                    {isCustomerMember && customerPoints > 0 && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-primary/10">
                        <span className="text-[11px] font-medium text-foreground">Tukar Poin Diskon:</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max={customerPoints}
                            value={pointsToRedeem || ""}
                            onChange={(e) => {
                              const val = Math.min(customerPoints, Math.max(0, parseInt(e.target.value) || 0));
                              setPointsToRedeem(val);
                            }}
                            placeholder="0"
                            className="w-16 h-7 text-xs text-right font-mono"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-2"
                            onClick={() => setPointsToRedeem(customerPoints)}
                          >
                            Semua
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Keranjang masih kosong</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const displayPrice = item.customPrice ?? item.price;
                      const itemTotal = displayPrice * item.quantity;
                      const itemDiscount = item.itemDiscount ?? 0;
                      const categoryDiscountForItem = getCategoryDiscountForItem(item);

                      return (
                        <div key={item.id} className="p-3 bg-slate-50/90 dark:bg-slate-900/60 hover:bg-slate-100/90 dark:hover:bg-slate-900/90 transition-colors rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{item.name}</p>

                              {/* Editable Price */}
                              {editingPriceId === item.id ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <Input
                                    type="number"
                                    value={tempPrice}
                                    onChange={(e) => setTempPrice(e.target.value)}
                                    className="h-6 w-20 text-xs"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      const newPrice = parseFloat(tempPrice);
                                      if (!isNaN(newPrice) && newPrice >= 0) {
                                        updateItemPrice(item.id, newPrice);
                                      }
                                    }}
                                  >
                                    <Check className="w-3 h-3 text-green-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setEditingPriceId(null)}
                                  >
                                    <X className="w-3 h-3 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <p className={`text-xs ${item.customPrice ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                                    {formatCurrency(displayPrice)}
                                    {item.customPrice && <span className="ml-1">(custom)</span>}
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0"
                                    onClick={() => {
                                      setEditingPriceId(item.id);
                                      setTempPrice(displayPrice.toString());
                                    }}
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-8 h-8 p-0"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-8 h-8 p-0"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFromCart(item.id)}
                                className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Item Discount */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Diskon item:</span>
                              <Input
                                type="number"
                                placeholder="0"
                                value={itemDiscount || ""}
                                onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                                className="h-6 w-20 text-xs"
                              />
                            </div>
                            <span className="font-medium">
                              {formatCurrency(Math.max(0, itemTotal - itemDiscount - categoryDiscountForItem))}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4 space-y-3">
                    {/* Global Discount */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        Diskon Total
                      </p>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            placeholder={discountType === 'fixed' ? "Diskon (Rp)..." : "Diskon (%)..."}
                            value={globalDiscount || ""}
                            onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <Button
                          variant={discountType === 'percent' ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDiscountType('percent')}
                        >
                          %
                        </Button>
                        <Button
                          variant={discountType === 'fixed' ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDiscountType('fixed')}
                        >
                          Rp
                        </Button>
                      </div>
                    </div>


                    {/* Promo Code */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Kode Promo</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Masukkan kode promo"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleApplyPromo}
                        >
                          Terapkan
                        </Button>
                      </div>
                      {appliedPromo && promoDiscount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {appliedPromo.code} -{" "}
                          {appliedPromo.type === "percent"
                            ? `${appliedPromo.value}%`
                            : formatCurrency(appliedPromo.value)}{" "}
                          diterapkan
                        </p>
                      )}
                    </div>

                    {/* Custom Date */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Tanggal Transaksi
                        </p>
                        <Button
                          variant={useCustomDate ? "default" : "outline"}
                          size="sm"
                          onClick={() => setUseCustomDate(!useCustomDate)}
                        >
                          {useCustomDate ? "Kustom" : "Sekarang"}
                        </Button>
                      </div>
                      {useCustomDate && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {customDate ? format(customDate, "PPP", { locale: idLocale }) : "Pilih tanggal"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={customDate}
                              onSelect={setCustomDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    {/* Payment Methods */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Metode Pembayaran</p>
                      <div className="grid grid-cols-4 gap-2">
                        <Button
                          variant={selectedPaymentMethod === 'cash' ? "default" : "outline"}
                          size="sm"
                          className="flex flex-col items-center p-2 h-auto"
                          onClick={() => setSelectedPaymentMethod('cash')}
                        >
                          <Banknote className="w-4 h-4 mb-1" />
                          <span className="text-xs">Tunai</span>
                        </Button>
                        <Button
                          variant={selectedPaymentMethod === 'transfer' ? "default" : "outline"}
                          size="sm"
                          className="flex flex-col items-center p-2 h-auto"
                          onClick={() => setSelectedPaymentMethod('transfer')}
                        >
                          <CreditCard className="w-4 h-4 mb-1" />
                          <span className="text-xs">Transfer</span>
                        </Button>
                        <Button
                          variant={selectedPaymentMethod === 'ewallet' ? "default" : "outline"}
                          size="sm"
                          className="flex flex-col items-center p-2 h-auto"
                          onClick={() => setSelectedPaymentMethod('ewallet')}
                        >
                          <Smartphone className="w-4 h-4 mb-1" />
                          <span className="text-xs">E-Wallet</span>
                        </Button>
                        <Button
                          variant={selectedPaymentMethod === 'balance' ? "default" : "outline"}
                          size="sm"
                          className="flex flex-col items-center p-2 h-auto"
                          onClick={() => {
                            if (!selectedCustomer) {
                              toast.info("Pilih pelanggan terlebih dahulu");
                            }
                            setSelectedPaymentMethod('balance');
                          }}
                        >
                          <Wallet className="w-4 h-4 mb-1" />
                          <span className="text-xs">Saldo</span>
                        </Button>
                        <Button
                          variant={selectedPaymentMethod === 'credit' ? "default" : "outline"}
                          size="sm"
                          className="flex flex-col items-center p-2 h-auto"
                          onClick={() => {
                            if (!selectedCustomer) {
                              toast.info("Pilih pelanggan terlebih dahulu");
                              return;
                            }
                            setSelectedPaymentMethod('credit');
                          }}
                        >
                          <CreditCard className="w-4 h-4 mb-1" />
                          <span className="text-xs">Kredit</span>
                        </Button>
                      </div>
                    </div>

                    {/* Amount breakdown */}
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(subtotalBeforeDiscount)}</span>
                      </div>
                      {itemDiscountTotal > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <span>Diskon item:</span>
                          <span>-{formatCurrency(itemDiscountTotal)}</span>
                        </div>
                      )}
                      {categoryDiscountTotal > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <span>Diskon kategori:</span>
                          <span>-{formatCurrency(categoryDiscountTotal)}</span>
                        </div>
                      )}
                      {globalDiscountAmount > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <span>
                            Diskon total {discountType === "percent" ? `(${globalDiscount}%)` : ""}
                          </span>
                          <span>-{formatCurrency(globalDiscountAmount)}</span>
                        </div>
                      )}
                      {promoDiscount > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <span>Diskon promo{appliedPromo ? ` (${appliedPromo.code})` : ""}:</span>
                          <span>-{formatCurrency(promoDiscount)}</span>
                        </div>
                      )}
                      {pointDiscountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-semibold">
                          <span>Diskon Penukaran ({pointsToRedeem} Poin):</span>
                          <span>-{formatCurrency(pointDiscountAmount)}</span>
                        </div>
                      )}
                      {state.settings.taxRate > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Pajak ({state.settings.taxRate}%):</span>
                          <span>{formatCurrency(taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-foreground text-lg pt-2 border-t">
                        <span>Total:</span>
                        <span className="text-primary">{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>

                    {/* Cash Payment Input */}
                    {selectedPaymentMethod === 'cash' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-medium text-foreground">Jumlah Bayar</label>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 text-xs text-primary hover:no-underline"
                            onClick={() => setPaymentAmount(totalAmount.toString())}
                          >
                            Uang Pas
                          </Button>
                        </div>
                        <Input
                          ref={paymentInputRef}
                          type="number"
                          placeholder="Masukkan jumlah uang (F8)..."
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              processPayment();
                            }
                          }}
                        />
                        {paidAmount > 0 && paidAmount >= totalAmount && (
                          <div className="flex justify-between text-success font-medium">
                            <span>Kembalian:</span>
                            <span>{formatCurrency(changeAmount)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Customer Balance Payment Info */}
                    {selectedPaymentMethod === 'balance' && (
                      <div className="p-3 rounded-lg border bg-muted/40 space-y-2 text-xs">
                        {selectedCustomer ? (
                          (() => {
                            const cust = state.customers.find(c => c.id === selectedCustomer);
                            const currentBal = Number(cust?.balance || 0);
                            const isEnough = currentBal >= totalAmount;
                            return (
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Pelanggan:</span>
                                  <span className="font-semibold text-foreground">{cust?.name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Saldo Saat Ini:</span>
                                  <span className={`font-bold ${currentBal > 0 ? 'text-emerald-600 dark:text-emerald-400' : currentBal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                                    {formatCurrency(currentBal)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pt-1 border-t">
                                  <span className="text-muted-foreground">Sisa Saldo Setelah Transaksi:</span>
                                  <span className={`font-bold ${isEnough ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {formatCurrency(currentBal - totalAmount)}
                                  </span>
                                </div>
                                {!isEnough && (
                                  <div className="text-rose-600 dark:text-rose-400 font-medium text-[11px] pt-1 flex items-start gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span>Saldo tidak mencukupi (Kurang: {formatCurrency(totalAmount - currentBal)}). Silakan top up di menu Pelanggan.</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Pilih pelanggan terlebih dahulu di bagian atas untuk bayar pakai Saldo.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Credit Payment Info */}
                    {selectedPaymentMethod === 'credit' && (
                      <div className="p-3 rounded-lg border bg-muted/40 space-y-2 text-xs">
                        {selectedCustomer ? (
                          (() => {
                            const cust = state.customers.find(c => c.id === selectedCustomer);
                            const currentBal = Number(cust?.balance || 0);
                            return (
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Pelanggan:</span>
                                  <span className="font-semibold text-foreground">{cust?.name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Saldo / Hutang Saat Ini:</span>
                                  <span className={`font-bold ${currentBal < 0 ? 'text-rose-600' : 'text-foreground'}`}>
                                    {currentBal < 0 ? `Hutang: ${formatCurrency(Math.abs(currentBal))}` : formatCurrency(currentBal)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pt-1 border-t">
                                  <span className="text-muted-foreground">Total Piutang Baru:</span>
                                  <span className="font-bold text-rose-600">
                                    {currentBal - totalAmount < 0 ? `Hutang: ${formatCurrency(Math.abs(currentBal - totalAmount))}` : formatCurrency(currentBal - totalAmount)}
                                  </span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Pilih pelanggan terlebih dahulu di bagian atas untuk transaksi Kredit / Kasbon.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Checkout Button */}
                    <Button
                      className="w-full bg-gradient-primary hover:opacity-90"
                      size="lg"
                      onClick={processPayment}
                      disabled={
                        cart.length === 0 || 
                        isProcessingPayment || 
                        (selectedPaymentMethod === 'cash' && paidAmount < totalAmount) ||
                        (selectedPaymentMethod === 'balance' && (!selectedCustomer || (state.customers.find(c => c.id === selectedCustomer)?.balance || 0) < totalAmount)) ||
                        (selectedPaymentMethod === 'credit' && !selectedCustomer)
                      }
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <Calculator className="w-4 h-4 mr-2" />
                          Proses Pembayaran
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Universal Barcode Scanner Modal */}
      <Dialog open={showCameraScanner} onOpenChange={setShowCameraScanner}>
        <DialogContent className="max-w-lg p-4">
          <DialogHeader className="mb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ScanBarcode className="w-5 h-5 text-primary" />
              Scanner Barcode Universal
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Pilih mode: Kamera HP, Scanner USB/Bluetooth, atau Input Manual
            </p>
          </DialogHeader>

          {showCameraScanner && (
            <UniversalBarcodeScanner
              onScan={handleCameraBarcodeScan}
              onClose={() => setShowCameraScanner(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <ReceiptDialog
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        transaction={lastTransaction}
      />

      {/* 📱 MOBILE FLOATING CHECKOUT BAR (Visible when items are in cart) */}
      {totalItems > 0 && (
        <div className="block lg:hidden fixed bottom-16 inset-x-3 z-40 animate-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white p-3 rounded-2xl shadow-xl border border-white/15 backdrop-blur-md flex items-center justify-between gap-3">
            <div 
              className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
              onClick={() => {
                const el = document.getElementById('pos-cart-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div className="relative w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShoppingCart className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              </div>
              <div className="truncate">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Keranjang</div>
                <div className="text-sm font-black text-white font-mono">{formatCurrency(totalAmount)}</div>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs shrink-0 gap-1.5"
              onClick={() => {
                const el = document.getElementById('pos-cart-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Bayar →
            </Button>
          </div>
        </div>
      )}

      {/* Cashier Hotkey Cheat Sheet Bar (High-Speed Retail UI) */}
      <div className="sticky bottom-2 z-30 w-full bg-slate-900/95 border border-slate-800 text-slate-300 py-2 px-4 backdrop-blur-md rounded-2xl shadow-xl hidden sm:flex items-center justify-between text-xs font-mono mt-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            ⚡ Shortcut Kasir
          </span>
          <div className="flex items-center gap-4 text-[11px]">
            <span><strong className="text-amber-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">F1</strong> Cari/Scan</span>
            <span><strong className="text-blue-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">F2</strong> Metode Bayar</span>
            <span><strong className="text-purple-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">F8</strong> Nominal Bayar</span>
            <span><strong className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">F10 / Enter</strong> Bayar & Struk</span>
            <span><strong className="text-red-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">ESC</strong> Reset</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>Modul Kasir High-Speed v2.5</span>
        </div>
      </div>
    </div>
  );
};

export default POS;
