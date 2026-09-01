# 📋 Skema Role - POS System

## Hierarki Role

```
┌─────────────────────────────────────────────────────────────┐
│                       ADMIN                                  │
│  (Akses penuh ke semua fitur + manajemen user)              │
├─────────────────────────────────────────────────────────────┤
│                      MANAGER                                 │
│  (Akses operasional + laporan + riwayat stok)               │
├─────────────────────────────────────────────────────────────┤
│                       KASIR                                  │
│  (Akses dasar untuk operasional harian)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔴 ADMIN (Administrator)

**Deskripsi:** Administrator memiliki akses penuh ke semua fitur sistem tanpa batasan.

### ✅ Kemampuan:

| Modul | Akses | Keterangan |
|-------|-------|------------|
| **Dashboard** | ✅ | Lihat semua statistik |
| **Kasir (POS)** | ✅ | Melakukan transaksi penjualan |
| **Produk** | ✅ | CRUD produk, upload gambar, atur stok |
| **Kategori** | ✅ | CRUD kategori produk |
| **Pelanggan** | ✅ | CRUD data pelanggan |
| **Transaksi** | ✅ | Lihat semua transaksi (semua user), hapus transaksi, void transaksi |
| **Order Online** | ✅ | Kelola pesanan online, edit, hapus |
| **Pendapatan** | ✅ | CRUD data pendapatan jasa |
| **Pengeluaran** | ✅ | CRUD data pengeluaran/biaya |
| **Bagi Hasil** | ✅ | Atur pembagian profit |
| **Dana Reinvestasi** | ✅ | Kelola dana reinvestasi |
| **Laporan** | ✅ | Akses semua laporan |
| **Riwayat Stok** | ✅ | Lihat semua pergerakan stok |
| **Backup & Restore** | ✅ | Backup/restore data sistem |
| **Pengaturan** | ✅ | Atur pengaturan bisnis |
| **Kelola User** | ✅ | CRUD user, ubah role user |

### 🔐 Akses Eksklusif Admin:
- Menghapus transaksi
- Mengelola user (tambah, edit, hapus, ubah role)
- Void transaksi
- Lihat transaksi semua kasir

---

## 🟡 MANAGER

**Deskripsi:** Manager memiliki akses untuk operasional dan monitoring, namun tidak dapat mengelola user.

### ✅ Kemampuan:

| Modul | Akses | Keterangan |
|-------|-------|------------|
| **Dashboard** | ✅ | Lihat statistik |
| **Kasir (POS)** | ✅ | Melakukan transaksi penjualan |
| **Produk** | ✅ | CRUD produk, upload gambar, atur stok |
| **Kategori** | ✅ | CRUD kategori produk |
| **Pelanggan** | ✅ | CRUD data pelanggan |
| **Transaksi** | ✅ | Lihat transaksi sendiri, void transaksi |
| **Order Online** | ✅ | Kelola pesanan online |
| **Pendapatan** | ✅ | CRUD data pendapatan jasa |
| **Pengeluaran** | ✅ | CRUD data pengeluaran/biaya |
| **Bagi Hasil** | ✅ | Atur pembagian profit |
| **Dana Reinvestasi** | ✅ | Kelola dana reinvestasi |
| **Laporan** | ✅ | Akses semua laporan |
| **Riwayat Stok** | ✅ | Lihat semua pergerakan stok |
| **Backup & Restore** | ✅ | Backup/restore data |
| **Pengaturan** | ✅ | Atur pengaturan bisnis |
| **Kelola User** | ❌ | Tidak bisa akses |

### 🔐 Akses Ekstra Manager (dibanding Kasir):
- Riwayat Stok (Stock Movements)
- Void transaksi
- Update status transaksi

---

## 🟢 KASIR

**Deskripsi:** Kasir memiliki akses terbatas untuk operasional harian point of sale.

### ✅ Kemampuan:

| Modul | Akses | Keterangan |
|-------|-------|------------|
| **Dashboard** | ✅ | Lihat statistik dasar |
| **Kasir (POS)** | ✅ | Melakukan transaksi penjualan |
| **Produk** | ✅ | Lihat & edit produk |
| **Kategori** | ✅ | Lihat & edit kategori |
| **Pelanggan** | ✅ | Lihat & edit pelanggan |
| **Transaksi** | ✅ | Lihat transaksi sendiri saja |
| **Order Online** | ✅ | Lihat pesanan online |
| **Pendapatan** | ✅ | Lihat & tambah pendapatan |
| **Pengeluaran** | ✅ | Lihat & tambah pengeluaran |
| **Bagi Hasil** | ✅ | Lihat bagi hasil |
| **Dana Reinvestasi** | ✅ | Lihat dana reinvestasi |
| **Laporan** | ✅ | Lihat laporan |
| **Riwayat Stok** | ❌ | Tidak bisa akses |
| **Backup & Restore** | ✅ | Backup data |
| **Pengaturan** | ✅ | Lihat pengaturan |
| **Kelola User** | ❌ | Tidak bisa akses |

### ⛔ Tidak Bisa:
- Menghapus transaksi
- Void transaksi
- Akses riwayat stok
- Mengelola user

---

## 📊 Ringkasan Perbandingan

| Fitur | Admin | Manager | Kasir |
|-------|:-----:|:-------:|:-----:|
| Dashboard | ✅ | ✅ | ✅ |
| POS/Kasir | ✅ | ✅ | ✅ |
| Produk (CRUD) | ✅ | ✅ | ✅ |
| Kategori (CRUD) | ✅ | ✅ | ✅ |
| Pelanggan (CRUD) | ✅ | ✅ | ✅ |
| Transaksi (Lihat) | ✅ Semua | ✅ Sendiri | ✅ Sendiri |
| Transaksi (Hapus) | ✅ | ❌ | ❌ |
| Transaksi (Void) | ✅ | ✅ | ❌ |
| Order Online | ✅ | ✅ | ✅ |
| Pendapatan | ✅ | ✅ | ✅ |
| Pengeluaran | ✅ | ✅ | ✅ |
| Bagi Hasil | ✅ | ✅ | ✅ |
| Dana Reinvestasi | ✅ | ✅ | ✅ |
| Laporan | ✅ | ✅ | ✅ |
| **Riwayat Stok** | ✅ | ✅ | ❌ |
| Backup/Restore | ✅ | ✅ | ✅ |
| Pengaturan | ✅ | ✅ | ✅ |
| **Kelola User** | ✅ | ❌ | ❌ |

---

## 📝 Catatan Implementasi

### Backend (server/index.js)
```javascript
// Middleware untuk role check
const requireRole = (...roles) => {
    return async (req, res, next) => {
        const userRole = await getUserRole(req.user.id);
        if (!roles.includes(userRole)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
};

// Contoh penggunaan:
app.delete('/api/transactions/:id', authenticateToken, requireRole('admin'), ...);
app.post('/api/transactions/:id/void', authenticateToken, requireRole('admin', 'manager'), ...);
```

### Frontend (React)
```tsx
// Di AuthContext
const isAdmin = user?.role === 'admin';
const isManager = user?.role === 'admin' || user?.role === 'manager';
const hasRole = (...roles) => roles.includes(user?.role);

// Di komponen
{isAdmin && <AdminMenu />}
{isManager && <ManagerMenu />}
```

---

*Dokumentasi ini dibuat pada: 21 Januari 2026*

---

## 🛒 STORE CUSTOMER (Pelanggan Toko Online)

**Deskripsi:** Pelanggan toko online adalah pengguna yang melakukan pembelian di toko online. Mereka memiliki akun terpisah dari user admin/kasir.

### ✅ Kemampuan:

| Fitur | Akses | Keterangan |
|-------|-------|------------|
| **Lihat Produk** | ✅ | Melihat semua produk yang ditampilkan di toko online |
| **Keranjang** | ✅ | Menambah, mengubah, menghapus item di keranjang |
| **Checkout** | ✅ | Melakukan checkout (wajib login) |
| **Profil** | ✅ | Melihat dan mengubah profil (nama, telepon, alamat) |
| **Ubah Password** | ✅ | Mengubah password akun |
| **Riwayat Pesanan** | ✅ | Melihat riwayat pesanan sendiri |

### ⛔ Tidak Bisa:
- Mengakses dashboard admin
- Mengelola produk atau kategori
- Melihat laporan bisnis
- Mengakses fitur manajemen lainnya

### 📝 Alur Pembelian:
1. Customer mengunjungi `/store`
2. Jika belum login, bisa browse produk dan tambah ke keranjang
3. Saat checkout, **wajib login atau daftar terlebih dahulu**
4. Setelah login, customer dapat melengkapi profil dan checkout
5. Pesanan masuk ke sistem dan admin dapat mengelolanya

### Database Table:
```sql
-- Tabel store_customers (terpisah dari users)
CREATE TABLE store_customers (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints:
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/store/auth/register` | Registrasi customer baru |
| POST | `/api/store/auth/login` | Login customer |
| GET | `/api/store/auth/me` | Get profile customer (auth required) |
| PUT | `/api/store/auth/profile` | Update profile (auth required) |
| POST | `/api/store/auth/change-password` | Ubah password (auth required) |
| GET | `/api/store/orders` | Riwayat pesanan (auth required) |
| POST | `/api/store/checkout` | Checkout (auth required) |

