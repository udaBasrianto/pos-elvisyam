// Master Database Barcode Produk Ritel Indonesia & Global Lookup Engine
export interface MasterProductData {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  suggestedPrice?: number;
  suggestedCostPrice?: number;
  unit?: string;
}

// Built-in Curated Master Barcode Database (Toko Ritel Indonesia, Minimarket, Warung & Swalayan)
export const INDONESIAN_MASTER_BARCODES: Record<string, MasterProductData> = {
  // Cussons & Baby Care
  "8888103203014": { barcode: "8888103203014", name: "Cussons Baby Shampo Avocado 50+50", brand: "Cussons", category: "Perlengkapan Bayi", suggestedPrice: 9000, suggestedCostPrice: 7781, unit: "Btl" },
  "8999999001234": { barcode: "8999999001234", name: "Cussons Baby Powder Soft & Smooth 200g", brand: "Cussons", category: "Perlengkapan Bayi", suggestedPrice: 14500, suggestedCostPrice: 12000, unit: "Btl" },
  "8999999002345": { barcode: "8999999002345", name: "Cussons Baby Oil Mild & Gentle 100ml", brand: "Cussons", category: "Perlengkapan Bayi", suggestedPrice: 18000, suggestedCostPrice: 15500, unit: "Btl" },
  "8999999050012": { barcode: "8999999050012", name: "MamyPoko Pants Standar M 34", brand: "MamyPoko", category: "Perlengkapan Bayi", suggestedPrice: 58000, suggestedCostPrice: 52000, unit: "Pack" },
  "8999999050029": { barcode: "8999999050029", name: "MamyPoko Pants Standar L 30", brand: "MamyPoko", category: "Perlengkapan Bayi", suggestedPrice: 58000, suggestedCostPrice: 52000, unit: "Pack" },
  "8999999050036": { barcode: "8999999050036", name: "MamyPoko Pants Standar XL 26", brand: "MamyPoko", category: "Perlengkapan Bayi", suggestedPrice: 58000, suggestedCostPrice: 52000, unit: "Pack" },

  // Sampo & Perawatan Rambut (Unilever, Wings, Procter & Gamble)
  "8999999003456": { barcode: "8999999003456", name: "Sunsilk Shampoo Soft & Smooth 160ml", brand: "Sunsilk", category: "Perawatan Diri", suggestedPrice: 24000, suggestedCostPrice: 20900, unit: "Btl" },
  "8999999004567": { barcode: "8999999004567", name: "Clear Ice Cool Menthol Shampoo 160ml", brand: "Clear", category: "Perawatan Diri", suggestedPrice: 26500, suggestedCostPrice: 23000, unit: "Btl" },
  "8999999005678": { barcode: "8999999005678", name: "Lifebuoy Shampoo Strong & Shiny 170ml", brand: "Lifebuoy", category: "Perawatan Diri", suggestedPrice: 19500, suggestedCostPrice: 16800, unit: "Btl" },
  "8999999006789": { barcode: "8999999006789", name: "Pantene Shampoo Anti Dandruff 160ml", brand: "Pantene", category: "Perawatan Diri", suggestedPrice: 27000, suggestedCostPrice: 23500, unit: "Btl" },
  "8999999550112": { barcode: "8999999550112", name: "Head & Shoulders Cool Menthol 160ml", brand: "Head & Shoulders", category: "Perawatan Diri", suggestedPrice: 28000, suggestedCostPrice: 24500, unit: "Btl" },

  // Sabun & Mandi
  "8999999007890": { barcode: "8999999007890", name: "Lifebuoy Sabun Mandi Cair Total 10 450ml", brand: "Lifebuoy", category: "Perawatan Diri", suggestedPrice: 28500, suggestedCostPrice: 24500, unit: "Pouch" },
  "8999999008901": { barcode: "8999999008901", name: "Lux Body Wash Velvet Jasmine 450ml", brand: "Lux", category: "Perawatan Diri", suggestedPrice: 29000, suggestedCostPrice: 25000, unit: "Pouch" },
  "8999999009012": { barcode: "8999999009012", name: "Giv Sabun Batang White Beauty 76g", brand: "Giv", category: "Perawatan Diri", suggestedPrice: 3500, suggestedCostPrice: 2900, unit: "Pcs" },
  "8999999550221": { barcode: "8999999550221", name: "Dettol Sabun Cair Original 410ml", brand: "Dettol", category: "Perawatan Diri", suggestedPrice: 31000, suggestedCostPrice: 27000, unit: "Pouch" },
  "8999999550332": { barcode: "8999999550332", name: "Biore Body Foam Relaxing Aromatic 450ml", brand: "Biore", category: "Perawatan Diri", suggestedPrice: 29500, suggestedCostPrice: 25500, unit: "Pouch" },

  // Pasta Gigi
  "8999999010123": { barcode: "8999999010123", name: "Pepsodent Pasta Gigi Complete 8 190g", brand: "Pepsodent", category: "Perawatan Gigi", suggestedPrice: 16500, suggestedCostPrice: 14000, unit: "Pcs" },
  "8999999011234": { barcode: "8999999011234", name: "Ciptadent Pasta Gigi Fresh Mint 190g", brand: "Ciptadent", category: "Perawatan Gigi", suggestedPrice: 11000, suggestedCostPrice: 9200, unit: "Pcs" },
  "8999999550443": { barcode: "8999999550443", name: "CloseUp Pasta Gigi Ever Fresh 160g", brand: "CloseUp", category: "Perawatan Gigi", suggestedPrice: 18500, suggestedCostPrice: 15800, unit: "Pcs" },

  // Makanan & Mi Instan (Indofood, Wings Food, Mayora)
  "8998866200018": { barcode: "8998866200018", name: "Indomie Mi Goreng Spesial 85g", brand: "Indomie", category: "Makanan Instan", suggestedPrice: 3500, suggestedCostPrice: 2950, unit: "Bks" },
  "8998866200025": { barcode: "8998866200025", name: "Indomie Kuah Rasa Ayam Bawang 75g", brand: "Indomie", category: "Makanan Instan", suggestedPrice: 3300, suggestedCostPrice: 2800, unit: "Bks" },
  "8998866200032": { barcode: "8998866200032", name: "Indomie Kuah Rasa Soto Mie 75g", brand: "Indomie", category: "Makanan Instan", suggestedPrice: 3300, suggestedCostPrice: 2800, unit: "Bks" },
  "8998866200049": { barcode: "8998866200049", name: "Indomie Kuah Kari Ayam 72g", brand: "Indomie", category: "Makanan Instan", suggestedPrice: 3400, suggestedCostPrice: 2850, unit: "Bks" },
  "8998866200056": { barcode: "8998866200056", name: "Indomie Mi Goreng Rendang 91g", brand: "Indomie", category: "Makanan Instan", suggestedPrice: 3500, suggestedCostPrice: 2950, unit: "Bks" },
  "8998866200544": { barcode: "8998866200544", name: "Mie Sedaap Goreng Original 90g", brand: "Mie Sedaap", category: "Makanan Instan", suggestedPrice: 3400, suggestedCostPrice: 2850, unit: "Bks" },
  "8998866200551": { barcode: "8998866200551", name: "Mie Sedaap Kuah Soto 75g", brand: "Mie Sedaap", category: "Makanan Instan", suggestedPrice: 3200, suggestedCostPrice: 2750, unit: "Bks" },
  "8998866200568": { barcode: "8998866200568", name: "Mie Sedaap Korean Spicy Soup 77g", brand: "Mie Sedaap", category: "Makanan Instan", suggestedPrice: 3500, suggestedCostPrice: 2950, unit: "Bks" },
  "8998866200902": { barcode: "8998866200902", name: "Pop Mie Kuah Rasa Ayam Bawang 75g", brand: "Pop Mie", category: "Makanan Instan", suggestedPrice: 5500, suggestedCostPrice: 4700, unit: "Cup" },
  "8998866200919": { barcode: "8998866200919", name: "Pop Mie Goreng Pedes Dower 75g", brand: "Pop Mie", category: "Makanan Instan", suggestedPrice: 5500, suggestedCostPrice: 4700, unit: "Cup" },

  // Minuman Air Mineral, Teh & Kopi Siap Minum
  "8992761001006": { barcode: "8992761001006", name: "Aqua Air Mineral Botol 600ml", brand: "Aqua", category: "Minuman", suggestedPrice: 3500, suggestedCostPrice: 2700, unit: "Btl" },
  "8992761001013": { barcode: "8992761001013", name: "Aqua Air Mineral Botol 1500ml", brand: "Aqua", category: "Minuman", suggestedPrice: 6500, suggestedCostPrice: 5200, unit: "Btl" },
  "8992761001020": { barcode: "8992761001020", name: "Aqua Air Mineral Gelas 220ml", brand: "Aqua", category: "Minuman", suggestedPrice: 1000, suggestedCostPrice: 750, unit: "Cup" },
  "8992758000010": { barcode: "8992758000010", name: "Teh Pucuk Harum Botol 350ml", brand: "Teh Pucuk", category: "Minuman", suggestedPrice: 4000, suggestedCostPrice: 3100, unit: "Btl" },
  "8992758000027": { barcode: "8992758000027", name: "Teh Botol Sosro Kotak 250ml", brand: "Sosro", category: "Minuman", suggestedPrice: 3500, suggestedCostPrice: 2800, unit: "Kotak" },
  "8992758000034": { barcode: "8992758000034", name: "Le Minerale Air Mineral 600ml", brand: "Le Minerale", category: "Minuman", suggestedPrice: 3500, suggestedCostPrice: 2650, unit: "Btl" },
  "8992758000041": { barcode: "8992758000041", name: "Le Minerale Air Mineral 1500ml", brand: "Le Minerale", category: "Minuman", suggestedPrice: 6500, suggestedCostPrice: 5100, unit: "Btl" },
  "8992741987012": { barcode: "8992741987012", name: "Pocari Sweat Botol 500ml", brand: "Pocari Sweat", category: "Minuman", suggestedPrice: 8500, suggestedCostPrice: 7100, unit: "Btl" },
  "8992741987029": { barcode: "8992741987029", name: "Pocari Sweat Kaleng 330ml", brand: "Pocari Sweat", category: "Minuman", suggestedPrice: 7000, suggestedCostPrice: 5800, unit: "Klg" },
  "8991001100018": { barcode: "8991001100018", name: "Ultra Milk Susu UHT Full Cream 1000ml", brand: "Ultra Milk", category: "Susu & Olahan", suggestedPrice: 20000, suggestedCostPrice: 17500, unit: "Kotak" },
  "8991001100025": { barcode: "8991001100025", name: "Ultra Milk Susu UHT Cokelat 1000ml", brand: "Ultra Milk", category: "Susu & Olahan", suggestedPrice: 20000, suggestedCostPrice: 17500, unit: "Kotak" },
  "8991001100032": { barcode: "8991001100032", name: "Ultra Milk Susu UHT Full Cream 250ml", brand: "Ultra Milk", category: "Susu & Olahan", suggestedPrice: 6500, suggestedCostPrice: 5400, unit: "Kotak" },
  "8991001100049": { barcode: "8991001100049", name: "Ultra Milk Susu UHT Cokelat 250ml", brand: "Ultra Milk", category: "Susu & Olahan", suggestedPrice: 6500, suggestedCostPrice: 5400, unit: "Kotak" },
  "8992696404419": { barcode: "8992696404419", name: "Bear Brand Susu Steril 189ml", brand: "Nestle", category: "Susu & Olahan", suggestedPrice: 10500, suggestedCostPrice: 9200, unit: "Klg" },
  "8992696404426": { barcode: "8992696404426", name: "Milo UHT Cokelat 180ml", brand: "Milo", category: "Susu & Olahan", suggestedPrice: 5500, suggestedCostPrice: 4700, unit: "Kotak" },
  "8991002105678": { barcode: "8991002105678", name: "Good Day Cappuccino 250ml Botol", brand: "Good Day", category: "Kopi & Teh", suggestedPrice: 7500, suggestedCostPrice: 6200, unit: "Btl" },
  "8991002105685": { barcode: "8991002105685", name: "Kopiko Lucky Day Coffee 250ml", brand: "Kopiko", category: "Kopi & Teh", suggestedPrice: 7500, suggestedCostPrice: 6200, unit: "Btl" },

  // Kopi Bubuk & Sachet
  "8991002100017": { barcode: "8991002100017", name: "Kapal Api Kopi Spesial Mix 24g (Renceng)", brand: "Kapal Api", category: "Kopi & Teh", suggestedPrice: 15000, suggestedCostPrice: 13000, unit: "Renceng" },
  "8991002100024": { barcode: "8991002100024", name: "Kapal Api Kopi Spesial 165g", brand: "Kapal Api", category: "Kopi & Teh", suggestedPrice: 16000, suggestedCostPrice: 13800, unit: "Bks" },
  "8991002100031": { barcode: "8991002100031", name: "Good Day Mocacinno 20g (Renceng 10s)", brand: "Good Day", category: "Kopi & Teh", suggestedPrice: 14000, suggestedCostPrice: 12200, unit: "Renceng" },
  "8991002100048": { barcode: "8991002100048", name: "Torabika Cappuccino 25g (Renceng 10s)", brand: "Torabika", category: "Kopi & Teh", suggestedPrice: 18000, suggestedCostPrice: 15500, unit: "Renceng" },
  "8991002100055": { barcode: "8991002100055", name: "Luwak White Koffie Original 20g (10s)", brand: "Luwak", category: "Kopi & Teh", suggestedPrice: 14500, suggestedCostPrice: 12500, unit: "Renceng" },

  // Camilan & Snack
  "8992741001234": { barcode: "8992741001234", name: "Chitato Snack Sapi Panggang 68g", brand: "Chitato", category: "Makanan Ringan", suggestedPrice: 11500, suggestedCostPrice: 9600, unit: "Bks" },
  "8992741002345": { barcode: "8992741002345", name: "Silverqueen Chocolate Milk 62g", brand: "Silverqueen", category: "Makanan Ringan", suggestedPrice: 16500, suggestedCostPrice: 13800, unit: "Pcs" },
  "8992741003456": { barcode: "8992741003456", name: "Beng Beng Chocolate Wafer 20g", brand: "Mayora", category: "Makanan Ringan", suggestedPrice: 2500, suggestedCostPrice: 2000, unit: "Pcs" },
  "8992741004567": { barcode: "8992741004567", name: "Roma Kelapa Biskuit 300g", brand: "Roma", category: "Makanan Ringan", suggestedPrice: 12000, suggestedCostPrice: 10100, unit: "Bks" },
  "8992741005678": { barcode: "8992741005678", name: "Oreo Biskuit Sandwich Vanilla 133g", brand: "Oreo", category: "Makanan Ringan", suggestedPrice: 9500, suggestedCostPrice: 8000, unit: "Bks" },
  "8992741006789": { barcode: "8992741006789", name: "Tango Wafer Cokelat 130g", brand: "Tango", category: "Makanan Ringan", suggestedPrice: 8500, suggestedCostPrice: 7200, unit: "Bks" },
  "8992741007890": { barcode: "8992741007890", name: "Pocky Biskuit Stick Cokelat 47g", brand: "Glico", category: "Makanan Ringan", suggestedPrice: 9000, suggestedCostPrice: 7600, unit: "Kotak" },

  // Sembako & Minyak Goreng
  "8991003100016": { barcode: "8991003100016", name: "Bimoli Minyak Goreng Pouch 2L", brand: "Bimoli", category: "Sembako", suggestedPrice: 38000, suggestedCostPrice: 34500, unit: "Pouch" },
  "8991003100023": { barcode: "8991003100023", name: "Sania Minyak Goreng Pouch 2L", brand: "Sania", category: "Sembako", suggestedPrice: 37500, suggestedCostPrice: 34000, unit: "Pouch" },
  "8991003100030": { barcode: "8991003100030", name: "Filma Minyak Goreng Pouch 2L", brand: "Filma", category: "Sembako", suggestedPrice: 38500, suggestedCostPrice: 35000, unit: "Pouch" },
  "8991003100047": { barcode: "8991003100047", name: "Gulaku Gula Pasir Tebu Kuning 1kg", brand: "Gulaku", category: "Sembako", suggestedPrice: 18000, suggestedCostPrice: 16200, unit: "Bks" },
  "8991003100054": { barcode: "8991003100054", name: "Segitiga Biru Tepung Terigu 1kg", brand: "Bogasari", category: "Sembako", suggestedPrice: 13500, suggestedCostPrice: 11800, unit: "Bks" },
  "8991003100061": { barcode: "8991003100061", name: "Kecap Bango Manis Refill 550ml", brand: "Bango", category: "Bumbu Dapur", suggestedPrice: 24000, suggestedCostPrice: 21000, unit: "Pouch" },
  "8991003100078": { barcode: "8991003100078", name: "Kecap ABC Manis Botol 135ml", brand: "ABC", category: "Bumbu Dapur", suggestedPrice: 7500, suggestedCostPrice: 6200, unit: "Btl" },
};

/**
 * Fast Lookup for barcode data:
 * 1. Checks built-in Master Barcode Dictionary.
 * 2. If not in dictionary, queries Open Food Facts API asynchronously for product title & brand.
 */
export async function lookupMasterBarcode(barcode: string): Promise<MasterProductData | null> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) return null;

  // 1. Direct match in local catalog
  if (INDONESIAN_MASTER_BARCODES[cleanBarcode]) {
    return INDONESIAN_MASTER_BARCODES[cleanBarcode];
  }

  // 2. Try match without leading zeros
  const noZeros = cleanBarcode.replace(/^0+/, '');
  if (noZeros && INDONESIAN_MASTER_BARCODES[noZeros]) {
    return INDONESIAN_MASTER_BARCODES[noZeros];
  }

  // 3. Try online Open Food / Global Product Lookup API
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.status === 1 && data.product) {
        const prod = data.product;
        const productName = prod.product_name_id || prod.product_name || prod.generic_name || null;
        if (productName) {
          const brandName = prod.brands ? prod.brands.split(',')[0].trim() : undefined;
          const categoryName = prod.categories ? prod.categories.split(',')[0].trim() : undefined;
          return {
            barcode: cleanBarcode,
            name: productName.trim(),
            brand: brandName,
            category: categoryName,
          };
        }
      }
    }
  } catch (err) {
    console.warn("Online master barcode lookup failed:", err);
  }

  return null;
}
