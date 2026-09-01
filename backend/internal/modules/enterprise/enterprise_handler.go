package enterprise

import (
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type EnterpriseHandler struct{}

func NewEnterpriseHandler() *EnterpriseHandler {
	return &EnterpriseHandler{}
}

func (h *EnterpriseHandler) RegisterRoutes(r *gin.RouterGroup) {
	// Purchases / Purchase Orders
	po := r.Group("/purchases", middleware.AuthenticateToken(), middleware.RequireRole("admin", "manager"))
	{
		po.GET("", h.GetPurchases)
		po.POST("", h.CreatePurchase)
		po.PUT("/:id/status", h.UpdatePurchaseStatus)
	}

	// Payroll & Attendance
	pay := r.Group("/payroll", middleware.AuthenticateToken())
	{
		pay.GET("/attendance", h.GetAttendances)
		pay.POST("/attendance/clock", h.ClockAttendance)
		pay.PUT("/attendance/:id/clock-out", h.DirectClockOut)
		pay.DELETE("/attendance/:id", middleware.RequireRole("admin", "manager"), h.DeleteAttendance)
		pay.POST("/attendance/reset", middleware.RequireRole("admin"), h.ResetAttendance)
		pay.GET("", h.GetPayrolls)
		pay.POST("", middleware.RequireRole("admin", "manager"), h.CreatePayroll)
		pay.PUT("/:id/pay", middleware.RequireRole("admin", "manager"), h.PayPayroll)
	}

	// Company Assets
	assets := r.Group("/assets", middleware.AuthenticateToken(), middleware.RequireRole("admin", "manager"))
	{
		assets.GET("", h.GetAssets)
		assets.POST("", h.CreateAsset)
		assets.DELETE("/:id", h.DeleteAsset)
	}
}

// -------------------------------------------------------------
// PURCHASE ORDERS
// -------------------------------------------------------------

type PurchaseOrderRow struct {
	ID            string              `json:"id" db:"id"`
	UserID        string              `json:"user_id" db:"user_id"`
	PONumber      string              `json:"po_number" db:"po_number"`
	SupplierID    *string             `json:"supplier_id" db:"supplier_id"`
	SupplierName  string              `json:"supplier_name" db:"supplier_name"`
	Status        string              `json:"status" db:"status"`
	PaymentStatus string              `json:"payment_status" db:"payment_status"`
	TotalAmount   float64             `json:"total_amount" db:"total_amount"`
	PaidAmount    float64             `json:"paid_amount" db:"paid_amount"`
	DueDate       *string             `json:"due_date" db:"due_date"`
	Notes         *string             `json:"notes" db:"notes"`
	CreatedBy     string              `json:"created_by" db:"created_by"`
	CreatedAt     time.Time           `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at" db:"updated_at"`
	Items         []PurchaseOrderItem `json:"items,omitempty"`
}

type PurchaseOrderItem struct {
	ID          string  `json:"id" db:"id"`
	POID        string  `json:"po_id" db:"po_id"`
	ProductID   string  `json:"product_id" db:"product_id"`
	ProductName string  `json:"product_name" db:"product_name"`
	QtyOrdered  int     `json:"qty_ordered" db:"qty_ordered"`
	QtyReceived int     `json:"qty_received" db:"qty_received"`
	UnitCost    float64 `json:"unit_cost" db:"unit_cost"`
	Total       float64 `json:"total" db:"total"`
}

func (h *EnterpriseHandler) GetPurchases(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var list []PurchaseOrderRow
	err := database.DB.Select(&list, "SELECT * FROM purchase_orders WHERE user_id = $1 ORDER BY created_at DESC", tenantID)
	if err != nil {
		c.JSON(http.StatusOK, []PurchaseOrderRow{})
		return
	}
	if list == nil {
		list = []PurchaseOrderRow{}
	}

	for i := range list {
		var items []PurchaseOrderItem
		_ = database.DB.Select(&items, "SELECT * FROM purchase_order_items WHERE po_id = $1", list[i].ID)
		if items == nil {
			items = []PurchaseOrderItem{}
		}
		list[i].Items = items
	}

	c.JSON(http.StatusOK, list)
}

func (h *EnterpriseHandler) CreatePurchase(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	var req struct {
		SupplierID   string `json:"supplier_id"`
		SupplierName string `json:"supplier_name"`
		DueDate      string `json:"due_date"`
		Notes        string `json:"notes"`
		Items        []struct {
			ProductID   string  `json:"product_id"`
			ProductName string  `json:"product_name"`
			QtyOrdered  int     `json:"qty_ordered"`
			UnitCost    float64 `json:"unit_cost"`
		} `json:"items"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || len(req.Items) == 0 {
		utils.RespondValidationError(c, "Item pembelian wajib diisi")
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	poID := utils.GenerateUUID()
	dateStr := time.Now().Format("20060102")
	randomNum := rand.Intn(9000) + 1000
	poNumber := fmt.Sprintf("PO-%s-%04d", dateStr, randomNum)

	var totalAmount float64
	for _, it := range req.Items {
		totalAmount += it.UnitCost * float64(it.QtyOrdered)
	}

	suppName := req.SupplierName
	if suppName == "" {
		suppName = "Supplier Umum"
	}

	_, err = tx.Exec(`
		INSERT INTO purchase_orders (
			id, user_id, po_number, supplier_id, supplier_name, status, payment_status,
			total_amount, paid_amount, due_date, notes, created_by
		) VALUES (
			$1, $2, $3, NULLIF($4, ''), $5, 'draft', 'unpaid',
			$6, 0, NULLIF($7, '')::date, $8, $9
		)
	`, poID, tenantID, poNumber, req.SupplierID, suppName, totalAmount, req.DueDate, req.Notes, user.Email)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	for _, it := range req.Items {
		itemTotal := it.UnitCost * float64(it.QtyOrdered)
		_, _ = tx.Exec(`
			INSERT INTO purchase_order_items (id, po_id, product_id, product_name, qty_ordered, qty_received, unit_cost, total)
			VALUES ($1, $2, $3, $4, $5, 0, $6, $7)
		`, utils.GenerateUUID(), poID, it.ProductID, it.ProductName, it.QtyOrdered, it.UnitCost, itemTotal)
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           poID,
		"po_number":    poNumber,
		"total_amount": totalAmount,
	})
}

func (h *EnterpriseHandler) UpdatePurchaseStatus(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)
	poID := c.Param("id")

	var req struct {
		Status        string   `json:"status"`
		PaymentStatus string   `json:"payment_status"`
		PaidAmount    *float64 `json:"paid_amount"`
	}
	_ = c.ShouldBindJSON(&req)

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	var po PurchaseOrderRow
	err = tx.Get(&po, "SELECT * FROM purchase_orders WHERE id = $1 AND user_id = $2 FOR UPDATE", poID, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Purchase order tidak ditemukan")
		return
	}

	// When status changes to 'received', add stock to products
	if req.Status == "received" && po.Status != "received" {
		var items []PurchaseOrderItem
		_ = tx.Select(&items, "SELECT * FROM purchase_order_items WHERE po_id = $1", poID)

		for _, item := range items {
			var stockBefore int
			err := tx.Get(&stockBefore, "SELECT stock FROM products WHERE id = $1", item.ProductID)
			if err == nil {
				stockAfter := stockBefore + item.QtyOrdered
				_, _ = tx.Exec("UPDATE products SET stock = stock + $1 WHERE id = $2", item.QtyOrdered, item.ProductID)
				_, _ = tx.Exec(`
					INSERT INTO stock_movements (id, user_id, product_id, type, quantity, stock_before, stock_after, reference_type, reference_id, notes, created_by)
					VALUES ($1, $2, $3, 'in', $4, $5, $6, 'purchase_order', $7, $8, $9)
				`, utils.GenerateUUID(), tenantID, item.ProductID, item.QtyOrdered, stockBefore, stockAfter, poID, fmt.Sprintf("Penerimaan Pembelian (%s): +%d", po.PONumber, item.QtyOrdered), user.ID)
				_, _ = tx.Exec("UPDATE purchase_order_items SET qty_received = $1 WHERE id = $2", item.QtyOrdered, item.ID)
			}
		}
	}

	newStatus := po.Status
	if req.Status != "" {
		newStatus = req.Status
	}
	newPayStatus := po.PaymentStatus
	if req.PaymentStatus != "" {
		newPayStatus = req.PaymentStatus
	}
	newPaidAmount := po.PaidAmount
	if req.PaidAmount != nil {
		newPaidAmount = *req.PaidAmount
	}

	_, err = tx.Exec(`
		UPDATE purchase_orders
		SET status = $1, payment_status = $2, paid_amount = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4 AND user_id = $5
	`, newStatus, newPayStatus, newPaidAmount, poID, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Status pembelian diperbarui", gin.H{"success": true})
}

// -------------------------------------------------------------
// ATTENDANCE & PAYROLL
// -------------------------------------------------------------

type AttendanceRow struct {
	ID           string   `json:"id" db:"id"`
	UserID       string   `json:"user_id" db:"user_id"`
	EmployeeName string   `json:"employee_name" db:"employee_name"`
	Date         string   `json:"date" db:"date"`
	ClockIn      string   `json:"clock_in" db:"clock_in"`
	ClockOut     *string  `json:"clock_out" db:"clock_out"`
	Status       string   `json:"status" db:"status"`
	Notes        *string  `json:"notes" db:"notes"`
	CreatedAt    string   `json:"created_at" db:"created_at"`
}

func ensureAttendanceTable() {
	if database.DB == nil {
		return
	}
	_, _ = database.DB.Exec(`
		CREATE TABLE IF NOT EXISTS employee_attendances (
			id VARCHAR(36) PRIMARY KEY,
			user_id VARCHAR(36) NOT NULL,
			employee_name VARCHAR(255) NOT NULL,
			date DATE NOT NULL,
			clock_in TIMESTAMP,
			clock_out TIMESTAMP,
			status VARCHAR(50) DEFAULT 'present',
			notes TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		CREATE INDEX IF NOT EXISTS idx_emp_att_user ON employee_attendances(user_id);
		CREATE INDEX IF NOT EXISTS idx_emp_att_date ON employee_attendances(date);
	`)
}

func (h *EnterpriseHandler) GetAttendances(c *gin.Context) {
	ensureAttendanceTable()
	tenantID := c.GetString("tenantId")

	var list []AttendanceRow
	err := database.DB.Select(&list, `
		SELECT id, user_id, employee_name, 
		       TO_CHAR(date, 'YYYY-MM-DD') as date, 
		       TO_CHAR(clock_in, 'HH24:MI:SS') as clock_in, 
		       CASE WHEN clock_out IS NOT NULL THEN TO_CHAR(clock_out, 'HH24:MI:SS') ELSE NULL END as clock_out, 
		       status, notes, 
		       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at 
		FROM employee_attendances 
		WHERE user_id = $1 
		ORDER BY date DESC, created_at DESC
	`, tenantID)
	if err != nil {
		c.JSON(http.StatusOK, []AttendanceRow{})
		return
	}
	if list == nil {
		list = []AttendanceRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *EnterpriseHandler) ClockAttendance(c *gin.Context) {
	ensureAttendanceTable()
	tenantID := c.GetString("tenantId")

	var req struct {
		EmployeeName string `json:"employee_name"`
		Type         string `json:"type"` // "in" or "out"
		Notes        string `json:"notes"`
		ClientTime   string `json:"client_time"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Invalid data")
		return
	}

	name := strings.TrimSpace(req.EmployeeName)
	if name == "" {
		if userVal, ok := c.Get("user"); ok && userVal != nil {
			if authUser, ok := userVal.(middleware.AuthUser); ok {
				name = authUser.FullName
				if name == "" {
					name = authUser.Email
				}
			}
		}
	}
	if name == "" {
		name = "Staff"
	}

	wib := utils.NowWIB()
	today := wib.Format("2006-01-02")

	var existingID string
	_ = database.DB.Get(&existingID, "SELECT id FROM employee_attendances WHERE user_id = $1 AND employee_name = $2 AND date = $3::date", tenantID, name, today)

	if req.Type == "in" {
		if existingID != "" {
			utils.RespondError(c, http.StatusBadRequest, "Sudah melakukan Clock-In hari ini")
			return
		}
		id := utils.GenerateUUID()
		_, err := database.DB.Exec(`
			INSERT INTO employee_attendances (id, user_id, employee_name, date, clock_in, status, notes)
			VALUES ($1, $2, $3, $4::date, $5, 'present', $6)
		`, id, tenantID, name, today, wib, req.Notes)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, "Gagal mencatat Clock-In: "+err.Error())
			return
		}
	} else {
		// If existingID not found for today + name, find the latest record for this user without clock_out
		if existingID == "" {
			_ = database.DB.Get(&existingID, "SELECT id FROM employee_attendances WHERE user_id = $1 AND employee_name = $2 AND clock_out IS NULL ORDER BY created_at DESC LIMIT 1", tenantID, name)
		}
		if existingID == "" {
			_ = database.DB.Get(&existingID, "SELECT id FROM employee_attendances WHERE user_id = $1 AND clock_out IS NULL ORDER BY created_at DESC LIMIT 1", tenantID)
		}
		if existingID == "" {
			utils.RespondError(c, http.StatusBadRequest, "Belum ada catatan Clock-In yang aktif untuk Clock-Out")
			return
		}
		_, err := database.DB.Exec(`
			UPDATE employee_attendances
			SET clock_out = $1, notes = COALESCE(NULLIF($2, ''), notes)
			WHERE id = $3
		`, wib, req.Notes, existingID)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, "Gagal mencatat Clock-Out: "+err.Error())
			return
		}
	}

	utils.RespondSuccess(c, "Absensi berhasil dicatat", gin.H{"success": true})
}

func (h *EnterpriseHandler) DirectClockOut(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	attID := c.Param("id")

	wib := utils.NowWIB()
	res, err := database.DB.Exec(`
		UPDATE employee_attendances
		SET clock_out = $1
		WHERE id = $2 AND user_id = $3
	`, wib, attID, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		utils.RespondError(c, http.StatusNotFound, "Data absensi tidak ditemukan")
		return
	}

	utils.RespondSuccess(c, "Berhasil mencatat jam pulang", gin.H{"clock_out": wib.Format("15:04:05")})
}

func (h *EnterpriseHandler) DeleteAttendance(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	attID := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM employee_attendances WHERE id = $1 AND user_id = $2", attID, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Data absensi berhasil dihapus", nil)
}

func (h *EnterpriseHandler) ResetAttendance(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		All bool `json:"all"`
	}
	_ = c.ShouldBindJSON(&req)

	if req.All {
		_, err := database.DB.Exec("DELETE FROM employee_attendances WHERE user_id = $1", tenantID)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, err.Error())
			return
		}
		utils.RespondSuccess(c, "Semua riwayat absensi berhasil direset", nil)
		return
	}

	wib := utils.NowWIB()
	today := wib.Format("2006-01-02")
	_, err := database.DB.Exec("DELETE FROM employee_attendances WHERE user_id = $1 AND date = $2::date", tenantID, today)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Absensi hari ini berhasil direset. Silakan Clock-In kembali.", nil)
}

type PayrollRow struct {
	ID              string     `json:"id" db:"id"`
	UserID          string     `json:"user_id" db:"user_id"`
	EmployeeName    string     `json:"employee_name" db:"employee_name"`
	Period          string     `json:"period" db:"period"`
	BaseSalary      float64    `json:"base_salary" db:"base_salary"`
	BonusCommission float64    `json:"bonus_commission" db:"bonus_commission"`
	Deductions      float64    `json:"deductions" db:"deductions"`
	NetSalary       float64    `json:"net_salary" db:"net_salary"`
	Status          string     `json:"status" db:"status"`
	Notes           *string    `json:"notes" db:"notes"`
	PaidAt          *time.Time `json:"paid_at" db:"paid_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
}

func (h *EnterpriseHandler) GetPayrolls(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)
	tenantID := c.GetString("tenantId")

	var list []PayrollRow
	var err error
	if user.Role == "kasir" {
		err = database.DB.Select(&list, "SELECT * FROM employee_payrolls WHERE user_id = $1 AND LOWER(TRIM(employee_name)) = LOWER(TRIM($2)) ORDER BY created_at DESC", tenantID, user.FullName)
	} else {
		err = database.DB.Select(&list, "SELECT * FROM employee_payrolls WHERE user_id = $1 ORDER BY created_at DESC", tenantID)
	}

	if err != nil {
		c.JSON(http.StatusOK, []PayrollRow{})
		return
	}
	if list == nil {
		list = []PayrollRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *EnterpriseHandler) CreatePayroll(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		EmployeeName    string  `json:"employee_name"`
		Period          string  `json:"period"`
		BaseSalary      float64 `json:"base_salary"`
		BonusCommission float64 `json:"bonus_commission"`
		Deductions      float64 `json:"deductions"`
		Notes           string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.EmployeeName == "" || req.Period == "" {
		utils.RespondValidationError(c, "Nama pegawai dan periode wajib diisi")
		return
	}

	netSalary := req.BaseSalary + req.BonusCommission - req.Deductions
	id := utils.GenerateUUID()

	_, err := database.DB.Exec(`
		INSERT INTO employee_payrolls (id, user_id, employee_name, period, base_salary, bonus_commission, deductions, net_salary, status, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
	`, id, tenantID, req.EmployeeName, req.Period, req.BaseSalary, req.BonusCommission, req.Deductions, netSalary, req.Notes)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         id,
		"net_salary": netSalary,
	})
}

func (h *EnterpriseHandler) PayPayroll(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	_, err := database.DB.Exec("UPDATE employee_payrolls SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Gaji berhasil ditandai telah dibayar", gin.H{"success": true})
}

// -------------------------------------------------------------
// COMPANY ASSETS
// -------------------------------------------------------------

type AssetRow struct {
	ID              string    `json:"id" db:"id"`
	UserID          string    `json:"user_id" db:"user_id"`
	Code            string    `json:"code" db:"code"`
	Name            string    `json:"name" db:"name"`
	Category        string    `json:"category" db:"category"`
	PurchaseDate    string    `json:"purchase_date" db:"purchase_date"`
	PurchaseCost    float64   `json:"purchase_cost" db:"purchase_cost"`
	UsefulLifeYears int       `json:"useful_life_years" db:"useful_life_years"`
	SalvageValue    float64   `json:"salvage_value" db:"salvage_value"`
	Notes           *string   `json:"notes" db:"notes"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

func (h *EnterpriseHandler) GetAssets(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var list []AssetRow
	err := database.DB.Select(&list, "SELECT id, user_id, code, name, category, TO_CHAR(purchase_date, 'YYYY-MM-DD') as purchase_date, purchase_cost, useful_life_years, salvage_value, notes, created_at FROM company_assets WHERE user_id = $1 ORDER BY purchase_date DESC", tenantID)
	if err != nil {
		c.JSON(http.StatusOK, []AssetRow{})
		return
	}
	if list == nil {
		list = []AssetRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *EnterpriseHandler) CreateAsset(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Code            string      `json:"code"`
		Name            string      `json:"name"`
		Category        string      `json:"category"`
		PurchaseDate    string      `json:"purchase_date"`
		PurchaseCost    interface{} `json:"purchase_cost"`
		UsefulLifeYears interface{} `json:"useful_life_years"`
		SalvageValue    interface{} `json:"salvage_value"`
		Notes           string      `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Name) == "" {
		utils.RespondValidationError(c, "Nama aset dan harga perolehan wajib diisi")
		return
	}

	var purchaseCost float64
	switch v := req.PurchaseCost.(type) {
	case float64:
		purchaseCost = v
	case string:
		purchaseCost, _ = strconv.ParseFloat(strings.TrimSpace(v), 64)
	case int:
		purchaseCost = float64(v)
	}

	if purchaseCost <= 0 {
		utils.RespondValidationError(c, "Harga perolehan harus lebih dari 0")
		return
	}

	var usefulLifeYears int = 5
	switch v := req.UsefulLifeYears.(type) {
	case float64:
		if int(v) > 0 {
			usefulLifeYears = int(v)
		}
	case string:
		if n, err := strconv.Atoi(strings.TrimSpace(v)); err == nil && n > 0 {
			usefulLifeYears = n
		}
	case int:
		if v > 0 {
			usefulLifeYears = v
		}
	}

	var salvageValue float64
	switch v := req.SalvageValue.(type) {
	case float64:
		salvageValue = v
	case string:
		salvageValue, _ = strconv.ParseFloat(strings.TrimSpace(v), 64)
	case int:
		salvageValue = float64(v)
	}

	code := strings.TrimSpace(req.Code)
	if code == "" {
		code = fmt.Sprintf("AST-%d", rand.Intn(9000)+1000)
	}
	pDate := strings.TrimSpace(req.PurchaseDate)
	if pDate == "" {
		pDate = time.Now().Format("2006-01-02")
	}
	cat := strings.TrimSpace(req.Category)
	if cat == "" {
		cat = "Peralatan Toko"
	}

	id := utils.GenerateUUID()
	_, err := database.DB.Exec(`
		INSERT INTO company_assets (id, user_id, code, name, category, purchase_date, purchase_cost, useful_life_years, salvage_value, notes)
		VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10)
	`, id, tenantID, code, strings.TrimSpace(req.Name), cat, pDate, purchaseCost, usefulLifeYears, salvageValue, req.Notes)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":   id,
		"code": code,
		"name": req.Name,
	})
}

func (h *EnterpriseHandler) DeleteAsset(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM company_assets WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Aset berhasil dihapus", gin.H{"success": true})
}
