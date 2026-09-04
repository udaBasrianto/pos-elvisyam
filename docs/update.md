# Rencana Pembaruan Fitur Produk & Toko Online (Storefront)

Dokumen ini merangkum analisis kebutuhan input dan fitur tambahan pada modul produk untuk memaksimalkan operasional **Toko Online (Storefront / E-Commerce)** yang terintegrasi langsung dengan kasir **Point of Sale (POS)**.

---

## 1. Latar Belakang & Analisis Masalah

Pada modul produk saat ini, data produk didesain terutama untuk kebutuhan inventaris dasar toko fisik (POS). Namun, seiring dengan aktifnya fitur **Toko Online**, terdapat beberapa batasan nyata:

1. **Varian Tercampur di Kolom SKU**:
   - Contoh kasus nyata: Kolom *SKU / Kode Barang* saat ini diisi manual dengan teks `"No 8,10"` karena belum tersedianya pilihan Ukuran (*Size*) dan Warna.
   - Pembeli di Toko Online tidak dapat memilih ukuran atau warna saat menekan tombol checkout / keranjang.
2. **Stok Gabungan (Bukan per Varian)**:
   - Stok tercatat global (misal: 20 pcs). Penjual tidak dapat mengetahui secara pasti apakah ukuran No 8 sudah habis sementara No 10 masih tersisa.
3. **Ketiadaan Data Berat Barang**:
   - Toko online memerlukan perhitungan ongkos kirim ekspedisi (JNE, J&T, SiCepat, POS Indonesia, dll). Tanpa input berat, ongkir otomatis tidak dapat dihitung akurat.
4. **Keterbatasan Gambar (Hanya 1 Foto)**:
   - Toko online menuntut sudut pandang foto lengkap (depan, samping, belakang, detail kain, foto model/lookbook).

---

## 2. Rincian Fitur & Inputan yang Dibutuhkan

### A. Prioritas 1: Kritis & Wajib (High Priority)

#### 1. Sistem Matriks Varian (Warna & Ukuran/Size)
* **Tipe Varian**:
  * **Warna**: Pilihan warna (Hitam, Navy, Putih, Sage, Maroon, dll.) dilengkapi kode warna/color swatch.
  * **Ukuran (Size)**: Pilihan ukuran (S, M, L, XL, XXL atau No 8, 10, 12 atau ukuran angka sepatu/celana).
  * **Opsi Kustom**: Opsi lain seperti Model Lengan (Panjang/Pendek).
* **Matriks Kontrol Tiap Varian**:
  * **Stok Mandiri**: Stok terpangkas sesuai varian yang dibeli konsumen.
  * **Harga Khusus**: Memungkinkan harga berbeda untuk ukuran tertentu (misal: Size XXL lebih mahal Rp 10.000).
  * **SKU & Barcode Mandiri**: Tiap kombinasi memiliki barcode/SKU unik sehingga saat kasir menembak scanner di toko fisik, sistem POS tetap otomatis mengenali varian yang tepat.
  * **Foto Varian**: Mengubah foto utama saat pembeli memilih warna tertentu.

#### 2. Berat Produk (*Product Weight*)
* **Inputan**: Angka berat dalam satuan **Gram (g)** atau **Kilogram (kg)**.
* **Fungsi**:
  * Perhitungan ongkos kirim otomatis ekspedisi saat pembeli melakukan checkout di Toko Online.
  * Akumulasi total berat di keranjang belanja (*cart weight calculation*).

#### 3. Galeri Multi-Foto (*Multi-Image Gallery*)
* **Inputan**: Upload hingga 5–8 gambar produk sekaligus (drag & drop / multi-select).
* **Fungsi**:
  * Foto tampak depan, samping, belakang, detail serat kain/jahitan, dan foto katalog model.
  * Tampilan carousel / thumbnail interaktif di halaman detail produk Toko Online.

---

### B. Prioritas 2: Penunjang Fashion & Konversi Penjualan (Medium Priority)

#### 4. Panduan Ukuran (*Size Chart*)
* **Kebutuhan Khusus Pakaian/Fashion**:
  * Membantu pembeli memilih ukuran dengan percaya diri (mengurangi risiko retur/tukar ukuran).
* **Bentuk Inputan**:
  * Upload gambar tabel Size Chart, atau
  * Form tabel dinamis (Lingkar Dada, Panjang Badan, Panjang Lengan, Rekomendasi Umur/Tinggi).

#### 5. Harga Coret / Harga Promo (*Compare-at Price*)
* **Inputan**: Kolom **Harga Asli / Harga Normal** (misal Rp 275.000) di samping **Harga Jual** (Rp 239.000).
* **Tampilan Storefront**:
  * Badge diskon otomatis: `Diskon 13%` atau `Hemat Rp 36.000`.
  * Teks harga lama tercoret di samping harga promo.

#### 6. Spesifikasi Bahan & Instruksi Perawatan
* **Inputan**:
  * Jenis Bahan/Kain (misal: *Katun Toyobo Fodu Premium*, *Katun Madinah*, *Crinkle Airflow*).
  * Karakteristik Bahan (*Adem, menyerap keringat, tidak mudah kusut*).
  * Petunjuk Pencucian (*Dry clean, jangan gunakan pemutih*).

---

### C. Prioritas 3: Fitur E-Commerce Modern (Nice-to-Have)

| No | Fitur / Inputan | Kegunaan di Toko Online |
| :---: | :--- | :--- |
| 1 | **Dimensi Paket (P x L x T cm)** | Untuk kalkulasi ongkir volumetrik pada produk berukuran besar namun ringan. |
| 2 | **Status Pre-Order (PO)** | Menandai produk yang membutuhkan masa jahit/produksi dengan estimasi hari kerja. |
| 3 | **Label / Badge Produk** | Tag seperti: `Best Seller`, `New Arrival`, `Limited Edition`, `Garansi Original`. |
| 4 | **Batas Maksimal Pembelian** | Membatasi jumlah checkout per akun saat promo flash sale agar tidak diborong reseller. |
| 5 | **Link Video Produk** | Menampilkan sematan video singkat (TikTok, Instagram Reels, YouTube Shorts). |
| 6 | **SEO Title & Social Meta Tag** | Kustomisasi teks dan gambar thumbnail saat link produk dibagikan via WhatsApp. |

---

## 3. Rencana Arsitektur Teknis

### A. Perubahan Skema Database

1. **Tabel `products`** (Penambahan kolom atribut global):
   ```sql
   ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_gram INT DEFAULT 0;
   ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(15,2) DEFAULT 0;
   ALTER TABLE products ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN DEFAULT FALSE;
   ALTER TABLE products ADD COLUMN IF NOT EXISTS preorder_days INT DEFAULT 0;
   ALTER TABLE products ADD COLUMN IF NOT EXISTS size_chart_image TEXT;
   ALTER TABLE products ADD COLUMN IF NOT EXISTS material VARCHAR(255);
   ALTER TABLE products ADD COLUMN IF NOT EXISTS package_length_cm INT DEFAULT 0;
   ALTER TABLE products ADD COLUMN IF NOT EXISTS package_width_cm INT DEFAULT 0;
   ALTER TABLE products ADD COLUMN IF NOT EXISTS package_height_cm INT DEFAULT 0;
   ```

2. **Tabel `product_images`** (Galeri multi-foto):
   ```sql
   CREATE TABLE IF NOT EXISTS product_images (
       id VARCHAR(36) PRIMARY KEY,
       product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
       image_url TEXT NOT NULL,
       sort_order INT DEFAULT 0,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **Tabel `product_variants`** (Matriks Warna, Ukuran & Stok):
   ```sql
   CREATE TABLE IF NOT EXISTS product_variants (
       id VARCHAR(36) PRIMARY KEY,
       product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
       variant_name VARCHAR(100) NOT NULL, -- Contoh: "Navy / No 8"
       color VARCHAR(50),
       size VARCHAR(50),
       sku VARCHAR(255),
       barcode VARCHAR(255),
       price DECIMAL(15,2),
       cost_price DECIMAL(15,2),
       stock INT DEFAULT 0,
       image_url TEXT,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

### B. Sinkronisasi Antara POS & Toko Online

- **Kasir Toko Fisik (POS)**:
  - Kasir tetap bisa melakukan pencarian produk berdasarkan nama, barcode produk utama, ATAU barcode spesifik varian.
  - Jika kasir memilih produk bervarian melalui layar sentuh POS, akan muncul popup ringkas untuk memilih ukuran/warna yang diambil pelanggan.
- **Toko Online (Storefront)**:
  - Tombol pilihan warna berupa chip/lingkaran warna.
  - Tombol pilihan ukuran (S, M, L / No 8, 10). Jika stok varian tersebut 0, tombol otomatis abu-abu (*disabled/strikethrough*).
  - Saat warna dipilih, foto utama otomatis berganti ke foto varian terkait.

---

## 4. Tahapan Pengerjaan (Roadmap)

* [ ] **Fase 1: Berat Produk & Galeri Multi-Foto**
  * Tambahkan input berat (gram) pada modal produk.
  * Tambahkan drag & drop multi-gambar untuk galeri produk.
  * Tampilkan galeri slider di halaman detail produk Storefront.
* [ ] **Fase 2: Sistem Varian Produk (Warna & Ukuran)**
  * Buat tabel `product_variants` di backend.
  * Buat komponen generator varian (input warna + ukuran $\rightarrow$ otomatis membuat baris stok & barcode).
  * Hubungkan pemilihan varian pada halaman detail Storefront dan integrasikan ke keranjang belanja.
* [ ] **Fase 3: Size Chart & Harga Coret Promosi**
  * Tambahkan kolom harga coret dan upload size chart.
  * Tampilkan badge diskon serta tombol pop-up panduan ukuran di Toko Online.

---

## 5. Laporan Hasil Audit Menu Sidebar (Full System Audit)

Audit komprehensif dilakukan pada seluruh menu navigasi sidebar aplikasi (Frontend, Backend Endpoint, dan Database Schema):

| No | Modul / Menu Sidebar | Path Halaman | Status Frontend | Status API Backend | Catatan / Hasil Perbaikan |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | **Dashboard** | `/dashboard` | Normal | Normal | KPI, chart transaksi harian/bulanan, dan summary sinkron. |
| 2 | **Kasir (POS)** | `/pos` | Normal | Normal | Transaksi POS, search SKU/nama, diskon, tax, modal pembayaran lancar. |
| 3 | **Riwayat Transaksi** | `/transactions` | Normal | Normal | Detail transaksi, cetak struk ulang, status void/complete lancar. |
| 4 | **Order Online** | `/online-orders` | Normal | Normal | Badge pending order, update status kirim, verifikasi pembayaran lancar. |
| 5 | **Konfigurasi Toko** | `/storefront-settings` | Normal | Normal | Pengaturan nama toko, jam buka, rekening bank, pengiriman lancar. |
| 6 | **Katalog Produk** | `/products` | Normal | Normal | CRUD produk, upload gambar, penyesuaian stok lancar. |
| 7 | **Cetak Barcode** | `/barcode-settings` | Normal | Normal | Pratinjau label, penyesuaian panjang barcode (100% full width) lancar. |
| 8 | **Pembelian (PO)** | `/purchases` | Normal | Normal | Buat PO ke supplier, update status penerimaan barang lancar. |
| 9 | **Stock Opname** | `/stock-opname` | Normal | Normal | Sesi hitung fisik, selisih stok, dan commit penyesuaian stok lancar. |
| 10 | **Konsinyasi** | `/consignment` | Normal | Normal | Perhitungan bagi hasil konsinyasi & pelunasan hutang titip lancar. |
| 11 | **Kategori Produk** | `/categories` | Normal | Normal | Tambah, ubah, hapus kategori lancar. |
| 12 | **Merek (Brands)** | `/brands` | Normal | Normal | Tambah, ubah, hapus merek lancar. |
| 13 | **Riwayat Stok** | `/stock-movements` | Normal | Normal | Log mutasi stok masuk/keluar/penjualan tercatat akurat. |
| 14 | **Pendapatan Lain** | `/incomes` | Normal | **Diperbaiki** | **Fixed**: Fallback `title` otomatis jika form hanya mengisi nama project/klien, kolom `date` disinkronkan, constraint NOT NULL dilepas. |
| 15 | **Pengeluaran** | `/expenses` | Normal | **Diperbaiki** | **Fixed**: Coalesce tanggal dan mapping category/category_id agar simpan pengeluaran 100% berhasil. |
| 16 | **Manajemen Aset** | `/assets` | Normal | Normal | Inventaris aset toko, penyusutan tahunan, nilai sisa berjalan normal. |
| 17 | **Laporan Keuangan** | `/reports` | Normal | **Diperbaiki** | **Fixed**: `GetFinancialSummary` & laporan pengeluaran harian/bulanan/tahunan kini menggunakan `COALESCE(expense_date, date, created_at::date)` dan multi-tenant fallback. |
| 18 | **Analisis AI** | `/ai-analysis` | Normal | Normal | Insight cerdas kecepatan perputaran stok & prediksi penjualan aktif. |
| 19 | **Bagi Hasil** | `/profit-sharing` | Normal | **Diperbaiki** | **Fixed**: Perhitungan laba bersih terintegrasi dengan HPP, biaya riil pendapatan, dan sinkron ke saldo toko. |
| 20 | **Dana Reinvestasi** | `/reinvestment` | Normal | **Diperbaiki** | **Fixed**: Endpoint `POST /reinvestment/sync` ditambahkan, card KPI `total_in` & `total_out` dipetakan, update/delete transaksi otomatis kalkulasi ulang saldo. |
| 21 | **Pelanggan** | `/customers` | Normal | Normal | CRUD member/pelanggan dan riwayat belanja berjalan lancar. |
| 22 | **Absensi & Gaji** | `/payroll` | Normal | Normal | Clock-in / clock-out kasir, slip gaji, dan history absensi lancar. |
| 23 | **Kelola User** | `/users` | Normal | Normal | Manajemen admin, manager, dan kasir berjalan lancar. |
| 24 | **Perangkat Keras** | `/hardware-settings` | Normal | Normal | Konfigurasi printer thermal (Bluetooth/USB) & secondary display lancar. |
| 25 | **Pengaturan Toko** | `/settings` | Normal | Normal | Setup profil toko, pajak, struk, dan preferensi aplikasi lancar. |
| 26 | **Riwayat Edit** | `/audit-logs` | Normal | Normal | Audit log aktivitas staf dan perubahan data tersimpan rapi. |
| 27 | **Request Fitur** | `/feature-requests` | Normal | Normal | Saran & masukan fitur pengguna tersimpan ke database. |
| 28 | **Pusat Bantuan** | `/discussions` | Normal | Normal | Diskusi tiket & troubleshooting berjalan normal. |
| 29 | **Kelola Tenant** | `/tenants` | Normal | Normal | Modul khusus Super Admin untuk kontrol tenant SaaS aktif. |
| 30 | **Desain Label (Studio)** | `/label-designer` | Normal | Normal | **Menu Baru**: Visual studio template barcode ala Open Label (diagram pita roll, caliper dimensi mm, 1-4 kolom, bentuk persegi/bulat/oval, kalkulator lebar kertas). |
