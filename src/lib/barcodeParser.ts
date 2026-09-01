/**
 * barcodeParser.ts
 * Universal Smart Parser untuk Barcode 1D & QR Code Produk Ritel
 * Mampu mengekstrak Nomor Barcode, SKU, Nama Produk, Merk/Brand, Kategori, Harga Jual, HPP, Satuan, dan Berat.
 * Mendukung format: JSON, Key-Value, URL Query, Delimiter (Pipe/Semicolon/Dash), Timbangan Digital, dan Katalog Master.
 */

import { lookupMasterBarcode, type MasterProductData } from './masterBarcodeCatalog';

export interface ParsedProductBarcode {
  raw: string;
  barcode: string;
  sku?: string;
  name?: string;
  brand?: string;
  category?: string;
  price?: number;
  costPrice?: number;
  unit?: string;
  stock?: number;
  weightGrams?: number;
  isStructured: boolean;
  source: 'json' | 'key-value' | 'url' | 'delimited' | 'scale' | 'master-catalog' | 'plain';
}

/**
 * 🧠 Parse string mentah hasil scan scanner/kamera menjadi objek data produk terstruktur
 */
export function parseRawBarcodeData(rawInput: string): ParsedProductBarcode {
  const raw = (rawInput || '').trim();
  if (!raw) {
    return { raw: '', barcode: '', isStructured: false, source: 'plain' };
  }

  // 1. Cek apakah format JSON (Contoh: {"barcode":"89999","name":"Kopi ABC","brand":"ABC","category":"Minuman","price":15000})
  if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
    try {
      const parsed = JSON.parse(raw);
      const item = Array.isArray(parsed) ? parsed[0] : parsed;
      if (item && typeof item === 'object') {
        const barcode = String(item.barcode || item.code || item.id || item.kode || item.sku || '').trim();
        const sku = String(item.sku || item.kode_barang || item.item_code || barcode || '').trim();
        const name = String(item.name || item.nama || item.nama_produk || item.title || item.product_name || item.item || '').trim();
        const brand = String(item.brand || item.merk || item.merek || item.produsen || item.vendor || '').trim();
        const category = String(item.category || item.kategori || item.cat || item.jenis || '').trim();
        const price = Number(item.price || item.harga || item.harga_jual || item.jual || item.sale_price) || undefined;
        const costPrice = Number(item.costPrice || item.cost || item.hpp || item.harga_beli || item.beli || item.buy_price) || undefined;
        const unit = String(item.unit || item.satuan || item.uom || '').trim() || undefined;
        const stock = Number(item.stock || item.stok || item.qty || item.jumlah) || undefined;

        if (barcode || name) {
          return {
            raw,
            barcode: barcode || sku,
            sku: sku || barcode,
            name: name || undefined,
            brand: brand || undefined,
            category: category || undefined,
            price,
            costPrice,
            unit,
            stock,
            isStructured: true,
            source: 'json',
          };
        }
      }
    } catch (_) {}
  }

  // 2. Cek apakah format URL atau Query Parameters (Contoh: https://pos.app/p?barcode=123&name=Susu&brand=Ultra&category=Minuman&price=15000)
  if (raw.includes('?') || (raw.includes('=') && (raw.includes('&') || raw.includes(';')))) {
    try {
      const queryString = raw.includes('?') ? raw.split('?')[1] : raw;
      const params = new URLSearchParams(queryString);
      const barcode = params.get('barcode') || params.get('code') || params.get('id') || params.get('kode') || params.get('sku');
      const name = params.get('name') || params.get('nama') || params.get('title') || params.get('product');
      const brand = params.get('brand') || params.get('merk') || params.get('merek');
      const category = params.get('category') || params.get('kategori') || params.get('cat');
      const priceStr = params.get('price') || params.get('harga') || params.get('jual');
      const costStr = params.get('cost') || params.get('hpp') || params.get('beli');
      const unit = params.get('unit') || params.get('satuan');

      if (barcode || name) {
        return {
          raw,
          barcode: (barcode || name || '').trim(),
          sku: (params.get('sku') || barcode || '').trim(),
          name: name ? name.trim() : undefined,
          brand: brand ? brand.trim() : undefined,
          category: category ? category.trim() : undefined,
          price: priceStr ? Number(priceStr) : undefined,
          costPrice: costStr ? Number(costStr) : undefined,
          unit: unit ? unit.trim() : undefined,
          isStructured: true,
          source: 'url',
        };
      }
    } catch (_) {}
  }

  // 3. Cek format Key-Value Multiline (Contoh: Barcode: 8991234\nNama: Kopi\nMerk: ABC\nKategori: Minuman\nHarga: 15000)
  if (raw.includes(':') && (raw.includes('\n') || raw.includes('\r') || raw.includes(';'))) {
    const lines = raw.split(/[\r\n;]+/).map(l => l.trim()).filter(Boolean);
    const kv: Record<string, string> = {};
    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const k = parts[0].trim().toLowerCase();
        const v = parts.slice(1).join(':').trim();
        kv[k] = v;
      }
    }

    const barcode = kv['barcode'] || kv['code'] || kv['kode'] || kv['id'] || kv['sku'];
    const name = kv['nama'] || kv['nama produk'] || kv['name'] || kv['title'] || kv['produk'];
    const brand = kv['merk'] || kv['merek'] || kv['brand'] || kv['produsen'];
    const category = kv['kategori'] || kv['category'] || kv['jenis'] || kv['cat'];
    const priceStr = kv['harga'] || kv['harga jual'] || kv['price'] || kv['jual'];
    const costStr = kv['hpp'] || kv['harga beli'] || kv['cost'] || kv['beli'];
    const unit = kv['satuan'] || kv['unit'];

    if (barcode || name) {
      return {
        raw,
        barcode: barcode || name || raw,
        sku: kv['sku'] || barcode,
        name: name || undefined,
        brand: brand || undefined,
        category: category || undefined,
        price: priceStr ? Number(priceStr.replace(/[^0-9.-]+/g, '')) : undefined,
        costPrice: costStr ? Number(costStr.replace(/[^0-9.-]+/g, '')) : undefined,
        unit: unit || undefined,
        isStructured: true,
        source: 'key-value',
      };
    }
  }

  // 4. Cek Delimiter Pipe `|` atau Semicolon `;` (Contoh: "8991234|Susu Ultra 1L|Ultra Milk|Minuman|18000" atau "SONGKOK MUSLIM|ON")
  if (raw.includes('|') || (raw.includes(';') && !raw.includes(':'))) {
    const delimiter = raw.includes('|') ? '|' : ';';
    const parts = raw.split(delimiter).map(p => p.trim()).filter(Boolean);

    if (parts.length >= 2) {
      let barcode = '';
      let name = '';
      let brand: string | undefined;
      let category: string | undefined;
      let price: number | undefined;

      // Jika format 5 kolom: Kode|Nama|Merk|Kategori|Harga
      if (parts.length >= 5) {
        barcode = parts[0];
        name = parts[1];
        brand = parts[2];
        category = parts[3];
        price = Number(parts[4].replace(/[^0-9.-]+/g, '')) || undefined;
      } 
      // Jika format 4 kolom: Kode|Nama|Merk/Kategori|Harga
      else if (parts.length === 4) {
        barcode = parts[0];
        name = parts[1];
        brand = parts[2];
        price = Number(parts[3].replace(/[^0-9.-]+/g, '')) || undefined;
      }
      // Jika format 3 kolom: Kode|Nama|Harga atau Merk - Nama - Kode
      else if (parts.length === 3) {
        if (/^\d+$/.test(parts[0])) {
          barcode = parts[0];
          name = parts[1];
          price = Number(parts[2].replace(/[^0-9.-]+/g, '')) || undefined;
        } else {
          name = parts[0];
          brand = parts[1];
          barcode = parts[2];
        }
      }
      // Jika format 2 kolom: Nama|Kode atau Kode|Nama
      else if (parts.length === 2) {
        if (/^\d+$/.test(parts[0])) {
          barcode = parts[0];
          name = parts[1];
        } else {
          name = parts[0];
          barcode = parts[1];
        }
      }

      return {
        raw,
        barcode: barcode || raw,
        sku: barcode || raw,
        name: name || undefined,
        brand: brand || undefined,
        category: category || undefined,
        price,
        isStructured: true,
        source: 'delimited',
      };
    }
  }

  // 5. Cek Delimiter Dash Berulang " - " (Contoh: "Indofood - Indomie Goreng - 8998866200018 - 3500")
  if (raw.includes(' - ')) {
    const parts = raw.split(' - ').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      let brand: string | undefined;
      let name = '';
      let barcode = '';
      let price: number | undefined;

      if (parts.length >= 4) {
        brand = parts[0];
        name = parts[1];
        barcode = parts[2];
        price = Number(parts[3].replace(/[^0-9.-]+/g, '')) || undefined;
      } else if (parts.length === 3) {
        brand = parts[0];
        name = parts[1];
        barcode = parts[2];
      } else {
        brand = parts[0];
        name = parts[1];
        barcode = parts[1];
      }

      return {
        raw,
        barcode: barcode || raw,
        sku: barcode || raw,
        name: name || undefined,
        brand: brand || undefined,
        price,
        isStructured: true,
        source: 'delimited',
      };
    }
  }

  // 6. Barcode Timbangan Digital / Supermarket Scale Barcode (Format: 20XXXXXWWWWWC atau 02XXXXXPPPPPPC)
  // Format standar: 2 digit prefix (20/02) + 5 digit SKU produk + 5 digit berat/harga + 1 checksum
  if (/^(20|02)\d{10,11}$/.test(raw)) {
    const prefix = raw.slice(0, 2);
    const itemSku = raw.slice(2, 7);
    const amountVal = Number(raw.slice(7, 12));

    if (prefix === '20') {
      // 20 = Timbangan Berat (Gram)
      return {
        raw,
        barcode: `20${itemSku}`,
        sku: itemSku,
        weightGrams: amountVal,
        isStructured: true,
        source: 'scale',
      };
    } else if (prefix === '02') {
      // 02 = Timbangan Harga Langsung (Rp)
      return {
        raw,
        barcode: `02${itemSku}`,
        sku: itemSku,
        price: amountVal,
        isStructured: true,
        source: 'scale',
      };
    }
  }

  // 7. Plain Barcode (EAN-13, Code128, UPC, SKU)
  return {
    raw,
    barcode: raw,
    sku: raw,
    isStructured: false,
    source: 'plain',
  };
}

/**
 * 🚀 Smart Complete Resolver:
 * Melakukan parsing barcode mentah + Otomatis mencari di Database Master Produk (Katalog Nasional / Open Food API)
 * Menghasilkan data lengkap: Barcode, Nama Produk, Merk, Kategori, dan Harga Rekomendasi!
 */
export async function resolveFullBarcodeInfo(rawInput: string): Promise<ParsedProductBarcode> {
  const parsed = parseRawBarcodeData(rawInput);

  // Jika barcode sudah memiliki nama dan merk lengkap dari QR/structured payload, langsung gunakan
  if (parsed.name && parsed.brand && parsed.category) {
    return parsed;
  }

  // Jika nama/merk belum lengkap, lakukan pencarian di Database Master Barcode Indonesia & Global
  const lookupCode = parsed.barcode || parsed.sku || parsed.raw;
  if (lookupCode) {
    const masterData: MasterProductData | null = await lookupMasterBarcode(lookupCode);
    if (masterData) {
      return {
        ...parsed,
        barcode: masterData.barcode || parsed.barcode,
        name: parsed.name || masterData.name,
        brand: parsed.brand || masterData.brand,
        category: parsed.category || masterData.category,
        price: parsed.price ?? masterData.suggestedPrice,
        costPrice: parsed.costPrice ?? masterData.suggestedCostPrice,
        isStructured: true,
        source: parsed.isStructured ? parsed.source : 'master-catalog',
      };
    }
  }

  return parsed;
}
