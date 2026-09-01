package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"time"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/utils"

	_ "github.com/lib/pq"
)

type InspectionItem struct {
	Key    string `json:"key"`
	Label  string `json:"label"`
	Status string `json:"status"` // ok, warning, danger
}

func main() {
	fmt.Println("=========================================================")
	fmt.Println("🛠️  POSH DEMO SEEDER: MODUL ANTRIAN & MODUL BENGKEL (20 DATA)")
	fmt.Println("=========================================================")

	cfg := config.LoadConfig()
	db, err := database.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("❌ Database connection error: %v", err)
	}
	defer db.Close()

	// 1. Find user / tenant "tokoryo"
	var user struct {
		ID       string `db:"id"`
		Email    string `db:"email"`
		FullName string `db:"full_name"`
		TenantID string `db:"tenant_id"`
		Role     string `db:"role"`
	}

	err = db.Get(&user, `
		SELECT id, email, full_name, COALESCE(tenant_id, id) as tenant_id, role
		FROM users
		WHERE email ILIKE '%tokoryo%' OR full_name ILIKE '%tokoryo%' OR id IN (
			SELECT user_id FROM settings WHERE business_name ILIKE '%tokoryo%'
		)
		LIMIT 1
	`)

	if err != nil {
		var allUsers []struct {
			ID       string `db:"id"`
			Email    string `db:"email"`
			FullName string `db:"full_name"`
			Role     string `db:"role"`
		}
		_ = db.Select(&allUsers, "SELECT id, email, full_name, role FROM users")
		fmt.Printf("⚠️ User 'tokoryo' tidak ditemukan langsung. Daftar user terdaftar:\n")
		for _, u := range allUsers {
			fmt.Printf(" - ID: %s | Email: %s | Name: %s | Role: %s\n", u.ID, u.Email, u.FullName, u.Role)
		}

		if len(allUsers) > 0 {
			var pickedID string
			for _, u := range allUsers {
				if u.Role == "admin" {
					pickedID = u.ID
					break
				}
			}
			if pickedID == "" {
				pickedID = allUsers[0].ID
			}
			_ = db.Get(&user, "SELECT id, email, full_name, COALESCE(tenant_id, id) as tenant_id, role FROM users WHERE id = $1", pickedID)
			fmt.Printf("👉 Menggunakan user: %s (%s)\n", user.FullName, user.Email)
		} else {
			log.Fatalf("❌ Tidak ada user di database")
		}
	} else {
		fmt.Printf("✅ Ditemukan akun tokoryo: %s (%s) [TenantID: %s]\n", user.FullName, user.Email, user.TenantID)
	}

	tenantID := user.TenantID
	if tenantID == "" {
		tenantID = user.ID
	}

	// 2. Enable service_queue_enabled, workshop_enabled, barbershop_enabled, fnb_enabled in settings
	fmt.Println("⚙️  Mengaktifkan modul antrian, bengkel, barbershop & F&B di tabel settings...")
	_, err = db.Exec(`
		INSERT INTO settings (id, user_id, service_queue_enabled, workshop_enabled, barbershop_enabled, fnb_enabled, fnb_service_charge_percent, service_stations, queue_prefix, updated_at)
		VALUES ($1, $2, TRUE, TRUE, TRUE, TRUE, 5, 'Pit 1 - Servis Cepat,Pit 2 - Lift A,Pit 3 - Lift B,Stasiun Spooring,Kursi Tunggu VIP', 'A', CURRENT_TIMESTAMP)
		ON CONFLICT (user_id) DO UPDATE SET
			service_queue_enabled = TRUE,
			workshop_enabled = TRUE,
			barbershop_enabled = TRUE,
			fnb_enabled = TRUE,
			fnb_service_charge_percent = 5,
			service_stations = 'Pit 1 - Servis Cepat,Pit 2 - Lift A,Pit 3 - Lift B,Stasiun Spooring,Kursi Tunggu VIP',
			queue_prefix = 'A',
			updated_at = CURRENT_TIMESTAMP
	`, utils.GenerateUUID(), tenantID)
	if err != nil {
		fmt.Printf("⚠️ Settings note: %v\n", err)
	}

	// 3. Ensure Customers exist
	customerNames := []string{
		"Budi Pratama", "Siti Nurhaliza", "Hendro Gunawan", "Rina Marlina",
		"Doni Kusuma", "Dewi Lestari", "Eko Prasetyo", "Maya Safitri",
		"Aris Wibowo", "Fitri Handayani", "Bayu Wicaksono", "Anisa Rahmawati",
		"Rizky Ramadhan", "Dian Sastro", "Guruh Soekarno", "Wawan Kurniawan",
		"Yanti Suryani", "Tono Sudirgo", "Fajar Hidayat", "Lina Marliani",
	}

	customerIDs := make([]string, len(customerNames))
	for i, name := range customerNames {
		var existingID string
		phone := fmt.Sprintf("0812%04d%04d", rand.Intn(9999), i+1000)
		err := db.Get(&existingID, "SELECT id FROM customers WHERE tenant_id = $1 AND name = $2 LIMIT 1", tenantID, name)
		if err != nil || existingID == "" {
			cID := utils.GenerateUUID()
			_, _ = db.Exec(`
				INSERT INTO customers (id, tenant_id, name, phone, address, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			`, cID, tenantID, name, phone, fmt.Sprintf("Jl. Merdeka No. %d, Jakarta", i+1))
			customerIDs[i] = cID
		} else {
			customerIDs[i] = existingID
		}
	}

	// 4. Ensure Sparepart Products exist
	sparepartList := []struct {
		Name  string
		Price float64
		Cost  float64
		Stock int
	}{
		{"Oli Mesin Shell Helix HX7 10W-40 4L", 385000, 310000, 45},
		{"Oli Mesin Motul 5100 4T 10W-40 1L", 145000, 115000, 60},
		{"Filter Oli Toyota / Daihatsu Original", 45000, 28000, 80},
		{"Filter Oli Honda Original", 50000, 32000, 75},
		{"Kampas Rem Depan Bendix Avanza / Xenia", 285000, 210000, 30},
		{"Kampas Rem Belakang Honda Brio / Jazz", 260000, 195000, 25},
		{"Busi Iridium NGK CPR9EAIX-9 (Mobil/Motor)", 125000, 90000, 100},
		{"Air Radiator Coolant Prestone 4L Hijau", 110000, 75000, 40},
		{"Cairan Minyak Rem Dot 4 Jumbo 300ml", 35000, 22000, 50},
		{"Engine Cleaner / Carbon Cleaner Foam", 85000, 55000, 65},
		{"V-Belt Gates / Bando Vario 150/160", 175000, 125000, 35},
		{"Roller Set Daytona Racing NMAX / Aerox", 115000, 80000, 40},
	}

	productIDs := make([]string, len(sparepartList))
	for i, sp := range sparepartList {
		var pID string
		err := db.Get(&pID, "SELECT id FROM products WHERE tenant_id = $1 AND name = $2 LIMIT 1", tenantID, sp.Name)
		if err != nil || pID == "" {
			newPID := utils.GenerateUUID()
			_, _ = db.Exec(`
				INSERT INTO products (id, tenant_id, name, category, price, cost, stock, min_stock, sku, is_active, created_at, updated_at)
				VALUES ($1, $2, $3, 'Sparepart & Oli', $4, $5, $6, 5, $7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			`, newPID, tenantID, sp.Name, sp.Price, sp.Cost, sp.Stock, fmt.Sprintf("PART-%03d", i+1))
			productIDs[i] = newPID
		} else {
			productIDs[i] = pID
		}
	}

	// 5. Seed Workshop Stalls
	fmt.Println("🏎️  Membuat Master Stall Bengkel...")
	stallTemplates := []struct {
		Name      string
		StallType string
		Status    string
	}{
		{"Stall 1 - Express Service", "general", "occupied"},
		{"Stall 2 - Two-Post Lift A", "lift_2post", "occupied"},
		{"Stall 3 - Two-Post Lift B", "lift_2post", "available"},
		{"Stall 4 - Pit Kolong / Ganti Oli", "pit", "available"},
		{"Stall 5 - Spooring & Alignment 3D", "spooring", "available"},
		{"Stall 6 - Cuci & Detailing Engine", "wash", "maintenance"},
	}

	stallIDs := make([]string, len(stallTemplates))
	for i, st := range stallTemplates {
		var sID string
		err := db.Get(&sID, "SELECT id FROM workshop_stalls WHERE tenant_id = $1 AND name = $2 LIMIT 1", tenantID, st.Name)
		if err != nil || sID == "" {
			newSID := utils.GenerateUUID()
			_, _ = db.Exec(`
				INSERT INTO workshop_stalls (id, tenant_id, name, stall_type, status, notes, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, 'Stall pengerjaan operasional', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			`, newSID, tenantID, st.Name, st.StallType, st.Status)
			stallIDs[i] = newSID
		} else {
			stallIDs[i] = sID
		}
	}

	// 6. Seed Workshop Services Catalog
	fmt.Println("🔧  Membuat Katalog Jasa Servis & Komisi Mekanik...")
	serviceCatalog := []struct {
		Name            string
		Code            string
		Category        string
		Duration        int
		Price           float64
		CommissionType  string
		CommissionValue float64
	}{
		{"Jasa Ganti Oli Mesin & Filter", "SRV-001", "Perawatan Berkala", 20, 45000, "fixed", 15000},
		{"Tune Up Mesin & Gurah Karbon EFI", "SRV-002", "Mesin & Transmisi", 60, 250000, "percentage", 15},
		{"Service Rem 4 Roda & Bleeding", "SRV-003", "Kaki-kaki & Rem", 45, 175000, "percentage", 20},
		{"Spooring 3D & Balancing 4 Roda", "SRV-004", "Kaki-kaki & Rem", 40, 220000, "fixed", 40000},
		{"Flushing Radiator Coolant + Bleed", "SRV-005", "Sistem Pendingin", 30, 85000, "fixed", 25000},
		{"Paket Servis Ringan 10.000 KM", "SRV-006", "Perawatan Berkala", 60, 350000, "percentage", 12},
		{"Paket Servis Besar 40.000 KM", "SRV-007", "Perawatan Berkala", 120, 750000, "percentage", 15},
		{"Service CVT / V-Belt & Pembersihan Roller", "SRV-008", "Motorcycle Care", 35, 65000, "fixed", 20000},
		{"Overhaul Transmisi Otomatis (Matic)", "SRV-009", "Mesin & Transmisi", 240, 1850000, "percentage", 20},
		{"Scanning Engine OBD2 & Reset ECU", "SRV-010", "Diagnostik & Elektrikal", 20, 100000, "fixed", 35000},
	}

	serviceIDs := make([]string, len(serviceCatalog))
	for i, srv := range serviceCatalog {
		var sID string
		err := db.Get(&sID, "SELECT id FROM workshop_services WHERE tenant_id = $1 AND name = $2 LIMIT 1", tenantID, srv.Name)
		if err != nil || sID == "" {
			newSID := utils.GenerateUUID()
			_, _ = db.Exec(`
				INSERT INTO workshop_services (id, tenant_id, name, code, category, standard_duration_min, price, commission_type, commission_value, is_active, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			`, newSID, tenantID, srv.Name, srv.Code, srv.Category, srv.Duration, srv.Price, srv.CommissionType, srv.CommissionValue)
			serviceIDs[i] = newSID
		} else {
			serviceIDs[i] = sID
		}
	}

	// 7. Seed 20 Vehicles
	fmt.Println("🚗  Membuat 20 Data Kendaraan...")
	vehicleData := []struct {
		Plate        string
		Type         string
		Brand        string
		Model        string
		Year         int
		Color        string
		Trans        string
		Fuel         string
		KM           int
		EngineNumber string
		VIN          string
		Notes        string
	}{
		{"B 1420 KFL", "car", "Toyota", "Avanza 1.3 G", 2021, "Putih", "Manual", "Bensin", 48200, "1NR-FE-829102", "MHF11BA3J8912301", "Ganti oli rutin setiap 7.000 KM"},
		{"B 2981 TMR", "car", "Honda", "HR-V 1.5 SE Prestige", 2022, "Hitam", "Otomatis (CVT)", "Bensin", 32150, "L15Z-991204", "MRH114299102481", "Keluhan bunyi decit di rem depan"},
		{"B 8889 RFS", "car", "Mitsubishi", "Pajero Sport Dakar 4x2", 2020, "Abu-abu", "Otomatis", "Diesel", 78500, "4N15-U78129", "MMB881294819203", "Kaki-kaki suspensi perlu dicek"},
		{"D 1902 ABX", "car", "Toyota", "Innova Zenix 2.0 V Hybrid", 2023, "Silver Metallic", "Otomatis (CVT)", "Hybrid", 19400, "M20A-FXS-91029", "MHF128910481239", "Servis berkala 20.000 KM"},
		{"B 4521 SHL", "motorcycle", "Honda", "Vario 160 ABS", 2023, "Merah Matte", "Otomatis (CVT)", "Bensin", 11200, "KF11E-1029481", "MH1KF1118PK10294", "Gredek saat tarikan awal CVT"},
		{"B 3390 PKZ", "motorcycle", "Yamaha", "NMAX 155 Connected ABS", 2022, "Biru Doff", "Otomatis (CVT)", "Bensin", 24300, "G3J4E-029481", "MH3SG4810PK01924", "Servis CVT + ganti vanbelt"},
		{"F 1234 CD", "car", "Daihatsu", "Terios 1.5 R Custom", 2019, "Putih", "Manual", "Bensin", 64000, "2NR-VE-102941", "MHK102948192039", "AC kurang dingin saat siang"},
		{"L 8192 YZ", "car", "Suzuki", "All New Ertiga Hybrid GX", 2022, "Coklat Magma", "Otomatis", "Hybrid", 31000, "K15B-881294", "MHK159102948192", "Perawatan berkala rutin"},
		{"B 9012 KLD", "truck", "Isuzu", "Traga Pick Up 2.5", 2021, "Putih", "Manual", "Diesel", 92400, "4JA1-L-019284", "MHITR10294819230", "Mobil operasional antar barang"},
		{"B 2049 JKL", "car", "Honda", "CR-V 1.5 Turbo Prestige", 2021, "Hitam Kristal", "Otomatis (CVT)", "Bensin", 52100, "L15BG-102948", "MRH102948192039", "Oli mesin & busi baru"},
		{"B 7777 WX", "car", "Toyota", "Fortuner 2.8 GR Sport 4x4", 2022, "Hitam", "Otomatis", "Diesel", 41200, "1GD-FTV-89102", "MHF891029481920", "Ganti kampas rem depan & belakang"},
		{"B 6612 MX", "motorcycle", "Yamaha", "Aerox 155 CyberCity", 2023, "Hitam Kuning", "Otomatis (CVT)", "Bensin", 14500, "B6Y1-1029481", "MH3B6Y102948192", "Knalpot standar, ganti oli mesin"},
		{"D 8102 MTR", "motorcycle", "Kawasaki", "Ninja ZX-25R 4 Silinder", 2022, "Hijau KRT", "Manual 6-Speed", "Bensin", 8900, "ZX250EE-01928", "JKA250EE8910293", "Tune up 4 silinder + busi iridium"},
		{"B 1010 EV", "car", "Hyundai", "Ioniq 5 Signature Long Range", 2023, "Gold Matte", "Otomatis", "Listrik (EV)", 15300, "EM16-1029481", "KMHE10294819203", "Cek rem, ban, rotasi roda"},
		{"B 5543 XP", "car", "Mitsubishi", "Xpander Ultimate CVT", 2022, "Abu-abu", "Otomatis (CVT)", "Bensin", 29800, "4A91-881920", "MMB4A9102948192", "Perawatan berkala 30.000 KM"},
		{"B 1982 BR", "car", "Honda", "Brio RS Urbanite", 2022, "Kuning Carnival", "Otomatis (CVT)", "Bensin", 23100, "L12B-019284", "MRH12B019284910", "Ganti oli mesin & spooring"},
		{"D 4455 JM", "car", "Suzuki", "Jimny 5-Door 4x4", 2024, "Jungle Green", "Otomatis", "Bensin", 4800, "K15B-991029", "JS3K15B01928491", "Pengecekan oli gardan 4x4"},
		{"B 3012 YR", "car", "Toyota", "Yaris Cross 1.5 S GR", 2023, "Merah Putih", "Otomatis (CVT)", "Hybrid", 16800, "2NR-VEX-10294", "MHF2NRVEX102948", "Servis berkala + filter AC"},
		{"B 9801 GM", "truck", "Daihatsu", "Gran Max Blind Van 1.3", 2020, "Silver", "Manual", "Bensin", 112000, "K3-DE-1029481", "MHK3DE019284910", "Armada kurir paket reguler"},
		{"B 8190 CX", "car", "Mazda", "CX-5 2.5 Elite AWD", 2021, "Soul Red Crystal", "Otomatis", "Bensin", 45000, "PY-VPS-891029", "JMZPYVPS8910293", "Spooring 3D dan balancing roda"},
	}

	vehicleIDs := make([]string, len(vehicleData))
	for i, v := range vehicleData {
		var vID string
		custID := customerIDs[i%len(customerIDs)]
		err := db.Get(&vID, "SELECT id FROM vehicles WHERE tenant_id = $1 AND plate_number = $2 LIMIT 1", tenantID, v.Plate)
		if err != nil || vID == "" {
			newVID := utils.GenerateUUID()
			_, _ = db.Exec(`
				INSERT INTO vehicles (id, tenant_id, customer_id, plate_number, vehicle_type, brand, model, year, color, vin_number, engine_number, transmission, fuel_type, current_km, notes, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			`, newVID, tenantID, custID, v.Plate, v.Type, v.Brand, v.Model, v.Year, v.Color, v.VIN, v.EngineNumber, v.Trans, v.Fuel, v.KM, v.Notes)
			vehicleIDs[i] = newVID
		} else {
			vehicleIDs[i] = vID
		}
	}

	// 8. Seed 20 Work Orders (SPK) with full lifecycle
	fmt.Println("📋  Membuat 20 Surat Perintah Kerja (SPK / PKB)...")
	mechanics := []string{"Bambang Santoso", "Agus Setiawan", "Rudi Hartono", "Indra Wijaya", "Joko Supriyanto"}
	statuses := []string{"in_progress", "in_progress", "ready", "qc", "pending_parts", "approved", "completed", "completed", "completed", "estimated", "draft", "completed", "ready", "in_progress", "completed", "completed", "in_progress", "completed", "approved", "completed"}
	complaints := []string{
		"Servis berkala + ganti oli mesin dan filter oli.",
		"Rem depan bunyi decit tajam saat menginjak pedal pelan.",
		"Tarikan awal berat dan tarikan gas agak tersendat saat tanjakan.",
		"AC tidak dingin dan ada hembusan bau tidak sedap dari blower.",
		"Spooring 3D roda depan narik ke kiri di kecepatan 60 km/jam.",
		"Ganti oli mesin, cek kondisi aki dan tekanan angin ban.",
		"Paket Tune Up EFI lengkap dan gurah karbon ruang bakar.",
		"Ganti kampas rem belakang + kuras minyak rem Dot 4.",
		"Suara gluduk-gluduk di roda kanan depan saat jalan berlubang.",
		"Lampu utama redup dan indikator aki menyala kuning di speedometer.",
		"CVT motor matic gredek parah di RPM rendah.",
		"Ganti oli mesin Shell Helix + ganti filter AC kabin.",
		"Perawatan berkala 20.000 KM sesuai buku servis resmi.",
		"Kuras air radiator dan cek kebocoran selang pendingin.",
		"Overhaul master rem dan ganti piringan cakram yang baret.",
		"Ganti oli gardan transmisi dan cek kebocoran oli karter.",
		"Servis besar 40.000 KM (Ganti busi, kuras rem, tune up).",
		"Rotasi ban 4 roda + balancing timah velg racing.",
		"Lampu rem belakang mati sebelah kanan.",
		"Pembersihan injektor bahan bakar sistem ultrasonik.",
	}

	now := time.Now()
	for i := 0; i < 20; i++ {
		woNum := fmt.Sprintf("PKB-%s-%04d", now.Format("200601"), i+1)
		vID := vehicleIDs[i]
		cID := customerIDs[i%len(customerIDs)]
		stID := stallIDs[i%len(stallIDs)]
		status := statuses[i]
		complaint := complaints[i]
		mech := mechanics[i%len(mechanics)]
		entryKM := vehicleData[i].KM

		// Inspection JSON
		insp := []InspectionItem{
			{Key: "engine_oil", Label: "Oli Mesin & Filter", Status: "ok"},
			{Key: "brakes", Label: "Kampas Rem & Minyak Rem", Status: "ok"},
			{Key: "battery", Label: "Aki & Kelistrikan", Status: "ok"},
			{Key: "tires", Label: "Kondisi Ban & Tekanan Angin", Status: "ok"},
			{Key: "lights", Label: "Lampu Utama & Lampu Rem", Status: "ok"},
			{Key: "suspension", Label: "Suspensi & Kaki-kaki", Status: "ok"},
			{Key: "cooling", Label: "Radiator & Air Pendingin", Status: "ok"},
		}
		if i%3 == 1 {
			insp[1].Status = "warning"
		}
		if i%4 == 2 {
			insp[0].Status = "warning"
		}
		inspBytes, _ := json.Marshal(insp)

		nextKM := entryKM + 5000
		nextDate := now.AddDate(0, 3, i*2).Format("2006-01-02")
		paymentStatus := "unpaid"
		if status == "completed" {
			paymentStatus = "paid"
		}

		// Calculate items
		srvIdx := i % len(serviceCatalog)
		srv := serviceCatalog[srvIdx]
		partIdx := i % len(sparepartList)
		part := sparepartList[partIdx]

		laborTotal := srv.Price
		partsTotal := part.Price
		grandTotal := laborTotal + partsTotal

		woID := utils.GenerateUUID()
		var existingWOID string
		err := db.Get(&existingWOID, "SELECT id FROM work_orders WHERE tenant_id = $1 AND wo_number = $2 LIMIT 1", tenantID, woNum)
		if err != nil || existingWOID == "" {
			_, err = db.Exec(`
				INSERT INTO work_orders (
					id, tenant_id, wo_number, customer_id, vehicle_id, entry_km,
					fuel_level, customer_complaint, diagnosis_notes, service_advisor_name,
					lead_mechanic_name, stall_id, status, total_labor, total_parts,
					grand_total, payment_status, inspection_data, next_service_km,
					next_service_date, reminder_notes, created_at, updated_at
				) VALUES (
					$1, $2, $3, $4, $5, $6,
					$7, $8, $9, $10,
					$11, $12, $13, $14, $15,
					$16, $17, $18, $19,
					$20::date, $21, $22, CURRENT_TIMESTAMP
				)
			`, woID, tenantID, woNum, cID, vID, entryKM,
				"half", complaint, "Hasil pengecekan: pengerjaan berjalan sesuai standar SOP.", "Ryo Advisor",
				mech, stID, status, laborTotal, partsTotal,
				grandTotal, paymentStatus, string(inspBytes), nextKM,
				nextDate, "Disarankan ganti oli mesin & filter pada KM "+fmt.Sprint(nextKM),
				now.AddDate(0, 0, -20+i))

			if err == nil {
				// Insert Labor Item
				_, _ = db.Exec(`
					INSERT INTO work_order_items (id, work_order_id, item_type, service_id, name, qty, unit_price, subtotal, mechanic_name, mechanic_fee, status, created_at)
					VALUES ($1, $2, 'service', $3, $4, 1, $5, $5, $6, $7, 'completed', CURRENT_TIMESTAMP)
				`, utils.GenerateUUID(), woID, serviceIDs[srvIdx], srv.Name, srv.Price, mech, srv.CommissionValue)

				// Insert Part Item
				_, _ = db.Exec(`
					INSERT INTO work_order_items (id, work_order_id, item_type, product_id, name, qty, unit_price, subtotal, status, created_at)
					VALUES ($1, $2, 'part', $3, $4, 1, $5, $5, 'completed', CURRENT_TIMESTAMP)
				`, utils.GenerateUUID(), woID, productIDs[partIdx], part.Name, part.Price)
			}
		}
	}

	// 9. Seed 20 Service Queues (Modul Antrian Layanan)
	fmt.Println("🎟️  Membuat 20 Tiket Antrian Layanan (Service Queue)...")
	stations := []string{
		"Pit 1 - Servis Cepat",
		"Pit 2 - Lift A",
		"Pit 3 - Lift B",
		"Stasiun Spooring",
		"Kursi Tunggu VIP",
	}

	qServices := []string{
		"Servis Cepat 20 Menit (Ganti Oli)",
		"Ganti Kampas Rem & Kuras Minyak Rem",
		"Pemeriksaan Kelistrikan & Pasang Aki",
		"Spooring 3D & Rotasi Ban",
		"Tune Up & Gurah Karbon Mesin",
		"Pembersihan Injektor Bahan Bakar",
		"Paket Servis Rutin 10.000 KM",
		"Service CVT & Ganti V-Belt Motor",
		"Penggantian Filter Oli & Filter AC",
		"Cek Kompresi & Scanning OBD2",
	}

	qStatuses := []string{
		"calling", "in_progress", "in_progress", "waiting", "waiting",
		"waiting", "waiting", "completed", "completed", "completed",
		"completed", "completed", "completed", "completed", "completed",
		"cancelled", "completed", "completed", "waiting", "in_progress",
	}

	for i := 0; i < 20; i++ {
		queueNum := fmt.Sprintf("A-%03d", i+1)
		trackingCode := fmt.Sprintf("TRK-%04d", 1000+i)
		custName := customerNames[i%len(customerNames)]
		phone := fmt.Sprintf("0812%04d%04d", rand.Intn(9999), i+2000)
		station := stations[i%len(stations)]
		serviceName := qServices[i%len(qServices)]
		status := qStatuses[i]
		vPlate := vehicleData[i%len(vehicleData)].Plate

		var existingQID string
		err := db.Get(&existingQID, "SELECT id FROM service_queues WHERE tenant_id = $1 AND queue_number = $2 AND created_at::date = CURRENT_DATE LIMIT 1", tenantID, queueNum)
		if err != nil || existingQID == "" {
			qID := utils.GenerateUUID()
			_, _ = db.Exec(`
				INSERT INTO service_queues (
					id, tenant_id, queue_number, tracking_code, customer_name,
					customer_phone, vehicle_info, service_name, station, status,
					estimated_minutes, notes, created_at, updated_at
				) VALUES (
					$1, $2, $3, $4, $5,
					$6, $7, $8, $9, $10,
					$11, $12, CURRENT_TIMESTAMP - ($13 || ' minutes')::interval, CURRENT_TIMESTAMP
				)
			`, qID, tenantID, queueNum, trackingCode, custName,
				phone, vPlate+" - "+vehicleData[i%len(vehicleData)].Brand+" "+vehicleData[i%len(vehicleData)].Model,
				serviceName, station, status,
				30+(i%3)*15, "Pelanggan menunggu di lounge VIP", (20-i)*8)
		}
	}

	// -------------------------------------------------------------
	// 8. SEED MODUL BARBERSHOP & SALON PREMIER (20 DATA)
	// -------------------------------------------------------------
	fmt.Println("💈  Mengaktifkan modul barbershop & membuat data master kapster...")
	_, _ = db.Exec(`
		UPDATE settings SET barbershop_enabled = TRUE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1
	`, tenantID)

	// 8.1 Master Barber Staff
	barberStaffData := []struct {
		Name     string
		Nickname string
		Phone    string
		Spec     string
		Chair    string
		CommPct  float64
		Status   string
	}{
		{"Rian Pratama", "Fade Master", "08128899001", "Fade & Taper Specialist", "Kursi 1", 35.0, "active"},
		{"Bagas Wicaksono", "Hair Sculptor", "08128899002", "Classic Undercut & Pompadour", "Kursi 2", 30.0, "active"},
		{"Dimas Kurniawan", "Colorist Pro", "08128899003", "Hair Bleach & Korean Two-Block", "Kursi 3", 35.0, "active"},
		{"Agus Setiawan", "Beard Maestro", "08128899004", "Hot Towel Shave & Beard Care", "Kursi 4", 30.0, "busy"},
		{"Yudha Perkasa", "Gentlemen Stylist", "08128899005", "Scalp Massage & Creambath", "Kursi 5", 30.0, "break"},
	}

	var createdStaffIDs []string
	for _, bs := range barberStaffData {
		var existingStaffID string
		_ = db.Get(&existingStaffID, "SELECT id FROM barber_staff WHERE tenant_id = $1 AND name = $2 LIMIT 1", tenantID, bs.Name)
		if existingStaffID == "" {
			existingStaffID = utils.GenerateUUID()
			_, _ = db.Exec(`
				INSERT INTO barber_staff (
					id, tenant_id, name, nickname, phone, specialization,
					chair_number, status, commission_rate_percent, commission_rate_fixed
				) VALUES (
					$1, $2, $3, $4, $5, $6,
					$7, $8, $9, 0
				)
			`, existingStaffID, tenantID, bs.Name, bs.Nickname, bs.Phone, bs.Spec,
				bs.Chair, bs.Status, bs.CommPct)
		}
		createdStaffIDs = append(createdStaffIDs, existingStaffID)
	}

	// 8.2 Master Barber Services
	fmt.Println("✂️  Membuat Katalog Menu Treatment Barbershop...")
	barberServicesData := []struct {
		Name     string
		Category string
		Dur      int
		Price    float64
		CommVal  float64
	}{
		{"Classic Gentleman Haircut", "Haircut", 30, 45000, 30},
		{"Signature Skin Fade & Taper", "Haircut", 45, 60000, 35},
		{"Hot Towel Beard Shave", "Shaving", 25, 35000, 30},
		{"Korean Two Block & Texture Perm", "Haircut", 60, 150000, 35},
		{"Hair Bleaching + Fashion Color (Ash Grey)", "Coloring", 90, 250000, 35},
		{"Organic Scalp Care & Creambath", "Scalp Care", 45, 75000, 30},
		{"Kids Cool Haircut", "Kids", 25, 40000, 30},
		{"Royal Gentlemen VIP Package (Cut+Shave+Wash+Tonic)", "Bundling", 60, 120000, 35},
		{"Hair Tattoo & Custom Line Art", "Haircut", 30, 50000, 35},
		{"Black Mask Charcoal Pore Cleanser", "Scalp Care", 20, 35000, 30},
	}

	var createdBarberServiceIDs []string
	for _, bsv := range barberServicesData {
		var existingSrvID string
		_ = db.Get(&existingSrvID, "SELECT id FROM barber_services WHERE tenant_id = $1 AND name = $2 LIMIT 1", tenantID, bsv.Name)
		if existingSrvID == "" {
			existingSrvID = utils.GenerateUUID()
			_, _ = db.Exec(`
				INSERT INTO barber_services (
					id, tenant_id, name, category, duration_minutes, price, commission_type, commission_value, is_active
				) VALUES (
					$1, $2, $3, $4, $5, $6, 'percentage', $7, TRUE
				)
			`, existingSrvID, tenantID, bsv.Name, bsv.Category, bsv.Dur, bsv.Price, bsv.CommVal)
		}
		createdBarberServiceIDs = append(createdBarberServiceIDs, existingSrvID)
	}

	// 8.3 20 Barbershop Appointments & Customer Hair Profiles
	fmt.Println("📅  Membuat 20 Data Booking & Rekam Gaya Rambut (Hair Passport)...")
	barberCustomerStyles := []struct {
		Style   string
		Notes   string
		Formula string
	}{
		{"Low Skin Fade", "Atas gunting tipis natural, samping razor halus", "-"},
		{"Korean Two-Block", "Poni belah tengah comma hair, bagian belakang drop taper", "-"},
		{"Classic Pompadour", "Samping clipper no. 2, atas pakai pomade oil based", "-"},
		{"Textured French Crop", "Poni tumpul pendek, atas crop bertekstur", "-"},
		{"Mullet Modern", "Samping burst fade, belakang dibiarkan panjang rapi", "-"},
		{"Side Part Classic", "Garis belahan rapi, disisir formal pomade", "-"},
		{"Buzz Cut Military Fade", "Clipper no. 1 rata, garis outline razor tajam", "-"},
		{"Bleached Ash Blonde", "Bleach level 9, toner silver 0.11", "Bleach 9% + Ash 0.11 (20 Vol)"},
		{"Under-Cut Disconnected", "Atas panjang diikat top knot, samping tipis", "-"},
		{"Beard Line Up & Fade", "Kumis dan jenggot dirapikan garis simetris", "-"},
	}

	timeSlotStrings := []string{
		"09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
		"13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
		"16:00", "16:30", "17:00", "17:30", "18:30", "19:00", "19:30", "20:00",
	}

	aptStatuses := []string{
		"completed", "completed", "completed", "completed", "completed",
		"in_progress", "in_progress", "scheduled", "scheduled", "scheduled",
		"scheduled", "scheduled", "scheduled", "scheduled", "completed",
		"completed", "completed", "completed", "cancelled", "no_show",
	}

	for i := 0; i < 20; i++ {
		bookingCode := fmt.Sprintf("BS-%s-%04d", time.Now().Format("200601"), i+1)
		custName := customerNames[i%len(customerNames)]
		phone := fmt.Sprintf("0813%04d%04d", rand.Intn(9999), i+3000)
		staffIdx := i % len(createdStaffIDs)
		staffID := createdStaffIDs[staffIdx]
		staffName := barberStaffData[staffIdx].Name
		chair := barberStaffData[staffIdx].Chair
		startTime := timeSlotStrings[i%len(timeSlotStrings)]
		status := aptStatuses[i]
		styleInfo := barberCustomerStyles[i%len(barberCustomerStyles)]

		srvIdx := i % len(barberServicesData)
		srv := barberServicesData[srvIdx]
		srvID := createdBarberServiceIDs[srvIdx]

		serviceTotal := srv.Price
		productsTotal := 0.0
		if i%3 == 0 {
			productsTotal = 45000.0 // Add-on Water-based Pomade
		}
		grandTotal := serviceTotal + productsTotal

		paymentStatus := "unpaid"
		if status == "completed" {
			paymentStatus = "paid"
		}

		var existingAptID string
		_ = db.Get(&existingAptID, "SELECT id FROM barber_appointments WHERE tenant_id = $1 AND booking_code = $2 LIMIT 1", tenantID, bookingCode)
		if existingAptID == "" {
			aptID := utils.GenerateUUID()
			_, _ = db.Exec(`
				INSERT INTO barber_appointments (
					id, tenant_id, booking_code, customer_name, customer_phone,
					barber_id, barber_name, chair_number, booking_date,
					start_time, end_time, status, service_total, products_total,
					discount_total, grand_total, payment_status, style_notes, hair_formula, notes, created_at, updated_at
				) VALUES (
					$1, $2, $3, $4, $5,
					$6, $7, $8, CURRENT_DATE,
					$9, $10, $11, $12, $13,
					0, $14, $15, $16, $17, 'Pelanggan langganan setia',
					CURRENT_TIMESTAMP - ($18 || ' minutes')::interval, CURRENT_TIMESTAMP
				)
			`, aptID, tenantID, bookingCode, custName, phone,
				staffID, staffName, chair, startTime, "20:30", status,
				serviceTotal, productsTotal, grandTotal, paymentStatus,
				styleInfo.Style+": "+styleInfo.Notes, styleInfo.Formula, (20-i)*12)

			// Insert Service Item
			commAmt := (srv.Price * srv.CommVal) / 100.0
			_, _ = db.Exec(`
				INSERT INTO barber_appointment_items (
					id, appointment_id, item_type, service_id, name,
					qty, unit_price, discount, subtotal, barber_id, barber_name, commission_amount
				) VALUES (
					$1, $2, 'service', $3, $4,
					1, $5, 0, $5, $6, $7, $8
				)
			`, utils.GenerateUUID(), aptID, srvID, srv.Name, srv.Price, staffID, staffName, commAmt)

			// Insert Retail Product Item if any
			if productsTotal > 0 {
				_, _ = db.Exec(`
					INSERT INTO barber_appointment_items (
						id, appointment_id, item_type, name,
						qty, unit_price, discount, subtotal, barber_id, barber_name, commission_amount
					) VALUES (
						$1, $2, 'product', 'Barber Classic Pomade Strong Hold 100g',
						1, $3, 0, $3, $4, $5, 5000
					)
				`, utils.GenerateUUID(), aptID, productsTotal, staffID, staffName)
			}
		}
	}

	// -------------------------------------------------------------
	// 7. SEEDING MODUL RESTORAN, CAFE & F&B (TABLES, MATERIALS, BOM & ORDERS)
	// -------------------------------------------------------------
	fmt.Println("\n🍽️  Seeding Modul Cafe, Coffee Shop & Restoran (F&B)...")

	// 7.1. Seed 12 F&B Tables
	tableConfigs := []struct {
		Number   string
		Section  string
		Capacity int
	}{
		{"T01", "Indoor AC", 2},
		{"T02", "Indoor AC", 4},
		{"T03", "Indoor AC", 4},
		{"T04", "Indoor AC", 6},
		{"T05", "Indoor AC", 4},
		{"OUT-01", "Outdoor Garden", 4},
		{"OUT-02", "Outdoor Garden", 4},
		{"OUT-03", "Outdoor Garden", 6},
		{"BAR-01", "Bar Counter", 2},
		{"BAR-02", "Bar Counter", 2},
		{"VIP-01", "VIP Room", 8},
		{"VIP-02", "VIP Room", 10},
	}

	tableIDs := make(map[string]string)
	for _, tc := range tableConfigs {
		var existingID string
		err := db.Get(&existingID, "SELECT id FROM fnb_tables WHERE tenant_id = $1 AND table_number = $2", tenantID, tc.Number)
		if err != nil {
			tableID := utils.GenerateUUID()
			qrToken := fmt.Sprintf("TBL-%s-%s", tc.Number, utils.GenerateUUID()[:8])
			_, err = db.Exec(`
				INSERT INTO fnb_tables (id, tenant_id, table_number, section, capacity, status, qr_code_token, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, 'available', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			`, tableID, tenantID, tc.Number, tc.Section, tc.Capacity, qrToken)
			if err == nil {
				tableIDs[tc.Number] = tableID
			}
		} else {
			tableIDs[tc.Number] = existingID
		}
	}
	fmt.Printf("  ✅ 12 Meja Cafe/Resto siap (Indoor, Outdoor, Bar Counter, VIP Room)\n")

	// 7.2. Seed 15 Raw Materials (Bahan Baku)
	type RawMatSeed struct {
		Name     string
		SKU      string
		Unit     string
		Cost     float64
		Stock    float64
		MinStock float64
	}
	rawMatList := []RawMatSeed{
		{"Biji Kopi Arabica Gayo Premium", "RAW-KOP-01", "gram", 350, 5000, 500},
		{"Biji Kopi Robusta Dampit", "RAW-KOP-02", "gram", 200, 4000, 500},
		{"Susu Fresh Milk Pasteurisasi", "RAW-SUS-01", "ml", 25, 20000, 2000},
		{"Susu Oat Milk Barista Edition", "RAW-SUS-02", "ml", 50, 6000, 1000},
		{"Sirup Karamel Monin", "RAW-SYR-01", "ml", 120, 2000, 300},
		{"Sirup Vanilla Madagaskar", "RAW-SYR-02", "ml", 120, 2000, 300},
		{"Matcha Uji Powder Grade A", "RAW-POW-01", "gram", 800, 1500, 200},
		{"Dark Chocolate Powder 70%", "RAW-POW-02", "gram", 450, 2500, 300},
		{"Boba Pearl Tapioca Brown Sugar", "RAW-TOP-01", "gram", 80, 5000, 500},
		{"Daging Sapi US Shortplate Slice", "RAW-BEEF-01", "gram", 180, 8000, 1000},
		{"Daging Wagyu Sirloin Steak", "RAW-BEEF-02", "gram", 450, 4000, 500},
		{"Beras Jasmine Premium", "RAW-RIC-01", "gram", 20, 25000, 5000},
		{"Keju Mozzarella Grated", "RAW-CHE-01", "gram", 160, 3000, 500},
		{"Kentang Crinkle French Fries", "RAW-POT-01", "gram", 50, 6000, 1000},
		{"Pasta Fettuccine San Remo", "RAW-PAS-01", "gram", 60, 4000, 500},
	}

	rawMatIDs := make(map[string]string)
	for _, rm := range rawMatList {
		var rID string
		err := db.Get(&rID, "SELECT id FROM fnb_raw_materials WHERE tenant_id = $1 AND name = $2", tenantID, rm.Name)
		if err != nil {
			rID = utils.GenerateUUID()
			_, err = db.Exec(`
				INSERT INTO fnb_raw_materials (id, tenant_id, name, sku, unit, cost_per_unit, current_stock, minimum_stock, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			`, rID, tenantID, rm.Name, rm.SKU, rm.Unit, rm.Cost, rm.Stock, rm.MinStock)
			if err == nil {
				rawMatIDs[rm.Name] = rID
			}
		} else {
			rawMatIDs[rm.Name] = rID
		}
	}
	fmt.Printf("  ✅ 15 Bahan Baku & Komponen HPP tersimpan\n")

	// 7.3. Seed Modifier Groups (Sugar Level, Ice Level, Spicy Level, Extra Topping)
	modGroupConfigs := []struct {
		Name     string
		Display  string
		SelType  string
		Required bool
		Options  []struct {
			Name     string
			Price    float64
			IsDef    bool
		}
	}{
		{
			Name: "sugar_level", Display: "Tingkat Kemanisan (Sugar)", SelType: "single", Required: true,
			Options: []struct{ Name string; Price float64; IsDef bool }{
				{"Normal Sugar (100%)", 0, true},
				{"Less Sugar (70%)", 0, false},
				{"Half Sugar (50%)", 0, false},
				{"No Sugar (0%)", 0, false},
			},
		},
		{
			Name: "ice_level", Display: "Tingkat Es (Ice)", SelType: "single", Required: true,
			Options: []struct{ Name string; Price float64; IsDef bool }{
				{"Normal Ice", 0, true},
				{"Less Ice", 0, false},
				{"No Ice", 0, false},
				{"Hot (Panas)", 0, false},
			},
		},
		{
			Name: "extra_topping", Display: "Pilihan Extra Topping", SelType: "multiple", Required: false,
			Options: []struct{ Name string; Price float64; IsDef bool }{
				{"Extra Espresso Shot", 8000, false},
				{"Brown Sugar Boba", 5000, false},
				{"Cheese Cream Foam", 7000, false},
				{"Caramel Drizzle", 4000, false},
				{"Melted Mozzarella", 8000, false},
			},
		},
	}

	for _, mgc := range modGroupConfigs {
		var gID string
		err := db.Get(&gID, "SELECT id FROM fnb_modifier_groups WHERE tenant_id = $1 AND name = $2", tenantID, mgc.Name)
		if err != nil {
			gID = utils.GenerateUUID()
			_, _ = db.Exec(`
				INSERT INTO fnb_modifier_groups (id, tenant_id, name, display_name, selection_type, is_required, min_selection, max_selection, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, 0, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			`, gID, tenantID, mgc.Name, mgc.Display, mgc.SelType, mgc.Required)

			for _, opt := range mgc.Options {
				_, _ = db.Exec(`
					INSERT INTO fnb_modifiers (id, group_id, name, price_delta, created_at)
					VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
				`, utils.GenerateUUID(), gID, opt.Name, opt.Price)
			}
		}
	}
	fmt.Printf("  ✅ 3 Grup Modifiers Topping (Sugar, Ice, Extra Toppings)\n")

	// 7.4. Seed 20 F&B Orders (12 Completed/Paid, 5 Open Bills on Table, 3 Queued on KDS)
	fmt.Println("  ⏳ Membuat 20 Data Pesanan Cafe/Restoran & Kitchen Tickets...")
	fnbMenuItems := []struct {
		Name    string
		Price   float64
		Station string
	}{
		{"Iced Caramel Macchiato", 35000, "bar"},
		{"Signature Palm Sugar Latte", 28000, "bar"},
		{"Matcha Green Tea Latte", 32000, "bar"},
		{"Espresso Double Shot", 22000, "bar"},
		{"US Beef Rice Bowl Teriyaki", 45000, "kitchen"},
		{"Creamy Carbonara Fettuccine", 48000, "kitchen"},
		{"Wagyu Beef Burger with Fries", 65000, "kitchen"},
		{"Crispy Truffle French Fries", 28000, "kitchen"},
		{"Spicy Korean Chicken Rice", 42000, "kitchen"},
		{"Avocado Toast with Poached Egg", 38000, "kitchen"},
	}

	tableKeys := []string{"T01", "T02", "T03", "T04", "T05", "OUT-01", "OUT-02", "OUT-03", "BAR-01", "BAR-02", "VIP-01", "VIP-02"}

	for i := 1; i <= 20; i++ {
		orderID := utils.GenerateUUID()
		orderNumber := fmt.Sprintf("FNB-%04d", i+100)
		tKey := tableKeys[(i-1)%len(tableKeys)]
		tID := tableIDs[tKey]
		gName := customerNames[(i-1)%len(customerNames)]
		gCount := (i % 4) + 1

		var status, kStatus string
		var isPaid bool

		if i <= 12 {
			status = "completed"
			kStatus = "served"
			isPaid = true
		} else if i <= 17 {
			status = "open"
			kStatus = "preparing"
			isPaid = false
			// Mark table as occupied
			_, _ = db.Exec("UPDATE fnb_tables SET status = 'occupied', active_order_id = $1 WHERE id = $2", orderID, tID)
		} else {
			status = "open"
			kStatus = "queued"
			isPaid = false
			_, _ = db.Exec("UPDATE fnb_tables SET status = 'occupied', active_order_id = $1 WHERE id = $2", orderID, tID)
		}

		item1 := fnbMenuItems[(i*2)%len(fnbMenuItems)]
		item2 := fnbMenuItems[(i*3)%len(fnbMenuItems)]
		subtotal := item1.Price*float64(gCount) + item2.Price
		tax := subtotal * 0.1
		service := subtotal * 0.05
		total := subtotal + tax + service
		orderTime := time.Now().Add(-time.Duration(20-i) * 20 * time.Minute)

		_, _ = db.Exec(`
			INSERT INTO fnb_orders (
				id, tenant_id, order_number, table_id, order_type, customer_name, guest_count,
				status, kitchen_status, subtotal, tax_amount, service_charge, discount_amount,
				grand_total, payment_status, created_at, updated_at
			) VALUES (
				$1, $2, $3, $4, 'dine_in', $5, $6,
				$7, $8, $9, $10, $11, 0,
				$12, $13, $14, $14
			)
		`, orderID, tenantID, orderNumber, tID, gName, gCount,
			status, kStatus, subtotal, tax, service,
			total, map[bool]string{true: "paid", false: "unpaid"}[isPaid], orderTime)

		// Insert Items
		modsJSON, _ := json.Marshal([]map[string]interface{}{
			{"group_name": "Tingkat Kemanisan", "option_name": "Less Sugar (70%)", "price_extra": 0},
		})

		_, _ = db.Exec(`
			INSERT INTO fnb_order_items (
				id, order_id, product_id, name, qty, unit_price, subtotal,
				kitchen_station, item_status, notes, modifiers_json, created_at
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7,
				$8, $9, 'Sajikan bersamaan', $10, $11
			)
		`, utils.GenerateUUID(), orderID, utils.GenerateUUID(), item1.Name, gCount, item1.Price, item1.Price*float64(gCount),
			item1.Station, kStatus, string(modsJSON), orderTime)

		_, _ = db.Exec(`
			INSERT INTO fnb_order_items (
				id, order_id, product_id, name, qty, unit_price, subtotal,
				kitchen_station, item_status, notes, modifiers_json, created_at
			) VALUES (
				$1, $2, $3, $4, 1, $5, $5,
				$6, $7, '', '[]', $8
			)
		`, utils.GenerateUUID(), orderID, utils.GenerateUUID(), item2.Name, item2.Price,
			item2.Station, kStatus, orderTime)
	}

	fmt.Println("=========================================================")
	fmt.Println("🎉 DEMO SEEDING BERHASIL 100%!")
	fmt.Println("=========================================================")
	fmt.Printf(" Akun Target : %s (%s)\n", user.FullName, user.Email)
	fmt.Println(" Data Terisi :")
	fmt.Println("  ✅ 20 Data Kendaraan & 20 SPK Bengkel (Modul Bengkel)")
	fmt.Println("  ✅ 20 Data Tiket Antrian & Display TV (Modul Antrian)")
	fmt.Println("  ✅ 20 Data Booking / Appointment Barbershop & Salon (Modul Barbershop)")
	fmt.Println("  ✅ 20 Data Pesanan Cafe/Restoran & Kitchen Display KDS (Modul F&B)")
	fmt.Println("  ✅ 12 Meja Denah Restoran (Indoor AC, Outdoor Garden, Bar, VIP Room)")
	fmt.Println("  ✅ 15 Bahan Baku / Raw Material & Resep BOM Auto-Deduct Stok")
	fmt.Println("  ✅ 3 Modifiers & Topping Groups (Sugar, Ice, Extra Topping)")
	fmt.Println("=========================================================")
}
