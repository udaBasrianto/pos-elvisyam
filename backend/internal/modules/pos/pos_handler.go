package pos

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type POSHandler struct{}

func NewPOSHandler() *POSHandler {
	return &POSHandler{}
}

func (h *POSHandler) RegisterRoutes(r *gin.RouterGroup) {
	// Transactions
	trans := r.Group("/transactions", middleware.AuthenticateToken())
	{
		trans.GET("", h.GetTransactions)
		trans.GET("/:id", h.GetTransactionByID)
		trans.POST("", h.CreateTransaction)
		trans.PUT("/:id", middleware.RequireRole("admin", "manager"), h.UpdateTransaction)
		trans.DELETE("/:id", middleware.RequireRole("admin"), h.DeleteTransaction)
		trans.POST("/:id/void", middleware.RequireRole("admin", "manager"), h.VoidTransaction)
	}

	// Shifts (Cash shifts / Kas Kasir)
	shifts := r.Group("/shifts", middleware.AuthenticateToken())
	{
		shifts.GET("", h.GetShifts)
		shifts.GET("/history", h.GetShifts)
		shifts.GET("/current", h.GetCurrentShift)
		shifts.GET("/:id", h.GetShiftByID)
		shifts.POST("/open", h.OpenShift)
		shifts.POST("/close", h.CloseShift)
	}
}

type TransactionItemReq struct {
	ProductID   string  `json:"product_id"`
	ProductID2  string  `json:"productId"`
	ProductName string  `json:"product_name"`
	ProductName2 string `json:"productName"`
	Quantity    int     `json:"quantity"`
	Price       float64 `json:"price"`
	CostPrice   float64 `json:"cost_price"`
	Subtotal    float64 `json:"subtotal"`
}

type TransactionItemResp struct {
	ID                      string     `json:"id" db:"id"`
	TransactionID           string     `json:"transaction_id" db:"transaction_id"`
	ProductID               *string    `json:"product_id" db:"product_id"`
	ProductName             string     `json:"product_name" db:"product_name"`
	Quantity                int        `json:"quantity" db:"quantity"`
	Price                   float64    `json:"price" db:"price"`
	UnitPrice               float64    `json:"unit_price" db:"unit_price"`
	CostPrice               float64    `json:"cost_price" db:"cost_price"`
	Subtotal                float64    `json:"subtotal" db:"subtotal"`
	ConsignmentSettlementID *string    `json:"consignment_settlement_id" db:"consignment_settlement_id"`
	CreatedAt               *time.Time `json:"created_at" db:"created_at"`
}

type TransactionResp struct {
	ID            string                `json:"id" db:"id"`
	UserID        string                `json:"user_id" db:"user_id"`
	ShiftID       *string               `json:"shift_id" db:"shift_id"`
	CustomerID    *string               `json:"customer_id" db:"customer_id"`
	CustomerName  *string               `json:"customer_name" db:"customer_name"`
	InvoiceNumber *string               `json:"invoice_number" db:"invoice_number"`
	Subtotal      float64               `json:"subtotal" db:"subtotal"`
	Tax           float64               `json:"tax" db:"tax"`
	TotalAmount   float64               `json:"total_amount" db:"total_amount"`
	Total         float64               `json:"total" db:"total"`
	Discount      float64               `json:"discount" db:"discount"`
	TaxAmount     float64               `json:"tax_amount" db:"tax_amount"`
	FinalAmount   float64               `json:"final_amount" db:"final_amount"`
	PaymentMethod string                `json:"payment_method" db:"payment_method"`
	PaymentAmount float64               `json:"payment_amount" db:"payment_amount"`
	AmountPaid    float64               `json:"amount_paid" db:"amount_paid"`
	ChangeAmount  float64               `json:"change_amount" db:"change_amount"`
	PromoCode     *string               `json:"promo_code" db:"promo_code"`
	PromoDiscount float64               `json:"promo_discount" db:"promo_discount"`
	CashierName   *string               `json:"cashier_name" db:"cashier_name"`
	Notes         *string               `json:"notes" db:"notes"`
	Status        string                `json:"status" db:"status"`
	CreatedAt     *time.Time            `json:"created_at" db:"created_at"`
	UpdatedAt     *time.Time            `json:"updated_at" db:"updated_at"`
	Items         []TransactionItemResp `json:"items"`
}

func (h *POSHandler) GetTransactions(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")
	limitStr := c.DefaultQuery("limit", "2000")
	limit, _ := strconv.Atoi(limitStr)
	if limitStr == "all" || limit <= 0 {
		limit = 50000
	}

	query := `
		SELECT id, user_id, shift_id, customer_id, customer_name, invoice_number,
		       COALESCE(subtotal, 0)::float8 as subtotal,
		       COALESCE(tax, 0)::float8 as tax,
		       COALESCE(total_amount, 0)::float8 as total_amount,
		       COALESCE(total, 0)::float8 as total,
		       COALESCE(discount, 0)::float8 as discount,
		       COALESCE(tax_amount, 0)::float8 as tax_amount,
		       COALESCE(final_amount, 0)::float8 as final_amount,
		       COALESCE(payment_method, 'cash') as payment_method,
		       COALESCE(payment_amount, 0)::float8 as payment_amount,
		       COALESCE(amount_paid, 0)::float8 as amount_paid,
		       COALESCE(change_amount, 0)::float8 as change_amount,
		       promo_code,
		       COALESCE(promo_discount, 0)::float8 as promo_discount,
		       cashier_name, notes,
		       COALESCE(status, 'completed') as status,
		       COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
		       COALESCE(updated_at, CURRENT_TIMESTAMP) as updated_at
		FROM transactions
		WHERE user_id = $1
	`
	args := []interface{}{tenantID}
	argIdx := 2

	if startDate != "" {
		query += fmt.Sprintf(" AND created_at >= $%d", argIdx)
		args = append(args, startDate)
		argIdx++
	}
	if endDate != "" {
		query += fmt.Sprintf(" AND created_at <= $%d", argIdx)
		args = append(args, endDate)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d", argIdx)
	args = append(args, limit)

	var list []TransactionResp
	err := database.DB.Select(&list, query, args...)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	if list == nil {
		list = []TransactionResp{}
	}

	// Fetch items for all transactions in a single batch query
	if len(list) > 0 {
		txIDs := make([]string, len(list))
		txMap := make(map[string]int, len(list))
		for i, t := range list {
			txIDs[i] = t.ID
			txMap[t.ID] = i
			list[i].Items = []TransactionItemResp{}
		}

		itemsQuery, itemArgs, err := sqlx.In(`
			SELECT id, transaction_id, product_id, product_name,
			       COALESCE(quantity, 1) as quantity,
			       COALESCE(price, 0)::float8 as price,
			       COALESCE(unit_price, price, 0)::float8 as unit_price,
			       COALESCE(cost_price, 0)::float8 as cost_price,
			       COALESCE(subtotal, 0)::float8 as subtotal,
			       consignment_settlement_id,
			       COALESCE(created_at, CURRENT_TIMESTAMP) as created_at
			FROM transaction_items
			WHERE transaction_id IN (?)
		`, txIDs)

		if err == nil {
			itemsQuery = database.DB.Rebind(itemsQuery)
			var allItems []TransactionItemResp
			if err := database.DB.Select(&allItems, itemsQuery, itemArgs...); err == nil {
				for _, item := range allItems {
					if idx, ok := txMap[item.TransactionID]; ok {
						list[idx].Items = append(list[idx].Items, item)
					}
				}
			}
		}
	}

	c.JSON(http.StatusOK, list)
}

func (h *POSHandler) GetTransactionByID(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	query := `
		SELECT id, user_id, shift_id, customer_id, customer_name, invoice_number,
		       COALESCE(subtotal, 0)::float8 as subtotal,
		       COALESCE(tax, 0)::float8 as tax,
		       COALESCE(total_amount, 0)::float8 as total_amount,
		       COALESCE(total, 0)::float8 as total,
		       COALESCE(discount, 0)::float8 as discount,
		       COALESCE(tax_amount, 0)::float8 as tax_amount,
		       COALESCE(final_amount, 0)::float8 as final_amount,
		       COALESCE(payment_method, 'cash') as payment_method,
		       COALESCE(payment_amount, 0)::float8 as payment_amount,
		       COALESCE(amount_paid, 0)::float8 as amount_paid,
		       COALESCE(change_amount, 0)::float8 as change_amount,
		       promo_code,
		       COALESCE(promo_discount, 0)::float8 as promo_discount,
		       cashier_name, notes,
		       COALESCE(status, 'completed') as status,
		       COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
		       COALESCE(updated_at, CURRENT_TIMESTAMP) as updated_at
		FROM transactions
		WHERE id = $1 AND user_id = $2
	`

	var tx TransactionResp
	err := database.DB.Get(&tx, query, id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Transaction not found")
		return
	}

	var items []TransactionItemResp
	_ = database.DB.Select(&items, `
		SELECT id, transaction_id, product_id, product_name,
		       COALESCE(quantity, 1) as quantity,
		       COALESCE(price, 0)::float8 as price,
		       COALESCE(unit_price, price, 0)::float8 as unit_price,
		       COALESCE(cost_price, 0)::float8 as cost_price,
		       COALESCE(subtotal, 0)::float8 as subtotal,
		       consignment_settlement_id,
		       COALESCE(created_at, CURRENT_TIMESTAMP) as created_at
		FROM transaction_items
		WHERE transaction_id = $1
	`, tx.ID)
	if items == nil {
		items = []TransactionItemResp{}
	}
	tx.Items = items

	c.JSON(http.StatusOK, tx)
}

func (h *POSHandler) CreateTransaction(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)
	tenantID := user.TenantID

	var req struct {
		Items           []TransactionItemReq `json:"items"`
		CustomerID      string               `json:"customer_id"`
		CustomerID2     string               `json:"customerId"`
		CustomerName    string               `json:"customer_name"`
		CustomerName2   string               `json:"customerName"`
		ShiftID         string               `json:"shift_id"`
		ShiftID2        string               `json:"shiftId"`
		InvoiceNumber   string               `json:"invoice_number"`
		InvoiceNumber2  string               `json:"invoiceNumber"`
		Subtotal        *float64             `json:"subtotal"`
		TotalAmount     *float64             `json:"total_amount"`
		TotalAmount2    *float64             `json:"totalAmount"`
		Total           *float64             `json:"total"`
		Discount        float64              `json:"discount"`
		Tax             float64              `json:"tax"`
		TaxAmount       float64              `json:"tax_amount"`
		TaxAmount2      float64              `json:"taxAmount"`
		FinalAmount     *float64             `json:"final_amount"`
		FinalAmount2    *float64             `json:"finalAmount"`
		PaymentMethod   string               `json:"payment_method"`
		PaymentMethod2  string               `json:"paymentMethod"`
		PaymentAmount   *float64             `json:"payment_amount"`
		PaymentAmount2  *float64             `json:"paymentAmount"`
		AmountPaid      *float64             `json:"amount_paid"`
		AmountPaid2     *float64             `json:"amountPaid"`
		ChangeAmount    float64              `json:"change_amount"`
		ChangeAmount2   float64              `json:"changeAmount"`
		PromoCode       string               `json:"promo_code"`
		PromoCode2      string               `json:"promoCode"`
		PromoDiscount   float64              `json:"promo_discount"`
		PromoDiscount2  float64              `json:"promoDiscount"`
		CashierName     string               `json:"cashier_name"`
		CashierName2    string               `json:"cashierName"`
		Notes           string               `json:"notes"`
		Latitude        *float64             `json:"latitude"`
		Longitude       *float64             `json:"longitude"`
		Status          string               `json:"status"`
		PointsRedeemed  int                  `json:"points_redeemed"`
		PointsRedeemed2 int                  `json:"pointsRedeemed"`
		CreatedAt       string               `json:"created_at"`
		CreatedAt2      string               `json:"createdAt"`
		TransactionDate string               `json:"transaction_date"`
		TransactionDate2 string              `json:"transactionDate"`
		Date            string               `json:"date"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || len(req.Items) == 0 {
		utils.RespondValidationError(c, "Transaction must have at least one item")
		return
	}

	// Normalizing request fields
	customerID := req.CustomerID
	if customerID == "" {
		customerID = req.CustomerID2
	}
	customerName := req.CustomerName
	if customerName == "" {
		customerName = req.CustomerName2
	}
	if customerName == "" {
		customerName = "Walk-in Customer"
	}
	payMethod := strings.ToLower(strings.TrimSpace(req.PaymentMethod))
	if payMethod == "" {
		payMethod = strings.ToLower(strings.TrimSpace(req.PaymentMethod2))
	}
	if payMethod == "" {
		payMethod = "cash"
	}
	invoiceNum := req.InvoiceNumber
	if invoiceNum == "" {
		invoiceNum = req.InvoiceNumber2
	}
	if invoiceNum == "" {
		invoiceNum = fmt.Sprintf("INV-%d", time.Now().UnixMilli())
	}
	shiftID := req.ShiftID
	if shiftID == "" {
		shiftID = req.ShiftID2
	}

	// Determine transaction date (support custom date)
	txTime := time.Now()
	dateStr := req.CreatedAt
	if dateStr == "" {
		dateStr = req.CreatedAt2
	}
	if dateStr == "" {
		dateStr = req.TransactionDate
	}
	if dateStr == "" {
		dateStr = req.TransactionDate2
	}
	if dateStr == "" {
		dateStr = req.Date
	}
	if dateStr != "" {
		formats := []string{
			time.RFC3339Nano,
			time.RFC3339,
			"2006-01-02T15:04:05.000Z",
			"2006-01-02T15:04:05Z",
			"2006-01-02T15:04:05",
			"2006-01-02 15:04:05",
			"2006-01-02 15:04",
			"2006-01-02",
		}
		for _, f := range formats {
			if t, err := time.ParseInLocation(f, dateStr, time.Local); err == nil {
				txTime = t
				break
			}
		}
	}

	// Quota check monthly
	var maxTransactions int
	_ = database.DB.Get(&maxTransactions, "SELECT COALESCE(max_transactions, 1000) FROM users WHERE id = $1", tenantID)
	if maxTransactions <= 0 {
		maxTransactions = 1000
	}

	var monthlyCount int
	_ = database.DB.Get(&monthlyCount, `
		SELECT COUNT(*) FROM transactions
		WHERE user_id = $1
		  AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
		  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
	`, tenantID)

	if monthlyCount >= maxTransactions {
		utils.RespondError(c, http.StatusForbidden, fmt.Sprintf("Batas kuota transaksi bulanan Anda terlampaui (Maksimum %d transaksi/bulan).", maxTransactions))
		return
	}

	total := 0.0
	if req.Total != nil {
		total = *req.Total
	} else if req.TotalAmount != nil {
		total = *req.TotalAmount
	} else if req.TotalAmount2 != nil {
		total = *req.TotalAmount2
	} else if req.FinalAmount != nil {
		total = *req.FinalAmount
	} else if req.FinalAmount2 != nil {
		total = *req.FinalAmount2
	}

	finalAmount := total
	subtotal := total
	if req.Subtotal != nil {
		subtotal = *req.Subtotal
	}

	amountPaid := total
	if req.AmountPaid != nil {
		amountPaid = *req.AmountPaid
	} else if req.AmountPaid2 != nil {
		amountPaid = *req.AmountPaid2
	} else if req.PaymentAmount != nil {
		amountPaid = *req.PaymentAmount
	} else if req.PaymentAmount2 != nil {
		amountPaid = *req.PaymentAmount2
	}

	changeAmount := req.ChangeAmount
	if changeAmount == 0 && req.ChangeAmount2 != 0 {
		changeAmount = req.ChangeAmount2
	}

	promoCode := req.PromoCode
	if promoCode == "" {
		promoCode = req.PromoCode2
	}

	promoDiscount := req.PromoDiscount
	if promoDiscount == 0 && req.PromoDiscount2 != 0 {
		promoDiscount = req.PromoDiscount2
	}

	taxAmount := req.TaxAmount
	if taxAmount == 0 && req.TaxAmount2 != 0 {
		taxAmount = req.TaxAmount2
	}

	pointsRedeemed := req.PointsRedeemed
	if pointsRedeemed == 0 && req.PointsRedeemed2 != 0 {
		pointsRedeemed = req.PointsRedeemed2
	}

	status := req.Status
	if status == "" {
		if payMethod == "credit" {
			status = "pending"
		} else {
			status = "completed"
		}
	}

	txID := utils.GenerateUUID()

	// Active Shift check
	if shiftID == "" {
		_ = database.DB.Get(&shiftID, "SELECT id FROM cash_shifts WHERE tenant_id = $1 AND user_id = $2 AND status = 'open' ORDER BY opened_at DESC LIMIT 1", tenantID, user.ID)
	}

	cashierName := req.CashierName
	if cashierName == "" {
		cashierName = req.CashierName2
	}
	if cashierName == "" {
		cashierName = user.FullName
	}
	if cashierName == "" {
		cashierName = user.Email
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO transactions (
			id, user_id, shift_id, customer_id, customer_name, invoice_number,
			subtotal, tax, total_amount, total, discount, tax_amount,
			final_amount, payment_method, payment_amount, amount_paid,
			change_amount, promo_code, promo_discount, cashier_name,
			notes, status, latitude, longitude, created_at, updated_at
		) VALUES (
			$1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, $6,
			$7, $8, $9, $10, $11, $12,
			$13, $14, $15, $16,
			$17, $18, $19, $20,
			$21, $22, $23, $24, $25, $25
		)
	`, txID, tenantID, shiftID, customerID, customerName, invoiceNum,
		subtotal, req.Tax, total, total, req.Discount, taxAmount,
		finalAmount, payMethod, amountPaid, amountPaid,
		changeAmount, promoCode, promoDiscount, cashierName,
		req.Notes, status, req.Latitude, req.Longitude, txTime)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Insert items and decrease stock
	for _, item := range req.Items {
		itemID := utils.GenerateUUID()
		pID := item.ProductID
		if pID == "" {
			pID = item.ProductID2
		}
		pName := item.ProductName
		if pName == "" {
			pName = item.ProductName2
		}
		qty := item.Quantity
		if qty <= 0 {
			qty = 1
		}
		itemSubtotal := item.Subtotal
		if itemSubtotal <= 0 {
			itemSubtotal = item.Price * float64(qty)
		}

		_, err = tx.Exec(`
			INSERT INTO transaction_items (
				id, transaction_id, product_id, product_name, quantity, price, unit_price, cost_price, subtotal
			) VALUES (
				$1, $2, NULLIF($3, ''), $4, $5, $6, $7, $8, $9
			)
		`, itemID, txID, pID, pName, qty, item.Price, item.Price, item.CostPrice, itemSubtotal)

		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, "Gagal menyimpan item transaksi: "+err.Error())
			return
		}

		// Reduce product stock & record stock movement
		if pID != "" {
			var currStock int
			_ = tx.Get(&currStock, "SELECT COALESCE(stock, 0) FROM products WHERE id = $1", pID)

			_, err = tx.Exec(`
				UPDATE products
				SET stock = stock - $1,
				    updated_at = CURRENT_TIMESTAMP
				WHERE id = $2 AND (user_id = $3 OR user_id = $4)
			`, qty, pID, tenantID, user.ID)
			if err != nil {
				// Fallback update without user_id restriction if product belongs to parent tenant
				_, _ = tx.Exec(`
					UPDATE products
					SET stock = stock - $1,
					    updated_at = CURRENT_TIMESTAMP
					WHERE id = $2
				`, qty, pID)
			}

			_, _ = tx.Exec(`
				INSERT INTO stock_movements (
					id, user_id, product_id, type, quantity, stock_before, stock_after, reference_type, reference_id, notes, created_by
				) VALUES (
					$1, $2, $3, 'out', $4, $5, $6, 'pos', $7, $8, $9
				)
			`, utils.GenerateUUID(), tenantID, pID, qty, currStock, currStock-qty, txID, fmt.Sprintf("POS Sale #%s", invoiceNum), user.ID)
		}
	}

	// Update customer total purchases, total spent, balance, and loyalty points
	if customerID != "" {
		balanceDeduction := 0.0
		if payMethod == "balance" {
			balanceDeduction = finalAmount
		}

		var settingsConf struct {
			PointsEnabled bool    `json:"points_enabled"`
			PointRate     float64 `json:"point_rate"`
			PointValue    float64 `json:"point_value"`
		}
		var rawSettings sql.NullString
		_ = database.DB.Get(&rawSettings, "SELECT settings FROM users WHERE id = $1", tenantID)
		if rawSettings.Valid && rawSettings.String != "" {
			_ = json.Unmarshal([]byte(rawSettings.String), &settingsConf)
		}

		earnedPoints := 0
		if settingsConf.PointsEnabled && settingsConf.PointRate > 0 {
			earnedPoints = int(finalAmount / settingsConf.PointRate)
		}

		_, _ = tx.Exec(`
			UPDATE customers
			SET total_purchases = COALESCE(total_purchases, 0) + 1,
			    total_spent = COALESCE(total_spent, 0) + $1,
			    balance = COALESCE(balance, 0) - $2,
			    points = GREATEST(0, COALESCE(points, 0) - $3 + $4),
			    updated_at = CURRENT_TIMESTAMP
			WHERE id = $5 AND user_id = $6
		`, finalAmount, balanceDeduction, pointsRedeemed, earnedPoints, customerID, tenantID)

		if pointsRedeemed > 0 {
			_, _ = tx.Exec(`
				INSERT INTO point_history (id, tenant_id, customer_id, transaction_id, type, points, amount, notes, created_at)
				VALUES ($1, $2, $3, $4, 'redeemed', $5, $6, $7, $8)
			`, utils.GenerateUUID(), tenantID, customerID, txID, -pointsRedeemed, float64(pointsRedeemed)*settingsConf.PointValue, fmt.Sprintf("Penukaran %d poin pada transaksi #%s", pointsRedeemed, invoiceNum), txTime)
		}

		if earnedPoints > 0 {
			_, _ = tx.Exec(`
				INSERT INTO point_history (id, tenant_id, customer_id, transaction_id, type, points, amount, notes, created_at)
				VALUES ($1, $2, $3, $4, 'earned', $5, $6, $7, $8)
			`, utils.GenerateUUID(), tenantID, customerID, txID, earnedPoints, finalAmount, fmt.Sprintf("Perolehan poin dari transaksi #%s", invoiceNum), txTime)
		}
	}

	// Update active shift summary
	if shiftID != "" {
		if payMethod == "cash" {
			_, _ = tx.Exec(`
				UPDATE cash_shifts
				SET total_cash_sales = COALESCE(total_cash_sales, 0) + $1,
				    total_sales = COALESCE(total_sales, 0) + $1,
				    transaction_count = COALESCE(transaction_count, 0) + 1
				WHERE id = $2
			`, finalAmount, shiftID)
		} else {
			_, _ = tx.Exec(`
				UPDATE cash_shifts
				SET total_non_cash_sales = COALESCE(total_non_cash_sales, 0) + $1,
				    total_sales = COALESCE(total_sales, 0) + $1,
				    transaction_count = COALESCE(transaction_count, 0) + 1
				WHERE id = $2
			`, finalAmount, shiftID)
		}
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.Params = []gin.Param{{Key: "id", Value: txID}}
	h.GetTransactionByID(c)
}

func (h *POSHandler) UpdateTransaction(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var req struct {
		CustomerName  string  `json:"customer_name"`
		PaymentMethod string  `json:"payment_method"`
		Notes         string  `json:"notes"`
		Status        string  `json:"status"`
		Discount      float64 `json:"discount"`
		CreatedAt     string  `json:"created_at"`
		CreatedAt2    string  `json:"createdAt"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Data transaksi tidak valid")
		return
	}

	dateStr := req.CreatedAt
	if dateStr == "" {
		dateStr = req.CreatedAt2
	}
	var updateDate *time.Time
	if dateStr != "" {
		formats := []string{
			time.RFC3339Nano,
			time.RFC3339,
			"2006-01-02T15:04:05.000Z",
			"2006-01-02T15:04:05Z",
			"2006-01-02T15:04:05",
			"2006-01-02 15:04:05",
			"2006-01-02 15:04",
			"2006-01-02",
		}
		for _, f := range formats {
			if t, err := time.ParseInLocation(f, dateStr, time.Local); err == nil {
				updateDate = &t
				break
			}
		}
	}

	if updateDate != nil {
		_, err := database.DB.Exec(`
			UPDATE transactions
			SET customer_name = $1, payment_method = $2, notes = $3, status = $4, discount = $5,
			    created_at = $6, updated_at = CURRENT_TIMESTAMP
			WHERE id = $7 AND user_id = $8
		`, req.CustomerName, req.PaymentMethod, req.Notes, req.Status, req.Discount, *updateDate, id, tenantID)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, err.Error())
			return
		}
	} else {
		_, err := database.DB.Exec(`
			UPDATE transactions
			SET customer_name = $1, payment_method = $2, notes = $3, status = $4, discount = $5, updated_at = CURRENT_TIMESTAMP
			WHERE id = $6 AND user_id = $7
		`, req.CustomerName, req.PaymentMethod, req.Notes, req.Status, req.Discount, id, tenantID)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, err.Error())
			return
		}
	}

	utils.RespondSuccess(c, "Transaction updated successfully", gin.H{"success": true})
}

func (h *POSHandler) DeleteTransaction(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	// Restore customer balance if paid by balance/credit
	var txDetail struct {
		CustomerID    sql.NullString `db:"customer_id"`
		PaymentMethod string         `db:"payment_method"`
		Total         float64        `db:"total"`
	}
	_ = tx.Get(&txDetail, "SELECT customer_id, COALESCE(payment_method, 'cash') as payment_method, COALESCE(total, 0) as total FROM transactions WHERE id = $1 AND user_id = $2", id, tenantID)
	if txDetail.CustomerID.Valid && txDetail.CustomerID.String != "" {
		pm := strings.ToLower(txDetail.PaymentMethod)
		if pm == "balance" || pm == "credit" || pm == "saldo" {
			_, _ = tx.Exec("UPDATE customers SET balance = balance + $1 WHERE id = $2 AND user_id = $3", txDetail.Total, txDetail.CustomerID.String, tenantID)
		}
	}

	// Restore product stock for all items in the transaction
	type txItemStock struct {
		ProductID sql.NullString `db:"product_id"`
		Quantity  int            `db:"quantity"`
	}
	var txItems []txItemStock
	_ = tx.Select(&txItems, "SELECT product_id, quantity FROM transaction_items WHERE transaction_id = $1", id)
	for _, item := range txItems {
		if item.ProductID.Valid && item.ProductID.String != "" {
			var currStock int
			_ = tx.Get(&currStock, "SELECT COALESCE(stock, 0) FROM products WHERE id = $1", item.ProductID.String)

			_, _ = tx.Exec("UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
				item.Quantity, item.ProductID.String)

			_, _ = tx.Exec(`
				INSERT INTO stock_movements (
					id, user_id, product_id, type, quantity, stock_before, stock_after, reference_type, reference_id, notes, created_by
				) VALUES (
					$1, $2, $3, 'in', $4, $5, $6, 'delete_tx', $7, $8, $9
				)
			`, utils.GenerateUUID(), tenantID, item.ProductID.String, item.Quantity, currStock, currStock+item.Quantity, id, "Pembatalan/Penghapusan Transaksi", c.GetString("userId"))
		}
	}

	_, _ = tx.Exec("DELETE FROM transaction_items WHERE transaction_id = $1", id)
	_, err = tx.Exec("DELETE FROM transactions WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Transaction deleted", gin.H{"success": true})
}

func (h *POSHandler) VoidTransaction(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&req)

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	var existing struct {
		Status        string         `db:"status"`
		CustomerID    sql.NullString `db:"customer_id"`
		PaymentMethod string         `db:"payment_method"`
		Total         float64        `db:"total"`
	}
	err = tx.Get(&existing, "SELECT status, customer_id, COALESCE(payment_method, 'cash') as payment_method, COALESCE(total, 0) as total FROM transactions WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Transaction not found")
		return
	}
	if existing.Status == "void" {
		utils.RespondError(c, http.StatusBadRequest, "Transaction already voided")
		return
	}

	// Restore customer balance if paid by balance/credit
	if existing.CustomerID.Valid && existing.CustomerID.String != "" {
		pm := strings.ToLower(existing.PaymentMethod)
		if pm == "balance" || pm == "credit" || pm == "saldo" {
			_, _ = tx.Exec("UPDATE customers SET balance = balance + $1 WHERE id = $2 AND user_id = $3", existing.Total, existing.CustomerID.String, tenantID)
		}
	}

	// Restore product stocks
	type Item struct {
		ProductID sql.NullString `db:"product_id"`
		Quantity  int            `db:"quantity"`
	}
	var items []Item
	_ = tx.Select(&items, "SELECT product_id, quantity FROM transaction_items WHERE transaction_id = $1", id)

	for _, it := range items {
		if it.ProductID.Valid && it.ProductID.String != "" {
			var currStock int
			_ = tx.Get(&currStock, "SELECT COALESCE(stock, 0) FROM products WHERE id = $1", it.ProductID.String)
			_, _ = tx.Exec("UPDATE products SET stock = stock + $1 WHERE id = $2", it.Quantity, it.ProductID.String)
			_, _ = tx.Exec(`
				INSERT INTO stock_movements (id, user_id, product_id, type, quantity, stock_before, stock_after, reference_type, reference_id, notes, created_by)
				VALUES ($1, $2, $3, 'return', $4, $5, $6, 'void', $7, $8, $2)
			`, utils.GenerateUUID(), tenantID, it.ProductID.String, it.Quantity, currStock, currStock+it.Quantity, id, fmt.Sprintf("Transaction voided: %s", req.Reason))
		}
	}

	_, err = tx.Exec(`
		UPDATE transactions
		SET status = 'void', notes = COALESCE(notes, '') || $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND user_id = $3
	`, fmt.Sprintf("\n[VOIDED: %s]", req.Reason), id, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Transaction voided successfully", gin.H{"success": true})
}

// -------------------------------------------------------------
// CASH SHIFTS
// -------------------------------------------------------------

type CashShift struct {
	ID                string         `json:"id" db:"id"`
	TenantID          string         `json:"tenant_id" db:"tenant_id"`
	UserID            string         `json:"user_id" db:"user_id"`
	CashierName       string         `json:"cashier_name" db:"cashier_name"`
	StartingCash      float64        `json:"starting_cash" db:"starting_cash"`
	EndingCash        *float64       `json:"ending_cash" db:"ending_cash"`
	ExpectedCash      *float64       `json:"expected_cash" db:"expected_cash"`
	Difference        *float64       `json:"difference" db:"difference"`
	TotalCashSales    float64        `json:"total_cash_sales" db:"total_cash_sales"`
	TotalNonCashSales float64        `json:"total_non_cash_sales" db:"total_non_cash_sales"`
	TotalSales        float64        `json:"total_sales" db:"total_sales"`
	TransactionCount  int            `json:"transaction_count" db:"transaction_count"`
	Status            string     `json:"status" db:"status"`
	Notes             *string    `json:"notes" db:"notes"`
	OpenedAt          time.Time  `json:"opened_at" db:"opened_at"`
	ClosedAt          *time.Time     `json:"closed_at" db:"closed_at"`
}

func (h *POSHandler) GetShifts(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var shifts []CashShift
	err := database.DB.Select(&shifts, `
		SELECT id, tenant_id, user_id, cashier_name, starting_cash, ending_cash,
		       expected_cash, difference, total_cash_sales, total_non_cash_sales,
		       total_sales, transaction_count, status, notes, opened_at, closed_at
		FROM cash_shifts
		WHERE tenant_id = $1
		ORDER BY opened_at DESC
		LIMIT 50
	`, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	if shifts == nil {
		shifts = []CashShift{}
	}
	c.JSON(http.StatusOK, shifts)
}

func (h *POSHandler) GetCurrentShift(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	var shift CashShift
	err := database.DB.Get(&shift, `
		SELECT id, tenant_id, user_id, cashier_name, starting_cash, ending_cash,
		       expected_cash, difference, total_cash_sales, total_non_cash_sales,
		       total_sales, transaction_count, status, notes, opened_at, closed_at
		FROM cash_shifts
		WHERE tenant_id = $1 AND user_id = $2 AND status = 'open'
		ORDER BY opened_at DESC
		LIMIT 1
	`, user.TenantID, user.ID)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{"activeShift": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"activeShift": shift})
}

func (h *POSHandler) GetShiftByID(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var shift CashShift
	err := database.DB.Get(&shift, `
		SELECT id, tenant_id, user_id, cashier_name, starting_cash, ending_cash,
		       expected_cash, difference, total_cash_sales, total_non_cash_sales,
		       total_sales, transaction_count, status, notes, opened_at, closed_at
		FROM cash_shifts
		WHERE id = $1 AND tenant_id = $2
	`, id, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Shift not found")
		return
	}

	c.JSON(http.StatusOK, shift)
}

func (h *POSHandler) OpenShift(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	var req struct {
		StartingCash float64 `json:"starting_cash"`
		Notes        string  `json:"notes"`
	}
	_ = c.ShouldBindJSON(&req)

	// Check if already has an open shift
	var openCount int
	_ = database.DB.Get(&openCount, "SELECT COUNT(*) FROM cash_shifts WHERE tenant_id = $1 AND user_id = $2 AND status = 'open'", user.TenantID, user.ID)
	if openCount > 0 {
		utils.RespondError(c, http.StatusBadRequest, "Anda sudah memiliki shift yang masih terbuka")
		return
	}

	id := utils.GenerateUUID()
	cashierName := user.FullName
	if cashierName == "" {
		cashierName = user.Email
	}

	_, err := database.DB.Exec(`
		INSERT INTO cash_shifts (
			id, tenant_id, user_id, cashier_name, starting_cash, status, notes, opened_at
		) VALUES (
			$1, $2, $3, $4, $5, 'open', $6, CURRENT_TIMESTAMP
		)
	`, id, user.TenantID, user.ID, cashierName, req.StartingCash, req.Notes)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.Params = []gin.Param{{Key: "id", Value: id}}
	h.GetShiftByID(c)
}

func (h *POSHandler) CloseShift(c *gin.Context) {
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	var req struct {
		ShiftID    string  `json:"shift_id"`
		EndingCash float64 `json:"ending_cash"`
		Notes      string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Data tutup shift tidak valid")
		return
	}

	shiftID := req.ShiftID
	if shiftID == "" {
		_ = database.DB.Get(&shiftID, "SELECT id FROM cash_shifts WHERE tenant_id = $1 AND user_id = $2 AND status = 'open' ORDER BY opened_at DESC LIMIT 1", user.TenantID, user.ID)
	}

	if shiftID == "" {
		utils.RespondError(c, http.StatusBadRequest, "Tidak ada shift aktif yang ditemukan")
		return
	}

	var shift CashShift
	err := database.DB.Get(&shift, "SELECT * FROM cash_shifts WHERE id = $1 AND tenant_id = $2", shiftID, user.TenantID)
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Shift tidak ditemukan")
		return
	}

	expectedCash := shift.StartingCash + shift.TotalCashSales
	diff := req.EndingCash - expectedCash

	_, err = database.DB.Exec(`
		UPDATE cash_shifts
		SET ending_cash = $1, expected_cash = $2, difference = $3,
		    notes = CASE WHEN $4 != '' THEN $4 ELSE notes END,
		    status = 'closed', closed_at = CURRENT_TIMESTAMP
		WHERE id = $5 AND tenant_id = $6
	`, req.EndingCash, expectedCash, diff, req.Notes, shiftID, user.TenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Shift closed successfully", gin.H{
		"success":       true,
		"expected_cash": expectedCash,
		"difference":    diff,
	})
}
