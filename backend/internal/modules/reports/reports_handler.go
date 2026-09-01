package reports

import (
	"net/http"
	"sort"

	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type ReportsHandler struct{}

func NewReportsHandler() *ReportsHandler {
	return &ReportsHandler{}
}

func (h *ReportsHandler) RegisterRoutes(r *gin.RouterGroup) {
	// Dashboard stats
	r.GET("/dashboard/stats", middleware.AuthenticateToken(), h.GetDashboardStats)

	// Reports
	rep := r.Group("/reports", middleware.AuthenticateToken())
	{
		rep.GET("/sales-daily", h.GetSalesDaily)
		rep.GET("/sales-monthly", h.GetSalesMonthly)
		rep.GET("/sales-yearly", h.GetSalesYearly)
		rep.GET("/top-products", h.GetTopProducts)
		rep.GET("/payment-methods", h.GetPaymentMethods)
		rep.GET("/sales-summary", h.GetSalesSummary)
		rep.GET("/financial-summary", h.GetFinancialSummary)
		rep.GET("/expenses-daily", h.GetExpensesDaily)
		rep.GET("/expenses-monthly", h.GetExpensesMonthly)
		rep.GET("/expenses-yearly", h.GetExpensesYearly)
	}

	// Analytics & AI Report
	an := r.Group("/analytics", middleware.AuthenticateToken())
	{
		an.GET("/ai-report", h.GetAIReport)
		an.POST("/ai-chat", h.HandleAIChat)
	}
}

func (h *ReportsHandler) GetDashboardStats(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userVal, _ := c.Get("user")
	user := userVal.(middleware.AuthUser)

	ranges := utils.GetWIBDateRanges()

	var todaySales struct {
		Count int     `db:"count"`
		Total float64 `db:"total"`
	}
	_ = database.DB.Get(&todaySales, `
		SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
		FROM transactions
		WHERE status = 'completed' AND (user_id = $1 OR customer_id = (SELECT id FROM customers WHERE email = $2 LIMIT 1))
		  AND created_at BETWEEN $3::timestamp AND $4::timestamp
	`, tenantID, user.Email, ranges.TodayStart, ranges.TodayEnd)

	// Deduct consignment cost
	var todayConsignmentCost float64
	_ = database.DB.Get(&todayConsignmentCost, `
		SELECT COALESCE(SUM(p.cost * ti.quantity), 0) as total_cost
		FROM transactions t
		JOIN transaction_items ti ON t.id = ti.transaction_id
		JOIN products p ON ti.product_id = p.id
		WHERE t.status = 'completed' AND p.ownership_type = 'consignment'
		  AND (t.user_id = $1 OR t.customer_id = (SELECT id FROM customers WHERE email = $2 LIMIT 1))
		  AND t.created_at BETWEEN $3::timestamp AND $4::timestamp
	`, tenantID, user.Email, ranges.TodayStart, ranges.TodayEnd)

	adjustedTodayTotal := todaySales.Total - todayConsignmentCost
	if adjustedTodayTotal < 0 {
		adjustedTodayTotal = 0
	}

	var totalProducts int
	_ = database.DB.Get(&totalProducts, "SELECT COUNT(*) FROM products WHERE user_id = $1", tenantID)

	var lowStockProducts int
	_ = database.DB.Get(&lowStockProducts, "SELECT COUNT(*) FROM products WHERE stock <= min_stock AND user_id = $1", tenantID)

	var totalCustomers int
	_ = database.DB.Get(&totalCustomers, "SELECT COUNT(*) FROM customers WHERE user_id = $1", tenantID)

	var monthSales struct {
		Total float64 `db:"total"`
	}
	_ = database.DB.Get(&monthSales, `
		SELECT COALESCE(SUM(total), 0) as total
		FROM transactions
		WHERE status = 'completed' AND (user_id = $1 OR customer_id = (SELECT id FROM customers WHERE email = $2 LIMIT 1))
		  AND created_at BETWEEN $3::timestamp AND $4::timestamp
	`, tenantID, user.Email, ranges.MonthStart, ranges.MonthEnd)

	var monthConsignmentCost float64
	_ = database.DB.Get(&monthConsignmentCost, `
		SELECT COALESCE(SUM(p.cost * ti.quantity), 0) as total_cost
		FROM transactions t
		JOIN transaction_items ti ON t.id = ti.transaction_id
		JOIN products p ON ti.product_id = p.id
		WHERE t.status = 'completed' AND p.ownership_type = 'consignment'
		  AND (t.user_id = $1 OR t.customer_id = (SELECT id FROM customers WHERE email = $2 LIMIT 1))
		  AND t.created_at BETWEEN $3::timestamp AND $4::timestamp
	`, tenantID, user.Email, ranges.MonthStart, ranges.MonthEnd)

	adjustedMonthTotal := monthSales.Total - monthConsignmentCost
	if adjustedMonthTotal < 0 {
		adjustedMonthTotal = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"todaySalesCount":  todaySales.Count,
		"todaySalesTotal":  adjustedTodayTotal,
		"totalProducts":    totalProducts,
		"lowStockProducts": lowStockProducts,
		"totalCustomers":   totalCustomers,
		"monthSalesTotal":  adjustedMonthTotal,
	})
}

func (h *ReportsHandler) GetSalesDaily(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	ranges := utils.GetWIBDateRanges()

	type DailyRow struct {
		Date        string  `json:"date" db:"date"`
		TotalSales  float64 `json:"total_sales" db:"total_sales"`
		OrdersCount int     `json:"orders_count" db:"orders_count"`
	}

	var list []DailyRow
	err := database.DB.Select(&list, `
		SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date,
		       COALESCE(SUM(total), 0) as total_sales,
		       COUNT(id) as orders_count
		FROM transactions
		WHERE user_id = $1 AND status != 'void' AND created_at >= $2::timestamp
		GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
		ORDER BY date DESC
	`, tenantID, ranges.Last30DaysStart)

	if err != nil {
		c.JSON(http.StatusOK, []DailyRow{})
		return
	}
	if list == nil {
		list = []DailyRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *ReportsHandler) GetSalesMonthly(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	ranges := utils.GetWIBDateRanges()

	type MonthlyRow struct {
		Month       string  `json:"month" db:"month"`
		TotalSales  float64 `json:"total_sales" db:"total_sales"`
		OrdersCount int     `json:"orders_count" db:"orders_count"`
	}

	var list []MonthlyRow
	err := database.DB.Select(&list, `
		SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
		       COALESCE(SUM(total), 0) as total_sales,
		       COUNT(id) as orders_count
		FROM transactions
		WHERE user_id = $1 AND status != 'void' AND created_at >= $2::timestamp
		GROUP BY TO_CHAR(created_at, 'YYYY-MM')
		ORDER BY month DESC
	`, tenantID, ranges.Last12MonthsStart)

	if err != nil {
		c.JSON(http.StatusOK, []MonthlyRow{})
		return
	}
	if list == nil {
		list = []MonthlyRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *ReportsHandler) GetSalesYearly(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	type YearlyRow struct {
		Year        string  `json:"year" db:"year"`
		TotalSales  float64 `json:"total_sales" db:"total_sales"`
		OrdersCount int     `json:"orders_count" db:"orders_count"`
	}

	var list []YearlyRow
	err := database.DB.Select(&list, `
		SELECT TO_CHAR(created_at, 'YYYY') as year,
		       COALESCE(SUM(total), 0) as total_sales,
		       COUNT(id) as orders_count
		FROM transactions
		WHERE user_id = $1 AND status != 'void'
		GROUP BY TO_CHAR(created_at, 'YYYY')
		ORDER BY year DESC
	`, tenantID)

	if err != nil {
		c.JSON(http.StatusOK, []YearlyRow{})
		return
	}
	if list == nil {
		list = []YearlyRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *ReportsHandler) GetTopProducts(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	type TopProdRow struct {
		ProductID    *string `json:"product_id" db:"product_id"`
		ProductName  string  `json:"product_name" db:"product_name"`
		TotalQty     int     `json:"total_qty" db:"total_qty"`
		TotalRevenue float64 `json:"total_revenue" db:"total_revenue"`
	}

	var list []TopProdRow
	err := database.DB.Select(&list, `
		SELECT ti.product_id, ti.product_name,
		       SUM(COALESCE(ti.quantity, 1)) as total_qty,
		       SUM(COALESCE(ti.subtotal, 0)) as total_revenue
		FROM transaction_items ti
		JOIN transactions t ON ti.transaction_id = t.id
		WHERE t.user_id = $1 AND t.status != 'void'
		GROUP BY ti.product_id, ti.product_name
		ORDER BY total_qty DESC
		LIMIT 10
	`, tenantID)

	if err != nil {
		c.JSON(http.StatusOK, []TopProdRow{})
		return
	}
	if list == nil {
		list = []TopProdRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *ReportsHandler) GetPaymentMethods(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	type PayMethodRow struct {
		PaymentMethod string  `json:"payment_method" db:"payment_method"`
		Count         int     `json:"count" db:"count"`
		TotalAmount   float64 `json:"total_amount" db:"total_amount"`
	}

	var list []PayMethodRow
	err := database.DB.Select(&list, `
		SELECT COALESCE(payment_method, 'cash') as payment_method,
		       COUNT(id) as count,
		       COALESCE(SUM(total), 0) as total_amount
		FROM transactions
		WHERE user_id = $1 AND status != 'void'
		GROUP BY payment_method
		ORDER BY total_amount DESC
	`, tenantID)

	if err != nil {
		c.JSON(http.StatusOK, []PayMethodRow{})
		return
	}
	if list == nil {
		list = []PayMethodRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *ReportsHandler) GetSalesSummary(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")

	query := `
		SELECT COUNT(id) as total_transactions,
		       COALESCE(SUM(total), 0) as total_sales,
		       COALESCE(SUM(discount), 0) as total_discount,
		       COALESCE(AVG(total), 0) as average_transaction
		FROM transactions
		WHERE user_id = $1 AND status != 'void'
	`
	args := []interface{}{tenantID}
	if startDate != "" {
		query += " AND created_at >= $2"
		args = append(args, startDate)
	}
	if endDate != "" {
		query += " AND created_at <= $3"
		args = append(args, endDate)
	}

	type Summary struct {
		TotalTransactions  int     `json:"total_transactions" db:"total_transactions"`
		TotalSales         float64 `json:"total_sales" db:"total_sales"`
		TotalDiscount      float64 `json:"total_discount" db:"total_discount"`
		AverageTransaction float64 `json:"average_transaction" db:"average_transaction"`
	}

	var s Summary
	_ = database.DB.Get(&s, query, args...)
	c.JSON(http.StatusOK, s)
}

func (h *ReportsHandler) GetFinancialSummary(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	period := c.DefaultQuery("period", "month")
	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")

	ranges := utils.GetWIBDateRanges()
	var startStr, endStr string

	if fromDate != "" && toDate != "" {
		startStr = fromDate + " 00:00:00"
		endStr = toDate + " 23:59:59"
	} else if period == "today" {
		startStr = ranges.TodayStart
		endStr = ranges.TodayEnd
	} else if period == "last7days" {
		startStr = ranges.Last7DaysStart
		endStr = ranges.TodayEnd
	} else if period == "last_month" {
		startStr = ranges.LastMonthStart
		endStr = ranges.LastMonthEnd
	} else if period == "year" {
		startStr = ranges.YearStart
		endStr = ranges.YearEnd
	} else {
		startStr = ranges.MonthStart
		endStr = ranges.MonthEnd
	}

	// 1. Total Sales
	var totalSales float64
	_ = database.DB.Get(&totalSales, `
		SELECT COALESCE(SUM(total), 0) FROM transactions
		WHERE user_id = $1 AND status != 'void' AND created_at BETWEEN $2::timestamp AND $3::timestamp
	`, tenantID, startStr, endStr)

	// 2. COGS (HPP)
	var totalCOGS float64
	_ = database.DB.Get(&totalCOGS, `
		SELECT COALESCE(SUM(ti.quantity * 
			CASE 
				WHEN COALESCE(ti.cost_price, 0) > 0 THEN ti.cost_price 
				ELSE COALESCE(p.cost, 0) 
			END
		), 0)
		FROM transaction_items ti
		JOIN transactions t ON ti.transaction_id = t.id
		LEFT JOIN products p ON ti.product_id = p.id
		WHERE t.user_id = $1 AND t.status != 'void' AND t.created_at BETWEEN $2::timestamp AND $3::timestamp
	`, tenantID, startStr, endStr)

	// 3. Operational Expenses
	var totalExpenses float64
	_ = database.DB.Get(&totalExpenses, `
		SELECT COALESCE(SUM(amount), 0) FROM expenses
		WHERE user_id = $1 AND date BETWEEN $2::date AND $3::date
	`, tenantID, startStr, endStr)

	// 4. Other Incomes
	var totalOtherIncomes float64
	_ = database.DB.Get(&totalOtherIncomes, `
		SELECT COALESCE(SUM(amount), 0) FROM incomes
		WHERE user_id = $1 AND status = 'paid' AND income_date BETWEEN $2::date AND $3::date
	`, tenantID, startStr, endStr)

	grossProfit := totalSales - totalCOGS
	netProfit := grossProfit + totalOtherIncomes - totalExpenses

	c.JSON(http.StatusOK, gin.H{
		"period":             period,
		"start_date":         startStr,
		"end_date":           endStr,
		"total_revenue":      totalSales + totalOtherIncomes,
		"total_sales":        totalSales,
		"total_cogs":         totalCOGS,
		"gross_profit":       grossProfit,
		"total_expenses":     totalExpenses,
		"total_other_income": totalOtherIncomes,
		"net_profit":         netProfit,
	})
}

func (h *ReportsHandler) GetExpensesDaily(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	ranges := utils.GetWIBDateRanges()

	type ExpDailyRow struct {
		Date     string  `json:"date" db:"date"`
		Category string  `json:"category" db:"category"`
		Total    float64 `json:"total" db:"total"`
	}

	var list []ExpDailyRow
	err := database.DB.Select(&list, `
		SELECT TO_CHAR(date, 'YYYY-MM-DD') as date,
		       COALESCE(category, 'General') as category,
		       SUM(amount) as total
		FROM expenses
		WHERE user_id = $1 AND date >= $2::date
		GROUP BY TO_CHAR(date, 'YYYY-MM-DD'), category
		ORDER BY date DESC
	`, tenantID, ranges.Last30DaysStart)

	if err != nil {
		c.JSON(http.StatusOK, []ExpDailyRow{})
		return
	}
	if list == nil {
		list = []ExpDailyRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *ReportsHandler) GetExpensesMonthly(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	ranges := utils.GetWIBDateRanges()

	type ExpMonthlyRow struct {
		Month    string  `json:"month" db:"month"`
		Category string  `json:"category" db:"category"`
		Total    float64 `json:"total" db:"total"`
	}

	var list []ExpMonthlyRow
	err := database.DB.Select(&list, `
		SELECT TO_CHAR(date, 'YYYY-MM') as month,
		       COALESCE(category, 'General') as category,
		       SUM(amount) as total
		FROM expenses
		WHERE user_id = $1 AND date >= $2::date
		GROUP BY TO_CHAR(date, 'YYYY-MM'), category
		ORDER BY month DESC
	`, tenantID, ranges.Last12MonthsStart)

	if err != nil {
		c.JSON(http.StatusOK, []ExpMonthlyRow{})
		return
	}
	if list == nil {
		list = []ExpMonthlyRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *ReportsHandler) GetExpensesYearly(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	type ExpYearlyRow struct {
		Year     string  `json:"year" db:"year"`
		Category string  `json:"category" db:"category"`
		Total    float64 `json:"total" db:"total"`
	}

	var list []ExpYearlyRow
	err := database.DB.Select(&list, `
		SELECT TO_CHAR(date, 'YYYY') as year,
		       COALESCE(category, 'General') as category,
		       SUM(amount) as total
		FROM expenses
		WHERE user_id = $1
		GROUP BY TO_CHAR(date, 'YYYY'), category
		ORDER BY year DESC
	`, tenantID)

	if err != nil {
		c.JSON(http.StatusOK, []ExpYearlyRow{})
		return
	}
	if list == nil {
		list = []ExpYearlyRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *ReportsHandler) GetAIReport(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	type HourlySale struct {
		Hour  int     `json:"hour" db:"hour"`
		Count int     `json:"count" db:"count"`
		Total float64 `json:"total" db:"total"`
	}

	var hourlySales []HourlySale
	_ = database.DB.Select(&hourlySales, `
		SELECT EXTRACT(HOUR FROM created_at)::int as hour,
		       COUNT(*) as count,
		       COALESCE(SUM(total), 0) as total
		FROM transactions
		WHERE user_id = $1 AND status = 'completed'
		GROUP BY EXTRACT(HOUR FROM created_at)::int
		ORDER BY hour
	`, tenantID)
	if hourlySales == nil {
		hourlySales = []HourlySale{}
	}

	type ProductVel struct {
		ID           string  `json:"id" db:"id"`
		Name         string  `json:"name" db:"name"`
		SKU          string  `json:"sku" db:"sku"`
		Stock        int     `json:"stock" db:"stock"`
		MinStock     int     `json:"min_stock" db:"min_stock"`
		Price        float64 `json:"price" db:"price"`
		Cost         float64 `json:"cost" db:"cost"`
		Unit         string  `json:"unit" db:"unit"`
		QuantitySold int     `json:"quantity_sold" db:"quantity_sold"`
		Revenue      float64 `json:"revenue" db:"revenue"`
	}

	var productVelocity []ProductVel
	_ = database.DB.Select(&productVelocity, `
		SELECT p.id, p.name, COALESCE(p.sku, '') as sku,
		       p.stock, p.min_stock, p.price, p.cost,
		       COALESCE(p.unit, 'pcs') as unit,
		       COALESCE(SUM(ti.quantity), 0) as quantity_sold,
		       COALESCE(SUM(ti.subtotal), 0) as revenue
		FROM products p
		LEFT JOIN transaction_items ti ON p.id = ti.product_id
		LEFT JOIN transactions t ON ti.transaction_id = t.id AND t.status = 'completed' AND t.user_id = $1
		WHERE p.user_id = $1
		GROUP BY p.id, p.name, p.sku, p.stock, p.min_stock, p.price, p.cost, p.unit
		ORDER BY quantity_sold DESC
	`, tenantID)
	if productVelocity == nil {
		productVelocity = []ProductVel{}
	}

	// Market Basket
	type BasketItem struct {
		TransactionID string `db:"transaction_id"`
		ProductName   string `db:"product_name"`
	}
	var txItems []BasketItem
	_ = database.DB.Select(&txItems, `
		SELECT ti.transaction_id, ti.product_name
		FROM transaction_items ti
		JOIN transactions t ON ti.transaction_id = t.id
		WHERE t.user_id = $1 AND t.status = 'completed'
	`, tenantID)

	bMap := make(map[string][]string)
	for _, item := range txItems {
		bMap[item.TransactionID] = append(bMap[item.TransactionID], item.ProductName)
	}

	pairs := make(map[string]int)
	for _, prods := range bMap {
		if len(prods) < 2 {
			continue
		}
		uMap := make(map[string]bool)
		var unique []string
		for _, p := range prods {
			if !uMap[p] {
				uMap[p] = true
				unique = append(unique, p)
			}
		}
		for i := 0; i < len(unique); i++ {
			for j := i + 1; j < len(unique); j++ {
				p1, p2 := unique[i], unique[j]
				if p1 > p2 {
					p1, p2 = p2, p1
				}
				pairKey := p1 + " & " + p2
				pairs[pairKey]++
			}
		}
	}

	type PairCount struct {
		Pair  string `json:"pair"`
		Count int    `json:"count"`
	}
	var marketBasket []PairCount
	for k, v := range pairs {
		marketBasket = append(marketBasket, PairCount{Pair: k, Count: v})
	}
	sort.Slice(marketBasket, func(i, j int) bool {
		return marketBasket[i].Count > marketBasket[j].Count
	})
	if len(marketBasket) > 5 {
		marketBasket = marketBasket[:5]
	}
	if marketBasket == nil {
		marketBasket = []PairCount{}
	}

	insights := gin.H{
		"executiveSummary": "Berdasarkan analisis performa operasional toko, efisiensi transaksi Anda dinilai sangat potensial di beberapa jam utama. Optimalkan promo bundling produk asosiasi dan pertahankan ketersediaan stok produk terlaris.",
		"peakHourAnalysis": "Pola transaksi menunjukkan volume penjualan stabil pada jam operasional harian.",
		"productAnalysis":  "Katalog produk berputar dengan baik pada produk-produk unggulan.",
		"affinityAnalysis": "Kombinasi produk dalam keranjang belanja berpotensi ditingkatkan dengan paket bundling.",
		"strategicPlan":    "### 💡 Rekomendasi Strategis AI\n1. **Optimalisasi Shift Staf**: Siapkan kasir ekstra pada jam sibuk.\n2. **Promosi Happy Hour**: Berikan penawaran khusus pada jam senggang.\n3. **Manajemen Stok**: Prioritaskan pengadaan kembali produk dengan perputaran cepat.",
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"hourlySales":     hourlySales,
			"productVelocity": productVelocity,
			"marketBasket":    marketBasket,
			"insights":        insights,
		},
	})
}

func (h *ReportsHandler) HandleAIChat(c *gin.Context) {
	var req struct {
		Question string `json:"question"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Question == "" {
		utils.RespondValidationError(c, "Pertanyaan diperlukan")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"answer":  "Halo! Berdasarkan analisis data bisnis Anda, performa penjualan dan perputaran inventori berjalan aktif. Ada yang ingin Anda konsultasikan lebih lanjut mengenai optimasi stok, jam operasional, atau strategi bundling produk?",
	})
}
