import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import api from '../lib/api';
import { cacheData, getCachedData, enqueueSync, getSyncQueue, removeFromSyncQueue } from '../lib/db';

export interface ProductUnit {
  id?: string;
  unitName: string;
  conversionQty: number;
  unitPrice: number;
  price?: number;
  unitBarcode?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  sub_category?: string;
  brand?: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit?: string;
  units?: ProductUnit[];
  sku: string;
  barcode?: string;
  description?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
  productType?: 'physical' | 'digital';
  ownershipType?: 'owned' | 'consignment';
  supplier?: string;
  showInOnlineStore?: boolean;
  isActive?: boolean;
  isRawMaterial?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  joinDate: string;
  lastPurchase?: string;
  totalPurchases: number;
  totalSpent: number;
  balance: number;
  status: 'active' | 'inactive';
  points?: number;
  isMember?: boolean;
  memberTier?: 'silver' | 'gold' | 'platinum';
}

export interface Transaction {
  id: string;
  invoiceNumber?: string;
  customerId?: string;
  customerName: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'transfer' | 'ewallet' | 'balance' | 'credit';
  paymentAmount?: number;
  changeAmount?: number;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  createdAt: string;
  cashierId?: string;
  cashierName?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  pointsRedeemed?: number;
  earnedPoints?: number;
  accumulatedPoints?: number;
}

export interface TransactionInput extends Omit<Transaction, 'id' | 'createdAt'> {
  createdAt?: string;
  pointsRedeemed?: number;
}

export interface TransactionItem {
  id?: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  costPrice?: number;
}

export interface Settings {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  taxRate: number;
  defaultDiscount: number;
  currency: string;
  receiptTemplate: string;
  autoBackup: boolean;
  lowStockNotification: boolean;
  printReceipt: boolean;
  onlineStoreEnabled: boolean;
  serviceQueueEnabled?: boolean;
  workshopEnabled?: boolean;
  barbershopEnabled?: boolean;
  fnbEnabled?: boolean;
  laundryEnabled?: boolean;
  fnbServiceChargePercent?: number;
  serviceStations?: string;
  queuePrefix?: string;
  laundryPerfumeOptions?: string;
  laundryRackLocations?: string;
  laundryPrefix?: string;
  receiptFooter?: string;
  logoUrl?: string;
  description?: string;
  minSpendForMember?: number;
  pointRate?: number;
  pointValue?: number;
  goldThreshold?: number;
  platinumThreshold?: number;
  authBackground?: string;
  theme_color?: string;
  themeColor?: string;
  tagline?: string;
  businessLogo?: string;
  instagram_url?: string;
  facebook_url?: string;
  whatsapp_number?: string;
  footer_text?: string;
  store_reviews?: string;
  store_features?: string;
}

// State interface
interface AppState {
  products: Product[];
  customers: Customer[];
  transactions: Transaction[];
  settings: Settings;
  isLoading: boolean;
  error: string | null;
}

// Action types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_DATA'; payload: { products: Product[]; customers: Customer[]; transactions: Transaction[]; settings?: Settings } }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'SET_CUSTOMERS'; payload: Customer[] }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'RESET_DATA' };

// Initial state
const initialState: AppState = {
  products: [],
  customers: [],
  transactions: [],
  settings: {
    businessName: 'Toko Saya',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    taxRate: 0,
    defaultDiscount: 0,
    currency: 'IDR',
    receiptTemplate: 'default',
    autoBackup: false,
    lowStockNotification: true,
    printReceipt: true,
    onlineStoreEnabled: true,
    serviceQueueEnabled: false,
    workshopEnabled: false,
    barbershopEnabled: false,
    fnbEnabled: false,
    fnbServiceChargePercent: 0,
    serviceStations: 'Pit 1,Pit 2,Pit 3,Kursi 1,Kursi 2',
    queuePrefix: 'A',
    receiptFooter: 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat\ndikembalikan atau ditukar.',
  },
  isLoading: false,
  error: null,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'LOAD_DATA': return { ...state, ...action.payload, isLoading: false };
    case 'SET_PRODUCTS': return { ...state, products: action.payload };
    case 'ADD_PRODUCT': return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT': return { ...state, products: state.products.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PRODUCT': return { ...state, products: state.products.filter(p => p.id !== action.payload) };
    case 'SET_CUSTOMERS': return { ...state, customers: action.payload };
    case 'ADD_CUSTOMER': return { ...state, customers: [...state.customers, action.payload] };
    case 'UPDATE_CUSTOMER': return { ...state, customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CUSTOMER': return { ...state, customers: state.customers.filter(c => c.id !== action.payload) };
    case 'SET_TRANSACTIONS': return { ...state, transactions: action.payload };
    case 'ADD_TRANSACTION': return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'UPDATE_TRANSACTION': return { ...state, transactions: state.transactions.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TRANSACTION': return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    case 'UPDATE_SETTINGS': return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'RESET_DATA': return initialState;
    default: return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  loadData: () => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
  exportData: () => string;
  importData: (data: string) => Promise<boolean>;
  resetData: () => Promise<boolean>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'joinDate' | 'totalPurchases' | 'totalSpent' | 'status' | 'balance'>) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addTransaction: (transaction: TransactionInput) => Promise<Transaction | undefined>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user } = useAuth();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const [pRes, cRes, tRes, sRes] = await Promise.all([
        api.get('/products'),
        api.get('/customers'),
        api.get('/transactions?limit=2000'),
        api.get('/settings')
      ]);

      const products: Product[] = pRes.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category || '',
        brand: p.brand || '',
        price: Number(p.price),
        costPrice: Number(p.cost) || 0,
        stock: p.stock || 0,
        minStock: p.min_stock || 0,
        sku: p.sku || '',
        barcode: p.barcode || '',
        image: p.image || '',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        productType: (p.product_type || p.productType) === 'digital' ? 'digital' : 'physical',
        ownershipType: (p.ownership_type || p.ownershipType) === 'consignment' ? 'consignment' : 'owned',
        supplier: p.supplier || '',
        showInOnlineStore: !!p.show_in_online_store,
        isActive: p.is_active !== undefined ? !!p.is_active : (p.isActive !== undefined ? !!p.isActive : true),
        isRawMaterial: !!p.is_raw_material,
        unit: p.unit || 'pcs'
      }));

      const customers: Customer[] = cRes.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        notes: c.notes || '',
        joinDate: c.created_at,
        totalPurchases: Number(c.total_purchases) || 0,
        totalSpent: Number(c.total_spent) || Number(c.total_purchases) || 0,
        balance: Number(c.balance) || 0,
        status: 'active' as const,
        points: Number(c.points) || 0,
        isMember: Boolean(c.is_member),
        memberTier: (c.member_tier || 'silver') as 'silver' | 'gold' | 'platinum'
      }));

      const transactions: Transaction[] = tRes.data.map((t: any) => ({
        id: t.id,
        invoiceNumber: t.invoice_number || (t.id && t.id.length > 16 ? t.id.slice(0, 8).toUpperCase() : t.id),
        customerId: t.customer_id,
        customerName: t.customer_name || 'Walk-in Customer',
        items: (t.items || []).map((i: any) => ({
          id: i.id,
          productId: i.product_id,
          productName: i.product_name,
          price: Number(i.price),
          quantity: i.quantity,
          subtotal: Number(i.subtotal)
        })),
        subtotal: Number(t.subtotal),
        discount: Number(t.discount) || 0,
        tax: Number(t.tax) || 0,
        total: Number(t.total),
        paymentMethod: t.payment_method,
        paymentAmount: Number(t.payment_amount) || 0,
        changeAmount: Number(t.change_amount) || 0,
        status: t.status,
        createdAt: t.created_at,
        cashierId: t.user_id,
        cashierName: t.cashier_name || '',
        notes: t.notes || ''
      }));

      const settingsData = sRes.data;
      const settings: Settings = {
        businessName: settingsData.business_name || 'Toko Saya',
        businessAddress: settingsData.business_address || '',
        businessPhone: settingsData.business_phone || '',
        businessEmail: settingsData.business_email || '',
        taxRate: Number(settingsData.tax_rate) || 0,
        defaultDiscount: Number(settingsData.default_discount) || 0,
        currency: settingsData.currency || 'IDR',
        receiptTemplate: settingsData.receipt_template || 'default',
        autoBackup: !!settingsData.auto_backup,
        lowStockNotification: settingsData.low_stock_notification ?? true,
        printReceipt: settingsData.print_receipt ?? true,
        onlineStoreEnabled: !!(settingsData.online_store_enabled ?? true),
        serviceQueueEnabled: !!settingsData.service_queue_enabled,
        workshopEnabled: !!settingsData.workshop_enabled,
        barbershopEnabled: !!settingsData.barbershop_enabled,
        fnbEnabled: !!settingsData.fnb_enabled,
        laundryEnabled: !!settingsData.laundry_enabled,
        fnbServiceChargePercent: Number(settingsData.fnb_service_charge_percent || 0),
        serviceStations: settingsData.service_stations || 'Pit 1,Pit 2,Pit 3,Kursi 1,Kursi 2',
        queuePrefix: settingsData.queue_prefix || 'A',
        laundryPerfumeOptions: settingsData.laundry_perfume_options || 'Akasia,Downy Red,Sakura,Ocean Fresh,Lavender,Snappy,Molto Blue',
        laundryRackLocations: settingsData.laundry_rack_locations || 'Rak A-01,Rak A-02,Rak A-03,Rak B-01,Rak B-02,Rak B-03,Gantungan 01,Gantungan 02',
        laundryPrefix: settingsData.laundry_prefix || 'LND',
        receiptFooter: (settingsData.receipt_footer !== undefined && settingsData.receipt_footer !== null && settingsData.receipt_footer !== '') 
          ? settingsData.receipt_footer 
          : 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat\ndikembalikan atau ditukar.',
        minSpendForMember: Number(settingsData.min_spend_for_member || 100000),
        pointRate: Number(settingsData.point_rate || 10000),
        pointValue: Number(settingsData.point_value || 100),
        goldThreshold: Number(settingsData.gold_threshold || 1000000),
        platinumThreshold: Number(settingsData.platinum_threshold || 5000000),
        authBackground: settingsData.auth_background || '',
        theme_color: settingsData.theme_color || 'emerald',
        tagline: settingsData.tagline || 'Sehat Alami, Hidup Harmoni',
        logoUrl: settingsData.logo_url || '',
        businessLogo: settingsData.business_logo || '',
        description: settingsData.description || '',
      };

      if (settings.theme_color) {
        localStorage.setItem('pos-theme-color', settings.theme_color);
      }

      if (settings.businessName) {
        document.title = `${settings.businessName} - POS & Manajemen Toko`;
      }

      dispatch({ type: 'LOAD_DATA', payload: { products, customers, transactions, settings } });

      // Cache data for offline use
      try {
        await cacheData('products', products);
        await cacheData('customers', customers);
      } catch (e) {
        console.warn('Failed to cache data for offline use:', e);
      }
    } catch (error) {
      console.warn('Network error or failed to load fresh data, attempting to load from offline cache...');
      try {
        const cachedProducts = await getCachedData('products') as Product[];
        const cachedCustomers = await getCachedData('customers') as Customer[];
        
        if (cachedProducts.length > 0) {
          dispatch({ 
            type: 'LOAD_DATA', 
            payload: { 
              products: cachedProducts, 
              customers: cachedCustomers, 
              transactions: [], // Not cached locally to prevent large data
              settings: initialState.settings 
            } 
          });
          toast.warning('Anda sedang offline. Menampilkan data lokal.');
        } else {
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load data (Offline)' });
          toast.error('Gagal memuat data dan belum ada cache lokal.');
        }
      } catch (cacheError) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load data' });
      }
    }
  }, [user]);

  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) return;

      toast.info(`Menyelaraskan ${queue.length} transaksi offline...`);
      for (const item of queue) {
        if (item.type === 'ADD_TRANSACTION') {
          try {
            await api.post('/transactions', item.payload);
            await removeFromSyncQueue((item as any).id);
          } catch (e: any) {
            console.error('Failed to sync transaction:', e);
            // If the error is a 4xx, it might be unprocessable, but we'll keep it simple
          }
        }
      }
      toast.success('Penyelarasan data offline selesai.');
      await loadData();
    } catch (error) {
      console.error('Sync process error:', error);
    }
  }, [loadData]);

  useEffect(() => { 
    loadData(); 
    
    const handleOnline = () => {
      syncOfflineData();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [loadData, syncOfflineData]);

  const saveSettings = async (settings: Settings) => {
    try {
      await api.put('/settings', {
        business_name: settings.businessName,
        business_address: settings.businessAddress,
        business_phone: settings.businessPhone,
        business_email: settings.businessEmail,
        tax_rate: settings.taxRate,
        default_discount: settings.defaultDiscount,
        currency: settings.currency,
        receipt_template: settings.receiptTemplate,
        auto_backup: settings.autoBackup,
        low_stock_notification: settings.lowStockNotification,
        print_receipt: settings.printReceipt, 
        online_store_enabled: settings.onlineStoreEnabled,
        service_queue_enabled: settings.serviceQueueEnabled,
        workshop_enabled: settings.workshopEnabled,
        barbershop_enabled: settings.barbershopEnabled,
        fnb_enabled: settings.fnbEnabled,
        laundry_enabled: settings.laundryEnabled,
        fnb_service_charge_percent: settings.fnbServiceChargePercent,
        service_stations: settings.serviceStations,
        queue_prefix: settings.queuePrefix,
        laundry_perfume_options: settings.laundryPerfumeOptions,
        laundry_rack_locations: settings.laundryRackLocations,
        laundry_prefix: settings.laundryPrefix,
        receipt_footer: settings.receiptFooter,
        min_spend_for_member: settings.minSpendForMember,
        point_rate: settings.pointRate,
        point_value: settings.pointValue,
        gold_threshold: settings.goldThreshold,
        platinum_threshold: settings.platinumThreshold,
        auth_background: settings.authBackground,
        theme_color: settings.theme_color || settings.themeColor || 'emerald',
        tagline: settings.tagline || 'Sehat Alami, Hidup Harmoni',
        business_logo: settings.businessLogo || '',
        logo_url: settings.logoUrl || '',
        description: settings.description || ''
      });
      if (settings.theme_color || settings.themeColor) {
        localStorage.setItem('pos-theme-color', settings.theme_color || settings.themeColor || 'emerald');
      }
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      toast.success('Pengaturan berhasil disimpan');
    } catch (error) { toast.error('Gagal menyimpan pengaturan'); }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const res = await api.post('/products', product);
      dispatch({ type: 'ADD_PRODUCT', payload: res.data });
      toast.success('Produk berhasil ditambahkan');
    } catch (error) { toast.error('Gagal menambah produk'); }
  };

  const updateProduct = async (product: Product) => {
    try {
      await api.put(`/products/${product.id}`, product);
      dispatch({ type: 'UPDATE_PRODUCT', payload: product });
      toast.success('Produk berhasil diupdate');
    } catch (error) { toast.error('Gagal mengupdate produk'); }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      dispatch({ type: 'DELETE_PRODUCT', payload: id });
      toast.success('Produk berhasil dihapus');
    } catch (error) { toast.error('Gagal menghapus produk'); }
  };

  const addCustomer = async (customer: Omit<Customer, 'id' | 'joinDate' | 'totalPurchases' | 'totalSpent' | 'status' | 'balance'>) => {
    try {
      const res = await api.post('/customers', customer);
      dispatch({ type: 'ADD_CUSTOMER', payload: res.data });
      toast.success('Pelanggan berhasil ditambahkan');
    } catch (error) { toast.error('Gagal menambah pelanggan'); }
  };

  const updateCustomer = async (customer: Customer) => {
    try {
      await api.put(`/customers/${customer.id}`, customer);
      dispatch({ type: 'UPDATE_CUSTOMER', payload: customer });
      toast.success('Pelanggan berhasil diupdate');
    } catch (error) { toast.error('Gagal mengupdate pelanggan'); }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await api.delete(`/customers/${id}`);
      dispatch({ type: 'DELETE_CUSTOMER', payload: id });
      toast.success('Pelanggan berhasil dihapus');
    } catch (error) { toast.error('Gagal menghapus pelanggan'); }
  };

  const addTransaction = async (transaction: any) => {
    const isOnline = navigator.onLine;
    const fallBackTransaction = { ...transaction, id: `offline-${Date.now()}`, createdAt: new Date().toISOString() };

    if (!isOnline) {
      try {
        await enqueueSync('ADD_TRANSACTION', transaction);
        dispatch({ type: 'ADD_TRANSACTION', payload: fallBackTransaction });
        toast.success('Offline: Transaksi disimpan & akan disingkronkan nanti.');
        return fallBackTransaction;
      } catch (e) {
        toast.error('Gagal menyimpan transaksi (Storage Penuh)');
        return;
      }
    }

    try {
      const res = await api.post('/transactions', transaction);
      const newTransaction: Transaction = { 
        ...transaction, 
        id: res.data.id, 
        invoiceNumber: res.data.invoiceNumber || (res.data.id ? res.data.id.slice(0, 8).toUpperCase() : ''),
        earnedPoints: res.data.earnedPoints,
        accumulatedPoints: res.data.accumulatedPoints,
        createdAt: res.data.createdAt || res.data.created_at || transaction.createdAt || new Date().toISOString() 
      };
      dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
      // Update stock in local state for sold items (avoid full reload)
      newTransaction.items.forEach((item) => {
        const product = state.products.find(p => p.id === item.productId);
        if (product) {
          dispatch({ type: 'UPDATE_PRODUCT', payload: { ...product, stock: Math.max(0, product.stock - item.quantity) } });
        }
      });
      toast.success('Transaksi berhasil diproses');
      return newTransaction;
    } catch (error: any) { 
      if (error.code === 'ERR_NETWORK') {
        await enqueueSync('ADD_TRANSACTION', transaction);
        dispatch({ type: 'ADD_TRANSACTION', payload: fallBackTransaction });
        toast.success('Jaringan bermasalah. Transaksi disimpan lokal.');
        return fallBackTransaction;
      }
      toast.error('Gagal memproses transaksi'); 
    }
  };

  // Export all data to JSON string
  const exportData = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      products: state.products,
      customers: state.customers,
      transactions: state.transactions,
      settings: state.settings,
    };
    return JSON.stringify(backupData, null, 2);
  };

  // Import data from JSON string
  const importData = async (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);

      // Validate data structure
      if (!data.products || !data.customers || !data.transactions) {
        toast.error('Format backup tidak valid');
        return false;
      }

      // Import products
      for (const product of data.products) {
        try {
          await api.post('/products', {
            name: product.name,
            category: product.category,
            price: product.price,
            costPrice: product.costPrice || product.cost || 0,
            stock: product.stock || 0,
            minStock: product.minStock || product.min_stock || 0,
            sku: product.sku || '',
            barcode: product.barcode || '',
            description: product.description || '',
          });
        } catch (e) {
          console.log('Skipping duplicate product:', product.name);
        }
      }

      // Import customers
      for (const customer of data.customers) {
        try {
          await api.post('/customers', {
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            notes: customer.notes || '',
          });
        } catch (e) {
          console.log('Skipping duplicate customer:', customer.name);
        }
      }

      // Import settings if available
      if (data.settings) {
        try {
          await api.put('/settings', data.settings);
        } catch (e) {
          console.log('Could not restore settings');
        }
      }

      // Reload data
      await loadData();
      toast.success('Data berhasil diimport');
      return true;
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Gagal mengimport data');
      return false;
    }
  };

  // Reset all data via API
  const resetData = async () => {
    try {
      await api.post('/backup/reset');

      // Reload data to reflect changes
      await loadData();
      toast.success('Semua data berhasil dihapus');
      return true;
    } catch (error: any) {
      console.error('Reset error:', error);
      toast.error(error.response?.data?.error || 'Gagal menghapus data');
      return false;
    }
  };

  // saveData is intentionally a no-op (data is saved on each mutation).
  // Kept as a stub for backward compatibility.
  const saveData = () => {};

  const updateTransaction = async (transaction: Transaction) => {
    try {
      await api.put(`/transactions/${transaction.id}`, {
        customer_name: transaction.customerName,
        status: transaction.status,
        payment_method: transaction.paymentMethod,
        discount: transaction.discount,
        payment_amount: transaction.paymentAmount,
        change_amount: transaction.changeAmount,
        notes: transaction.notes,
        created_at: transaction.createdAt,
        items: transaction.items
      });
      dispatch({ type: 'UPDATE_TRANSACTION', payload: transaction });
      toast.success('Transaksi berhasil diupdate');
      await loadData();
    } catch (error: any) {
      console.error('Update transaction error:', error);
      toast.error(error.response?.data?.error || 'Gagal mengupdate transaksi');
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await api.delete(`/transactions/${id}`);
      dispatch({ type: 'DELETE_TRANSACTION', payload: id });
      toast.success('Transaksi berhasil dihapus');
    } catch (error: any) {
      console.error('Delete transaction error:', error);
      toast.error(error.response?.data?.error || 'Gagal menghapus transaksi');
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      state, dispatch, loadData, saveSettings, exportData, importData, resetData,
      addProduct, updateProduct, deleteProduct, addCustomer, updateCustomer, deleteCustomer,
      addTransaction, updateTransaction, deleteTransaction
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
