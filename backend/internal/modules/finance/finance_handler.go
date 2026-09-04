package finance

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"time"

	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type FinanceHandler struct{}

func NewFinanceHandler() *FinanceHandler {
	return &FinanceHandler{}
}

func (h *FinanceHandler) RegisterRoutes(r *gin.RouterGroup) {
	// Expense categories
	ec := r.Group("/expense-categories", middleware.AuthenticateToken())
	{
		ec.GET("", h.GetExpenseCategories)
		ec.POST("", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.CreateExpenseCategory)
		ec.DELETE("/:id", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.DeleteExpenseCategory)
	}

	// Expenses
	exp := r.Group("/expenses", middleware.AuthenticateToken())
	{
		exp.GET("", h.GetExpenses)
		exp.POST("", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.CreateExpense)
		exp.PUT("/:id", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.UpdateExpense)
		exp.DELETE("/:id", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.DeleteExpense)
	}

	// Incomes
	inc := r.Group("/incomes", middleware.AuthenticateToken())
	{
		inc.GET("", h.GetIncomes)
		inc.GET("/summary", h.GetIncomeSummary)
		inc.GET("/:id", h.GetIncomeByID)
		inc.POST("", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.CreateIncome)
		inc.PUT("/:id", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.UpdateIncome)
		inc.DELETE("/:id", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.DeleteIncome)

		// Income costs
		inc.GET("/:id/costs", h.GetIncomeCosts)
		inc.POST("/:id/costs", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.CreateIncomeCost)
		inc.PUT("/:id/costs/:costId", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.UpdateIncomeCost)
		inc.DELETE("/:id/costs/:costId", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.DeleteIncomeCost)
	}

	// Profit sharing
	ps := r.Group("/profit-sharing", middleware.AuthenticateToken())
	{
		ps.GET("/settings", h.GetProfitSharingSettings)
		ps.PUT("/settings", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.UpdateProfitSharingSettings)
		ps.GET("/calculate", h.CalculateProfitSharing)
		ps.GET("/distributions", h.GetProfitDistributions)
		ps.POST("/distributions", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.CreateProfitDistribution)
		ps.PUT("/distributions/:id/payment", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.UpdateDistributionPayment)
		ps.DELETE("/distributions/:id", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.DeleteProfitDistribution)
	}

	// Reinvestment
	reinv := r.Group("/reinvestment", middleware.AuthenticateToken())
	{
		reinv.GET("/balance", h.GetReinvestmentBalance)
		reinv.GET("/transactions", h.GetReinvestmentTransactions)
		reinv.GET("/summary", h.GetReinvestmentSummary)
		reinv.POST("/use", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.UseReinvestment)
		reinv.POST("/add-manual", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.AddManualReinvestment)
		reinv.POST("/add-from-distribution", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.AddReinvestmentFromDistribution)
		reinv.PUT("/transactions/:id", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.UpdateReinvestmentTransaction)
		reinv.DELETE("/transactions/:id", middleware.RequireRole("admin", "owner", "manager", "super_admin"), h.DeleteReinvestmentTransaction)
	}
}

// -------------------------------------------------------------
// EXPENSES
// -------------------------------------------------------------

type ExpenseCategoryRow struct {
	ID          string    `json:"id" db:"id"`
	UserID      string    `json:"user_id" db:"user_id"`
	Name        string    `json:"name" db:"name"`
	Description *string   `json:"description" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type ExpenseRow struct {
	ID            string     `json:"id" db:"id"`
	UserID        string     `json:"user_id" db:"user_id"`
	CategoryID    *string    `json:"category_id" db:"category_id"`
	Category      *string    `json:"category" db:"category"`
	Name          *string    `json:"name" db:"name"`
	Title         *string    `json:"title" db:"title"`
	Amount        float64    `json:"amount" db:"amount"`
	Date          *time.Time `json:"date" db:"date"`
	ExpenseDate   *time.Time `json:"expense_date" db:"expense_date"`
	PaymentMethod *string    `json:"payment_method" db:"payment_method"`
	Description   *string    `json:"description" db:"description"`
	Notes         *string    `json:"notes" db:"notes"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

func (h *FinanceHandler) GetExpenseCategories(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	var list []ExpenseCategoryRow
	err := database.DB.Select(&list, "SELECT id, user_id, name, description, created_at FROM expense_categories WHERE user_id = $1 OR user_id = $2 ORDER BY name ASC", tenantID, userID)
	if err != nil {
		c.JSON(http.StatusOK, []ExpenseCategoryRow{})
		return
	}
	if list == nil {
		list = []ExpenseCategoryRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinanceHandler) CreateExpenseCategory(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		utils.RespondValidationError(c, "Nama kategori wajib diisi")
		return
	}

	id := utils.GenerateUUID()
	_, err := database.DB.Exec("INSERT INTO expense_categories (id, user_id, name, description) VALUES ($1, $2, $3, $4)", id, tenantID, req.Name, req.Description)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "name": req.Name, "description": req.Description})
}

func (h *FinanceHandler) DeleteExpenseCategory(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM expense_categories WHERE id = $1 AND (user_id = $2 OR user_id = $3)", id, tenantID, userID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Expense category deleted", gin.H{"success": true})
}

func (h *FinanceHandler) GetExpenses(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	startDate := c.Query("startDate")
	endDate := c.Query("endDate")
	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")
	period := c.Query("period")
	cat := c.Query("category")

	if startDate == "" && fromDate != "" {
		startDate = fromDate
	}
	if endDate == "" && toDate != "" {
		endDate = toDate
	}

	if startDate == "" && endDate == "" && period != "" {
		ranges := utils.GetWIBDateRanges()
		switch period {
		case "today":
			startDate = ranges.TodayStart[:10]
			endDate = ranges.TodayEnd[:10]
		case "week":
			startDate = ranges.Last7DaysStart[:10]
			endDate = ranges.TodayEnd[:10]
		case "month":
			startDate = ranges.MonthStart[:10]
			endDate = ranges.MonthEnd[:10]
		case "last_month":
			startDate = ranges.LastMonthStart[:10]
			endDate = ranges.LastMonthEnd[:10]
		case "year":
			startDate = ranges.YearStart[:10]
			endDate = ranges.YearEnd[:10]
		case "all", "custom":
			// No date filter applied
		default: // "month"
			startDate = ranges.MonthStart[:10]
			endDate = ranges.MonthEnd[:10]
		}
	}

	query := `
		SELECT id, user_id, category_id, category, 
		       COALESCE(name, title, description, 'Pengeluaran') as name,
		       COALESCE(title, name, description, 'Pengeluaran') as title,
		       amount, 
		       COALESCE(date, expense_date, created_at::date) as date,
		       COALESCE(expense_date, date, created_at::date) as expense_date,
		       COALESCE(payment_method, 'cash') as payment_method,
		       COALESCE(description, '') as description,
		       COALESCE(notes, '') as notes,
		       created_at, updated_at
		FROM expenses
		WHERE (user_id = $1 OR user_id = $2)
	`
	args := []interface{}{tenantID, userID}
	argIdx := 3

	if startDate != "" && endDate != "" {
		query += fmt.Sprintf(" AND (COALESCE(expense_date, date, created_at::date) BETWEEN $%d::date AND $%d::date)", argIdx, argIdx+1)
		args = append(args, startDate, endDate)
		argIdx += 2
	} else {
		if startDate != "" {
			query += fmt.Sprintf(" AND (COALESCE(expense_date, date, created_at::date) >= $%d::date)", argIdx)
			args = append(args, startDate)
			argIdx++
		}
		if endDate != "" {
			query += fmt.Sprintf(" AND (COALESCE(expense_date, date, created_at::date) <= $%d::date)", argIdx)
			args = append(args, endDate)
			argIdx++
		}
	}

	if cat != "" {
		query += fmt.Sprintf(" AND (category = $%d OR category_id = $%d)", argIdx, argIdx)
		args = append(args, cat)
		argIdx++
	}

	query += " ORDER BY created_at DESC"

	var list []ExpenseRow
	err := database.DB.Select(&list, query, args...)
	if err != nil {
		c.JSON(http.StatusOK, []ExpenseRow{})
		return
	}
	if list == nil {
		list = []ExpenseRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinanceHandler) CreateExpense(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	var req struct {
		Name          string  `json:"name"`
		Title         string  `json:"title"`
		Amount        float64 `json:"amount"`
		CategoryID    string  `json:"category_id"`
		Category      string  `json:"category"`
		PaymentMethod string  `json:"payment_method"`
		ExpenseDate   string  `json:"expense_date"`
		Date          string  `json:"date"`
		Description   string  `json:"description"`
		Notes         string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		utils.RespondValidationError(c, "Jumlah pengeluaran harus lebih dari 0")
		return
	}

	name := req.Name
	if name == "" {
		name = req.Title
	}
	if name == "" {
		name = req.Description
	}
	if name == "" {
		name = "Pengeluaran"
	}

	dateStr := req.ExpenseDate
	if dateStr == "" {
		dateStr = req.Date
	}
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	paymentMethod := req.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = "cash"
	}

	id := utils.GenerateUUID()
	_, err := database.DB.Exec(`
		INSERT INTO expenses (
			id, user_id, category_id, category, name, title, amount, date, expense_date, payment_method, description, notes
		) VALUES (
			$1, $2, NULLIF($3, ''), $4, $5, $5, $6, $7::date, $7::date, $8, $9, $10
		)
	`, id, tenantID, req.CategoryID, req.Category, name, req.Amount, dateStr, paymentMethod, req.Description, req.Notes)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "amount": req.Amount, "name": name})
}

func (h *FinanceHandler) UpdateExpense(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}
	id := c.Param("id")

	var req struct {
		Name          string  `json:"name"`
		Title         string  `json:"title"`
		Amount        float64 `json:"amount"`
		CategoryID    string  `json:"category_id"`
		Category      string  `json:"category"`
		PaymentMethod string  `json:"payment_method"`
		ExpenseDate   string  `json:"expense_date"`
		Date          string  `json:"date"`
		Description   string  `json:"description"`
		Notes         string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Invalid data")
		return
	}

	name := req.Name
	if name == "" {
		name = req.Title
	}
	if name == "" {
		name = req.Description
	}
	if name == "" {
		name = "Pengeluaran"
	}

	dateStr := req.ExpenseDate
	if dateStr == "" {
		dateStr = req.Date
	}
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	paymentMethod := req.PaymentMethod
	if paymentMethod == "" {
		paymentMethod = "cash"
	}

	_, err := database.DB.Exec(`
		UPDATE expenses
		SET category_id = NULLIF($1, ''), category = $2, name = $3, title = $3, amount = $4,
		    date = $5::date, expense_date = $5::date, payment_method = $6, description = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
		WHERE id = $9 AND (user_id = $10 OR user_id = $11)
	`, req.CategoryID, req.Category, name, req.Amount, dateStr, paymentMethod, req.Description, req.Notes, id, tenantID, userID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Expense updated", gin.H{"success": true})
}

func (h *FinanceHandler) DeleteExpense(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM expenses WHERE id = $1 AND (user_id = $2 OR user_id = $3)", id, tenantID, userID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Expense deleted", gin.H{"success": true})
}

// -------------------------------------------------------------
// INCOMES & COSTS
// -------------------------------------------------------------

type IncomeRow struct {
	ID            string     `json:"id" db:"id"`
	UserID        string     `json:"user_id" db:"user_id"`
	Title         *string    `json:"title" db:"title"`
	ClientName    *string    `json:"client_name" db:"client_name"`
	ProjectName   *string    `json:"project_name" db:"project_name"`
	Description   *string    `json:"description" db:"description"`
	Amount        float64    `json:"amount" db:"amount"`
	Status        string     `json:"status" db:"status"`
	PaymentMethod *string    `json:"payment_method" db:"payment_method"`
	IncomeDate    *time.Time `json:"income_date" db:"income_date"`
	DueDate       *time.Time `json:"due_date" db:"due_date"`
	PaidDate      *time.Time `json:"paid_date" db:"paid_date"`
	Category      *string    `json:"category" db:"category"`
	Notes         *string    `json:"notes" db:"notes"`
	TotalCosts    float64    `json:"total_costs" db:"total_costs"`
	NetIncome     float64    `json:"net_income" db:"net_income"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

type IncomeCostRow struct {
	ID          string    `json:"id" db:"id"`
	IncomeID    string    `json:"income_id" db:"income_id"`
	Description string    `json:"description" db:"description"`
	Amount      float64   `json:"amount" db:"amount"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

func (h *FinanceHandler) GetIncomes(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var list []IncomeRow
	err := database.DB.Select(&list, `
		SELECT i.id, i.user_id, i.title, i.client_name, i.project_name, i.description,
		       i.amount, COALESCE(i.status, 'paid') as status, i.payment_method, i.income_date,
		       i.due_date, i.paid_date, i.category, i.notes, i.created_at, i.updated_at,
		       COALESCE((SELECT SUM(amount) FROM income_costs WHERE income_id = i.id), 0) as total_costs,
		       (i.amount - COALESCE((SELECT SUM(amount) FROM income_costs WHERE income_id = i.id), 0)) as net_income
		FROM incomes i
		WHERE i.user_id = $1
		ORDER BY i.created_at DESC
	`, tenantID)

	if err != nil {
		c.JSON(http.StatusOK, []IncomeRow{})
		return
	}
	if list == nil {
		list = []IncomeRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinanceHandler) GetIncomeSummary(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	period := c.Query("period")
	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")

	ranges := utils.GetWIBDateRanges()
	var startStr, endStr string

	if fromDate != "" && toDate != "" {
		startStr = fromDate
		endStr = toDate
	} else {
		switch period {
		case "today":
			startStr = ranges.TodayStart[:10]
			endStr = ranges.TodayEnd[:10]
		case "week":
			startStr = ranges.Last7DaysStart[:10]
			endStr = ranges.TodayEnd[:10]
		case "last_month":
			startStr = ranges.LastMonthStart[:10]
			endStr = ranges.LastMonthEnd[:10]
		case "year":
			startStr = ranges.YearStart[:10]
			endStr = ranges.YearEnd[:10]
		default: // "month"
			startStr = ranges.MonthStart[:10]
			endStr = ranges.MonthEnd[:10]
		}
	}

	type IncomeTotal struct {
		TotalCount    int     `json:"total_count" db:"total_count"`
		TotalAmount   float64 `json:"total_amount" db:"total_amount"`
		PaidAmount    float64 `json:"paid_amount" db:"paid_amount"`
		PendingAmount float64 `json:"pending_amount" db:"pending_amount"`
	}

	var totals IncomeTotal
	_ = database.DB.Get(&totals, `
		SELECT 
			COUNT(*) as total_count,
			COALESCE(SUM(amount), 0) as total_amount,
			COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
			COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount
		FROM incomes
		WHERE user_id = $1 AND (income_date BETWEEN $2::date AND $3::date OR created_at::date BETWEEN $2::date AND $3::date)
	`, tenantID, startStr, endStr)

	type CategoryStat struct {
		Category string  `json:"category" db:"category"`
		Total    float64 `json:"total" db:"total"`
		Count    int     `json:"count" db:"count"`
	}

	var byCat []CategoryStat
	_ = database.DB.Select(&byCat, `
		SELECT COALESCE(NULLIF(category, ''), 'Umum') as category,
		       COALESCE(SUM(amount), 0) as total,
		       COUNT(*) as count
		FROM incomes
		WHERE user_id = $1 AND status = 'paid'
		  AND (income_date BETWEEN $2::date AND $3::date OR created_at::date BETWEEN $2::date AND $3::date)
		GROUP BY category
		ORDER BY total DESC
	`, tenantID, startStr, endStr)

	if byCat == nil {
		byCat = []CategoryStat{}
	}

	c.JSON(http.StatusOK, gin.H{
		"total_count":    totals.TotalCount,
		"total_amount":   totals.TotalAmount,
		"paid_amount":    totals.PaidAmount,
		"pending_amount": totals.PendingAmount,
		"byCategory":     byCat,
	})
}

func (h *FinanceHandler) GetIncomeByID(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var inc IncomeRow
	err := database.DB.Get(&inc, `
		SELECT i.id, i.user_id, i.title, i.client_name, i.project_name, i.description,
		       i.amount, COALESCE(i.status, 'paid') as status, i.payment_method, i.income_date,
		       i.due_date, i.paid_date, i.category, i.notes, i.created_at, i.updated_at,
		       COALESCE((SELECT SUM(amount) FROM income_costs WHERE income_id = i.id), 0) as total_costs,
		       (i.amount - COALESCE((SELECT SUM(amount) FROM income_costs WHERE income_id = i.id), 0)) as net_income
		FROM incomes i
		WHERE i.id = $1 AND i.user_id = $2
	`, id, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "Income not found")
		return
	}

	var costs []IncomeCostRow
	_ = database.DB.Select(&costs, "SELECT id, income_id, description, amount, created_at FROM income_costs WHERE income_id = $1", id)
	if costs == nil {
		costs = []IncomeCostRow{}
	}

	c.JSON(http.StatusOK, gin.H{
		"income": inc,
		"costs":  costs,
	})
}

func (h *FinanceHandler) CreateIncome(c *gin.Context) {
	tenantID := c.GetString("tenantId")

	var req struct {
		Title         string  `json:"title"`
		ClientName    string  `json:"client_name"`
		ProjectName   string  `json:"project_name"`
		Description   string  `json:"description"`
		Amount        float64 `json:"amount"`
		Status        string  `json:"status"`
		PaymentMethod string  `json:"payment_method"`
		IncomeDate    string  `json:"income_date"`
		DueDate       string  `json:"due_date"`
		Category      string  `json:"category"`
		Notes         string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		utils.RespondValidationError(c, "Jumlah pendapatan harus lebih dari 0")
		return
	}

	id := utils.GenerateUUID()
	status := req.Status
	if status == "" {
		status = "paid"
	}
	incDate := req.IncomeDate
	if incDate == "" {
		incDate = time.Now().Format("2006-01-02")
	}

	_, err := database.DB.Exec(`
		INSERT INTO incomes (
			id, user_id, title, client_name, project_name, description, amount, status,
			payment_method, income_date, due_date, category, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10::date, NULLIF($11, '')::date, $12, $13
		)
	`, id, tenantID, req.Title, req.ClientName, req.ProjectName, req.Description, req.Amount, status,
		req.PaymentMethod, incDate, req.DueDate, req.Category, req.Notes)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "amount": req.Amount, "title": req.Title})
}

func (h *FinanceHandler) UpdateIncome(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	var req struct {
		Title         string  `json:"title"`
		ClientName    string  `json:"client_name"`
		ProjectName   string  `json:"project_name"`
		Description   string  `json:"description"`
		Amount        float64 `json:"amount"`
		Status        string  `json:"status"`
		PaymentMethod string  `json:"payment_method"`
		IncomeDate    string  `json:"income_date"`
		DueDate       string  `json:"due_date"`
		PaidDate      string  `json:"paid_date"`
		Category      string  `json:"category"`
		Notes         string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Invalid data")
		return
	}

	_, err := database.DB.Exec(`
		UPDATE incomes
		SET title = $1, client_name = $2, project_name = $3, description = $4, amount = $5,
		    status = $6, payment_method = $7, income_date = NULLIF($8, '')::date, due_date = NULLIF($9, '')::date,
		    paid_date = NULLIF($10, '')::date, category = $11, notes = $12, updated_at = CURRENT_TIMESTAMP
		WHERE id = $13 AND user_id = $14
	`, req.Title, req.ClientName, req.ProjectName, req.Description, req.Amount,
		req.Status, req.PaymentMethod, req.IncomeDate, req.DueDate,
		req.PaidDate, req.Category, req.Notes, id, tenantID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Income updated", gin.H{"success": true})
}

func (h *FinanceHandler) DeleteIncome(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	id := c.Param("id")

	_, _ = database.DB.Exec("DELETE FROM income_costs WHERE income_id = $1", id)
	_, err := database.DB.Exec("DELETE FROM incomes WHERE id = $1 AND user_id = $2", id, tenantID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Income deleted", gin.H{"success": true})
}

func (h *FinanceHandler) GetIncomeCosts(c *gin.Context) {
	incomeID := c.Param("id")

	var list []IncomeCostRow
	err := database.DB.Select(&list, "SELECT id, income_id, description, amount, created_at FROM income_costs WHERE income_id = $1 ORDER BY created_at ASC", incomeID)
	if err != nil {
		c.JSON(http.StatusOK, []IncomeCostRow{})
		return
	}
	if list == nil {
		list = []IncomeCostRow{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinanceHandler) CreateIncomeCost(c *gin.Context) {
	incomeID := c.Param("id")

	var req struct {
		Description string  `json:"description"`
		Amount      float64 `json:"amount"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 || req.Description == "" {
		utils.RespondValidationError(c, "Deskripsi dan jumlah biaya wajib diisi")
		return
	}

	id := utils.GenerateUUID()
	_, err := database.DB.Exec("INSERT INTO income_costs (id, income_id, description, amount) VALUES ($1, $2, $3, $4)", id, incomeID, req.Description, req.Amount)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "income_id": incomeID, "description": req.Description, "amount": req.Amount})
}

func (h *FinanceHandler) UpdateIncomeCost(c *gin.Context) {
	costID := c.Param("costId")

	var req struct {
		Description string  `json:"description"`
		Amount      float64 `json:"amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Invalid data")
		return
	}

	_, err := database.DB.Exec("UPDATE income_costs SET description = $1, amount = $2 WHERE id = $3", req.Description, req.Amount, costID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Income cost updated", gin.H{"success": true})
}

func (h *FinanceHandler) DeleteIncomeCost(c *gin.Context) {
	costID := c.Param("costId")

	_, err := database.DB.Exec("DELETE FROM income_costs WHERE id = $1", costID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Income cost deleted", gin.H{"success": true})
}

// -------------------------------------------------------------
// PROFIT SHARING & REINVESTMENT
// -------------------------------------------------------------

type ProfitSharingSettings struct {
	ID                string  `json:"id" db:"id"`
	UserID            string  `json:"user_id" db:"user_id"`
	OwnerPercentage   float64 `json:"owner_percentage" db:"owner_percentage"`
	ManagerPercentage float64 `json:"manager_percentage" db:"manager_percentage"`
	StorePercentage   float64 `json:"store_percentage" db:"store_percentage"`
	OwnerName         string  `json:"owner_name" db:"owner_name"`
	ManagerName       string  `json:"manager_name" db:"manager_name"`
}

func (h *FinanceHandler) GetProfitSharingSettings(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	type SettingRow struct {
		ID                string  `json:"id" db:"id"`
		UserID            string  `json:"user_id" db:"user_id"`
		TenantID          *string `json:"tenant_id" db:"tenant_id"`
		OwnerPercentage   float64 `json:"owner_percentage" db:"owner_percentage"`
		ManagerPercentage float64 `json:"manager_percentage" db:"manager_percentage"`
		StorePercentage   float64 `json:"store_percentage" db:"store_percentage"`
		OwnerName         string  `json:"owner_name" db:"owner_name"`
		ManagerName       string  `json:"manager_name" db:"manager_name"`
	}

	var s SettingRow
	err := database.DB.Get(&s, `
		SELECT 
			id, COALESCE(user_id, tenant_id, '') as user_id, tenant_id,
			COALESCE(owner_percentage, 40) as owner_percentage,
			COALESCE(manager_percentage, 30) as manager_percentage,
			COALESCE(store_percentage, 30) as store_percentage,
			COALESCE(owner_name, 'Owner') as owner_name,
			COALESCE(manager_name, 'Pengelola') as manager_name
		FROM profit_sharing_settings 
		WHERE user_id = $1 OR tenant_id = $1 OR user_id = $2 OR tenant_id = $2
		LIMIT 1
	`, tenantID, userID)

	if err != nil || (s.OwnerPercentage == 0 && s.ManagerPercentage == 0 && s.StorePercentage == 0) {
		c.JSON(http.StatusOK, gin.H{
			"id":                 "default",
			"user_id":            tenantID,
			"owner_percentage":   40,
			"manager_percentage": 30,
			"store_percentage":   30,
			"owner_name":         "Owner",
			"manager_name":       "Pengelola",
		})
		return
	}
	c.JSON(http.StatusOK, s)
}

func (h *FinanceHandler) UpdateProfitSharingSettings(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	if tenantID == "" && userID == "" {
		utils.RespondError(c, http.StatusUnauthorized, "Sesi autentikasi tidak valid, silakan login ulang")
		return
	}

	var req struct {
		OwnerPercentage   float64 `json:"owner_percentage"`
		ManagerPercentage float64 `json:"manager_percentage"`
		StorePercentage   float64 `json:"store_percentage"`
		OwnerName         string  `json:"owner_name"`
		ManagerName       string  `json:"manager_name"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Data pengaturan tidak valid: "+err.Error())
		return
	}

	total := req.OwnerPercentage + req.ManagerPercentage + req.StorePercentage
	if math.Abs(total-100) > 0.01 {
		utils.RespondError(c, http.StatusBadRequest, "Total persentase bagi hasil harus berjumlah 100%")
		return
	}

	if req.OwnerName == "" {
		req.OwnerName = "Owner"
	}
	if req.ManagerName == "" {
		req.ManagerName = "Pengelola"
	}

	// Check if already exists
	var existingID string
	_ = database.DB.Get(&existingID, `
		SELECT id FROM profit_sharing_settings 
		WHERE user_id = $1 OR tenant_id = $1 OR user_id = $2 OR tenant_id = $2
		LIMIT 1
	`, tenantID, userID)

	if existingID != "" {
		_, err := database.DB.Exec(`
			UPDATE profit_sharing_settings
			SET owner_percentage = $1, manager_percentage = $2, store_percentage = $3,
			    owner_name = $4, manager_name = $5,
			    user_id = $6, tenant_id = $7,
			    updated_at = CURRENT_TIMESTAMP
			WHERE id = $8
		`, req.OwnerPercentage, req.ManagerPercentage, req.StorePercentage, req.OwnerName, req.ManagerName, userID, tenantID, existingID)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, "Gagal memperbarui pengaturan: "+err.Error())
			return
		}
	} else {
		newID := utils.GenerateUUID()
		_, err := database.DB.Exec(`
			INSERT INTO profit_sharing_settings (
				id, user_id, tenant_id, owner_percentage, manager_percentage, store_percentage, owner_name, manager_name, is_active, period_type, total_shares
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, true, 'monthly', 100
			)
		`, newID, userID, tenantID, req.OwnerPercentage, req.ManagerPercentage, req.StorePercentage, req.OwnerName, req.ManagerName)
		if err != nil {
			// Fallback update if constraint hit
			_, err = database.DB.Exec(`
				UPDATE profit_sharing_settings
				SET owner_percentage = $1, manager_percentage = $2, store_percentage = $3,
				    owner_name = $4, manager_name = $5, tenant_id = $6, updated_at = CURRENT_TIMESTAMP
				WHERE user_id = $7 OR tenant_id = $7
			`, req.OwnerPercentage, req.ManagerPercentage, req.StorePercentage, req.OwnerName, req.ManagerName, tenantID, userID)
			if err != nil {
				utils.RespondError(c, http.StatusInternalServerError, "Gagal menyimpan pengaturan: "+err.Error())
				return
			}
		}
	}

	utils.RespondSuccess(c, "Pengaturan bagi hasil berhasil disimpan", gin.H{"success": true})
}

func (h *FinanceHandler) CalculateProfitSharing(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	monthStr := c.Query("period_month")
	yearStr := c.Query("period_year")

	month, _ := strconv.Atoi(monthStr)
	year, _ := strconv.Atoi(yearStr)
	if month == 0 || year == 0 {
		now := time.Now()
		month = int(now.Month())
		year = now.Year()
	}

	startDate := fmt.Sprintf("%04d-%02d-01", year, month)
	firstOfNextMonth := time.Date(year, time.Month(month)+1, 1, 0, 0, 0, 0, time.UTC)
	lastDayOfMonth := firstOfNextMonth.Add(-24 * time.Hour)
	endDate := lastDayOfMonth.Format("2006-01-02")

	// 1. Calculate Sales Revenue
	var posSales float64
	_ = database.DB.Get(&posSales, `
		SELECT COALESCE(SUM(total), 0) FROM transactions
		WHERE (user_id = $1 OR user_id = $2)
		  AND status NOT IN ('void', 'cancelled')
		  AND (created_at::date BETWEEN $3::date AND $4::date)
	`, tenantID, userID, startDate, endDate)

	var incomeRevenue float64
	_ = database.DB.Get(&incomeRevenue, `
		SELECT COALESCE(SUM(amount), 0) FROM incomes
		WHERE (user_id = $1 OR user_id = $2) AND status = 'paid'
		  AND (COALESCE(income_date, date, created_at::date) BETWEEN $3::date AND $4::date)
	`, tenantID, userID, startDate, endDate)

	totalRevenue := posSales + incomeRevenue

	// 2. Calculate COGS / HPP (Biaya Modal Produk)
	var posCOGS float64
	_ = database.DB.Get(&posCOGS, `
		SELECT COALESCE(SUM(ti.quantity * 
			CASE 
				WHEN COALESCE(ti.cost_price, 0) > 0 THEN ti.cost_price 
				ELSE COALESCE(p.cost, 0) 
			END
		), 0)
		FROM transaction_items ti
		JOIN transactions t ON ti.transaction_id = t.id
		LEFT JOIN products p ON ti.product_id = p.id
		WHERE (t.user_id = $1 OR t.user_id = $2)
		  AND t.status NOT IN ('void', 'cancelled')
		  AND (t.created_at::date BETWEEN $3::date AND $4::date)
	`, tenantID, userID, startDate, endDate)

	var incomeCosts float64
	_ = database.DB.Get(&incomeCosts, `
		SELECT COALESCE(SUM(ic.amount), 0)
		FROM income_costs ic
		JOIN incomes i ON ic.income_id = i.id
		WHERE (i.user_id = $1 OR i.user_id = $2)
		  AND (COALESCE(i.income_date, i.date, i.created_at::date) BETWEEN $3::date AND $4::date)
	`, tenantID, userID, startDate, endDate)

	cogsCosts := posCOGS + incomeCosts

	// 3. Calculate General Shop Expenses (Pengeluaran Operasional Toko)
	var generalExpenses float64
	_ = database.DB.Get(&generalExpenses, `
		SELECT COALESCE(SUM(amount), 0) FROM expenses
		WHERE (user_id = $1 OR user_id = $2)
		  AND (COALESCE(expense_date, date, created_at::date) BETWEEN $3::date AND $4::date)
	`, tenantID, userID, startDate, endDate)

	// Laba Bersih = Pendapatan - HPP (Biaya Modal) - Pengeluaran Toko
	netProfit := totalRevenue - cogsCosts - generalExpenses
	if netProfit < 0 {
		netProfit = 0
	}

	type SettingRow struct {
		ID                string  `json:"id" db:"id"`
		UserID            string  `json:"user_id" db:"user_id"`
		OwnerPercentage   float64 `json:"owner_percentage" db:"owner_percentage"`
		ManagerPercentage float64 `json:"manager_percentage" db:"manager_percentage"`
		StorePercentage   float64 `json:"store_percentage" db:"store_percentage"`
		OwnerName         string  `json:"owner_name" db:"owner_name"`
		ManagerName       string  `json:"manager_name" db:"manager_name"`
	}

	var s SettingRow
	_ = database.DB.Get(&s, `
		SELECT 
			id, COALESCE(user_id, tenant_id, '') as user_id,
			COALESCE(owner_percentage, 40) as owner_percentage,
			COALESCE(manager_percentage, 30) as manager_percentage,
			COALESCE(store_percentage, 30) as store_percentage,
			COALESCE(owner_name, 'Owner') as owner_name,
			COALESCE(manager_name, 'Pengelola') as manager_name
		FROM profit_sharing_settings 
		WHERE user_id = $1 OR tenant_id = $1 OR user_id = $2 OR tenant_id = $2
		LIMIT 1
	`, tenantID, userID)

	if s.OwnerPercentage == 0 && s.ManagerPercentage == 0 && s.StorePercentage == 0 {
		s.OwnerPercentage = 40
		s.ManagerPercentage = 30
		s.StorePercentage = 30
		s.OwnerName = "Owner"
		s.ManagerName = "Pengelola"
	}

	ownerShare := (netProfit * s.OwnerPercentage) / 100
	managerShare := (netProfit * s.ManagerPercentage) / 100
	storeShare := (netProfit * s.StorePercentage) / 100

	c.JSON(http.StatusOK, gin.H{
		"period_month":       month,
		"period_year":        year,
		"total_revenue":      totalRevenue,
		"total_costs":        cogsCosts,       // HPP / Biaya Modal Produk
		"total_expenses":     generalExpenses, // Pengeluaran Toko
		"pos_cogs":           posCOGS,
		"net_profit":         netProfit,
		"owner_percentage":   s.OwnerPercentage,
		"manager_percentage": s.ManagerPercentage,
		"store_percentage":   s.StorePercentage,
		"owner_amount":       ownerShare,
		"owner_share":        ownerShare,
		"manager_amount":     managerShare,
		"manager_share":      managerShare,
		"store_amount":       storeShare,
		"store_share":        storeShare,
		"settings":           s,
	})
}

func (h *FinanceHandler) GetProfitDistributions(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	type DistRow struct {
		ID                string     `json:"id" db:"id"`
		UserID            string     `json:"user_id" db:"user_id"`
		TenantID          *string    `json:"tenant_id" db:"tenant_id"`
		PeriodMonth       int        `json:"period_month" db:"period_month"`
		PeriodYear        int        `json:"period_year" db:"period_year"`
		TotalRevenue      float64    `json:"total_revenue" db:"total_revenue"`
		TotalCosts        float64    `json:"total_costs" db:"total_costs"`
		TotalExpenses     float64    `json:"total_expenses" db:"total_expenses"`
		NetProfit         float64    `json:"net_profit" db:"net_profit"`
		OwnerAmount       float64    `json:"owner_amount" db:"owner_amount"`
		OwnerShare        float64    `json:"owner_share" db:"owner_amount"`
		ManagerAmount     float64    `json:"manager_amount" db:"manager_amount"`
		ManagerShare      float64    `json:"manager_share" db:"manager_amount"`
		StoreAmount       float64    `json:"store_amount" db:"store_amount"`
		StoreShare        float64    `json:"store_share" db:"store_amount"`
		OwnerPercentage   float64    `json:"owner_percentage" db:"owner_percentage"`
		ManagerPercentage float64    `json:"manager_percentage" db:"manager_percentage"`
		StorePercentage   float64    `json:"store_percentage" db:"store_percentage"`
		OwnerPaid         bool       `json:"owner_paid" db:"owner_paid"`
		ManagerPaid       bool       `json:"manager_paid" db:"manager_paid"`
		OwnerPaidDate     *time.Time `json:"owner_paid_date" db:"owner_paid_date"`
		ManagerPaidDate   *time.Time `json:"manager_paid_date" db:"manager_paid_date"`
		Notes             *string    `json:"notes" db:"notes"`
		CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	}

	var list []DistRow
	err := database.DB.Select(&list, `
		SELECT 
			id, user_id, COALESCE(tenant_id, user_id) as tenant_id,
			period_month, COALESCE(period_year, 2026) as period_year,
			COALESCE(total_revenue, 0) as total_revenue,
			COALESCE(total_costs, 0) as total_costs,
			COALESCE(total_expenses, 0) as total_expenses,
			COALESCE(net_profit, 0) as net_profit,
			COALESCE(owner_amount, 0) as owner_amount,
			COALESCE(manager_amount, 0) as manager_amount,
			COALESCE(store_amount, 0) as store_amount,
			COALESCE(owner_percentage, 40) as owner_percentage,
			COALESCE(manager_percentage, 30) as manager_percentage,
			COALESCE(store_percentage, 30) as store_percentage,
			COALESCE(owner_paid, false) as owner_paid,
			COALESCE(manager_paid, false) as manager_paid,
			owner_paid_date, manager_paid_date, notes, created_at
		FROM profit_distributions 
		WHERE user_id = $1 OR tenant_id = $1 OR user_id = $2 OR tenant_id = $2
		ORDER BY period_year DESC, period_month DESC, created_at DESC
	`, tenantID, userID)
	if err != nil {
		c.JSON(http.StatusOK, []DistRow{})
		return
	}
	if list == nil {
		list = []DistRow{}
	}
	for i := range list {
		list[i].OwnerShare = list[i].OwnerAmount
		list[i].ManagerShare = list[i].ManagerAmount
		list[i].StoreShare = list[i].StoreAmount
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinanceHandler) CreateProfitDistribution(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	var req struct {
		PeriodMonth       int      `json:"period_month"`
		PeriodYear        int      `json:"period_year"`
		TotalRevenue      float64  `json:"total_revenue"`
		TotalCosts        float64  `json:"total_costs"`
		TotalExpenses     float64  `json:"total_expenses"`
		NetProfit         float64  `json:"net_profit"`
		OwnerAmount       *float64 `json:"owner_amount"`
		OwnerShare        *float64 `json:"owner_share"`
		ManagerAmount     *float64 `json:"manager_amount"`
		ManagerShare      *float64 `json:"manager_share"`
		StoreAmount       *float64 `json:"store_amount"`
		StoreShare        *float64 `json:"store_share"`
		OwnerPercentage   float64  `json:"owner_percentage"`
		ManagerPercentage float64  `json:"manager_percentage"`
		StorePercentage   float64  `json:"store_percentage"`
		Notes             string   `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, "Data distribusi tidak valid: "+err.Error())
		return
	}

	ownerAmt := 0.0
	if req.OwnerAmount != nil {
		ownerAmt = *req.OwnerAmount
	} else if req.OwnerShare != nil {
		ownerAmt = *req.OwnerShare
	}

	managerAmt := 0.0
	if req.ManagerAmount != nil {
		managerAmt = *req.ManagerAmount
	} else if req.ManagerShare != nil {
		managerAmt = *req.ManagerShare
	}

	storeAmt := 0.0
	if req.StoreAmount != nil {
		storeAmt = *req.StoreAmount
	} else if req.StoreShare != nil {
		storeAmt = *req.StoreShare
	}

	id := utils.GenerateUUID()
	_, err := database.DB.Exec(`
		INSERT INTO profit_distributions (
			id, user_id, tenant_id, period_month, period_year, total_revenue, total_costs, total_expenses, net_profit,
			owner_amount, manager_amount, store_amount, owner_percentage, manager_percentage, store_percentage, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
		)
	`, id, userID, tenantID, req.PeriodMonth, req.PeriodYear, req.TotalRevenue, req.TotalCosts, req.TotalExpenses, req.NetProfit,
		ownerAmt, managerAmt, storeAmt, req.OwnerPercentage, req.ManagerPercentage, req.StorePercentage, req.Notes)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "Gagal menyimpan riwayat bagi hasil: "+err.Error())
		return
	}

	// Auto-add store amount to reinvestment balance if > 0
	if storeAmt > 0 {
		_, _ = database.DB.Exec(`
			INSERT INTO reinvestment_balance (id, tenant_id, user_id, current_balance, total_balance, total_added)
			VALUES ($1, $2, $3, $4, $4, $4)
			ON CONFLICT (tenant_id) DO UPDATE
			SET current_balance = COALESCE(reinvestment_balance.current_balance, reinvestment_balance.total_balance, 0) + $4,
			    total_balance = COALESCE(reinvestment_balance.total_balance, reinvestment_balance.current_balance, 0) + $4,
			    total_added = COALESCE(reinvestment_balance.total_added, 0) + $4,
			    updated_at = CURRENT_TIMESTAMP
		`, utils.GenerateUUID(), tenantID, userID, storeAmt)

		_, _ = database.DB.Exec(`
			INSERT INTO reinvestment_transactions (id, tenant_id, user_id, type, amount, description, reference_id, reference_type, transaction_date)
			VALUES ($1, $2, $3, 'in', $4, $5, $6, 'profit_distribution', CURRENT_DATE)
		`, utils.GenerateUUID(), tenantID, userID, storeAmt, fmt.Sprintf("Bagi hasil toko periode %d/%d", req.PeriodMonth, req.PeriodYear), id)
	}

	utils.RespondSuccess(c, "Distribusi bagi hasil berhasil disimpan", gin.H{"id": id})
}

func (h *FinanceHandler) UpdateDistributionPayment(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}
	id := c.Param("id")

	var req struct {
		OwnerPaid   bool `json:"owner_paid"`
		ManagerPaid bool `json:"manager_paid"`
	}
	_ = c.ShouldBindJSON(&req)

	_, err := database.DB.Exec(`
		UPDATE profit_distributions
		SET owner_paid = $1, manager_paid = $2,
		    owner_paid_date = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE owner_paid_date END,
		    manager_paid_date = CASE WHEN $2 = true THEN CURRENT_TIMESTAMP ELSE manager_paid_date END
		WHERE id = $3 AND (user_id = $4 OR tenant_id = $4 OR user_id = $5 OR tenant_id = $5)
	`, req.OwnerPaid, req.ManagerPaid, id, tenantID, userID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Payment status updated", gin.H{"success": true})
}

func (h *FinanceHandler) DeleteProfitDistribution(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM profit_distributions WHERE id = $1 AND (user_id = $2 OR tenant_id = $2 OR user_id = $3 OR tenant_id = $3)", id, tenantID, userID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Distribution deleted", gin.H{"success": true})
}

// -------------------------------------------------------------
// REINVESTMENT
// -------------------------------------------------------------

type ReinvestmentBalance struct {
	ID             string    `json:"id" db:"id"`
	TenantID       *string   `json:"tenant_id" db:"tenant_id"`
	UserID         *string   `json:"user_id" db:"user_id"`
	CurrentBalance float64   `json:"current_balance" db:"current_balance"`
	TotalBalance   float64   `json:"total_balance" db:"total_balance"`
	TotalAdded     float64   `json:"total_added" db:"total_added"`
	TotalUsed      float64   `json:"total_used" db:"total_used"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

type ReinvestmentTx struct {
	ID              string    `json:"id" db:"id"`
	TenantID        *string   `json:"tenant_id" db:"tenant_id"`
	UserID          *string   `json:"user_id" db:"user_id"`
	Type            string    `json:"type" db:"type"`
	Amount          float64   `json:"amount" db:"amount"`
	Category        *string   `json:"category" db:"category"`
	Description     string    `json:"description" db:"description"`
	Notes           *string   `json:"notes" db:"notes"`
	ReferenceID     *string   `json:"reference_id" db:"reference_id"`
	ReferenceType   *string   `json:"reference_type" db:"reference_type"`
	TransactionDate time.Time `json:"transaction_date" db:"transaction_date"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

func (h *FinanceHandler) GetReinvestmentBalance(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	var b ReinvestmentBalance
	err := database.DB.Get(&b, `
		SELECT 
			id, tenant_id, user_id,
			COALESCE(current_balance, total_balance, 0) as current_balance,
			COALESCE(total_balance, current_balance, 0) as total_balance,
			COALESCE(total_added, 0) as total_added,
			COALESCE(total_used, 0) as total_used,
			updated_at
		FROM reinvestment_balance 
		WHERE tenant_id = $1 OR user_id = $1 OR tenant_id = $2 OR user_id = $2
		LIMIT 1
	`, tenantID, userID)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"current_balance": 0,
			"total_balance":   0,
			"total_added":     0,
			"total_used":      0,
		})
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *FinanceHandler) GetReinvestmentTransactions(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	var list []ReinvestmentTx
	err := database.DB.Select(&list, `
		SELECT 
			id, tenant_id, user_id, type, amount, category, 
			COALESCE(description, '') as description, 
			notes, reference_id, reference_type, 
			COALESCE(transaction_date, created_at::date) as transaction_date, 
			created_at
		FROM reinvestment_transactions 
		WHERE tenant_id = $1 OR user_id = $1 OR tenant_id = $2 OR user_id = $2
		ORDER BY created_at DESC
	`, tenantID, userID)

	if err != nil {
		c.JSON(http.StatusOK, []ReinvestmentTx{})
		return
	}
	if list == nil {
		list = []ReinvestmentTx{}
	}
	c.JSON(http.StatusOK, list)
}

func (h *FinanceHandler) GetReinvestmentSummary(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	var balance ReinvestmentBalance
	_ = database.DB.Get(&balance, `
		SELECT 
			id, tenant_id, user_id,
			COALESCE(current_balance, total_balance, 0) as current_balance,
			COALESCE(total_balance, current_balance, 0) as total_balance,
			COALESCE(total_added, 0) as total_added,
			COALESCE(total_used, 0) as total_used,
			updated_at
		FROM reinvestment_balance 
		WHERE tenant_id = $1 OR user_id = $1 OR tenant_id = $2 OR user_id = $2
		LIMIT 1
	`, tenantID, userID)

	var recentTx []ReinvestmentTx
	_ = database.DB.Select(&recentTx, `
		SELECT 
			id, tenant_id, user_id, type, amount, category, 
			COALESCE(description, '') as description, 
			notes, reference_id, reference_type, 
			COALESCE(transaction_date, created_at::date) as transaction_date, 
			created_at
		FROM reinvestment_transactions 
		WHERE tenant_id = $1 OR user_id = $1 OR tenant_id = $2 OR user_id = $2
		ORDER BY created_at DESC 
		LIMIT 10
	`, tenantID, userID)
	if recentTx == nil {
		recentTx = []ReinvestmentTx{}
	}

	c.JSON(http.StatusOK, gin.H{
		"balance":      balance,
		"transactions": recentTx,
	})
}

func (h *FinanceHandler) UseReinvestment(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	var req struct {
		Amount          float64 `json:"amount"`
		Category        string  `json:"category"`
		Description     string  `json:"description"`
		Notes           string  `json:"notes"`
		TransactionDate string  `json:"transaction_date"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 || req.Description == "" {
		utils.RespondValidationError(c, "Jumlah dana dan deskripsi wajib diisi")
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	var currBal float64
	_ = tx.Get(&currBal, `
		SELECT COALESCE(current_balance, total_balance, 0) 
		FROM reinvestment_balance 
		WHERE tenant_id = $1 OR user_id = $1 OR tenant_id = $2 OR user_id = $2
		LIMIT 1
	`, tenantID, userID)
	if currBal < req.Amount {
		utils.RespondError(c, http.StatusBadRequest, "Saldo dana reinvestasi tidak mencukupi")
		return
	}

	_, err = tx.Exec(`
		UPDATE reinvestment_balance
		SET current_balance = COALESCE(current_balance, total_balance, 0) - $1,
		    total_balance = COALESCE(total_balance, current_balance, 0) - $1,
		    total_used = COALESCE(total_used, 0) + $1,
		    updated_at = CURRENT_TIMESTAMP
		WHERE tenant_id = $2 OR user_id = $2 OR tenant_id = $3 OR user_id = $3
	`, req.Amount, tenantID, userID)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	txDate := req.TransactionDate
	if txDate == "" {
		txDate = time.Now().Format("2006-01-02")
	}

	_, err = tx.Exec(`
		INSERT INTO reinvestment_transactions (id, tenant_id, user_id, type, amount, category, description, notes, transaction_date)
		VALUES ($1, $2, $3, 'out', $4, $5, $6, $7, $8::date)
	`, utils.GenerateUUID(), tenantID, userID, req.Amount, req.Category, req.Description, req.Notes, txDate)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Penggunaan dana reinvestasi berhasil dicatat", gin.H{"success": true})
}

func (h *FinanceHandler) AddManualReinvestment(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	var req struct {
		Amount          float64 `json:"amount"`
		Description     string  `json:"description"`
		Notes           string  `json:"notes"`
		TransactionDate string  `json:"transaction_date"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 || req.Description == "" {
		utils.RespondValidationError(c, "Jumlah dan deskripsi wajib diisi")
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO reinvestment_balance (id, tenant_id, user_id, current_balance, total_balance, total_added)
		VALUES ($1, $2, $3, $4, $4, $4)
		ON CONFLICT (tenant_id) DO UPDATE
		SET current_balance = COALESCE(reinvestment_balance.current_balance, reinvestment_balance.total_balance, 0) + $4,
		    total_balance = COALESCE(reinvestment_balance.total_balance, reinvestment_balance.current_balance, 0) + $4,
		    total_added = COALESCE(reinvestment_balance.total_added, 0) + $4,
		    updated_at = CURRENT_TIMESTAMP
	`, utils.GenerateUUID(), tenantID, userID, req.Amount)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	txDate := req.TransactionDate
	if txDate == "" {
		txDate = time.Now().Format("2006-01-02")
	}

	_, err = tx.Exec(`
		INSERT INTO reinvestment_transactions (id, tenant_id, user_id, type, amount, description, notes, transaction_date)
		VALUES ($1, $2, $3, 'in', $4, $5, $6, $7::date)
	`, utils.GenerateUUID(), tenantID, userID, req.Amount, req.Description, req.Notes, txDate)

	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Penambahan dana reinvestasi manual berhasil", gin.H{"success": true})
}

func (h *FinanceHandler) AddReinvestmentFromDistribution(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}

	var req struct {
		DistributionID string  `json:"distribution_id"`
		Amount         float64 `json:"amount"`
		Period         string  `json:"period"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		utils.RespondValidationError(c, "Invalid data")
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	// Check if already added by CreateProfitDistribution
	if req.DistributionID != "" {
		var count int
		_ = tx.Get(&count, "SELECT COUNT(*) FROM reinvestment_transactions WHERE reference_id = $1", req.DistributionID)
		if count > 0 {
			utils.RespondSuccess(c, "Reinvestment already recorded", gin.H{"success": true})
			return
		}
	}

	_, _ = tx.Exec(`
		INSERT INTO reinvestment_balance (id, tenant_id, user_id, current_balance, total_balance, total_added)
		VALUES ($1, $2, $3, $4, $4, $4)
		ON CONFLICT (tenant_id) DO UPDATE
		SET current_balance = COALESCE(reinvestment_balance.current_balance, reinvestment_balance.total_balance, 0) + $4,
		    total_balance = COALESCE(reinvestment_balance.total_balance, reinvestment_balance.current_balance, 0) + $4,
		    total_added = COALESCE(reinvestment_balance.total_added, 0) + $4,
		    updated_at = CURRENT_TIMESTAMP
	`, utils.GenerateUUID(), tenantID, userID, req.Amount)

	_, _ = tx.Exec(`
		INSERT INTO reinvestment_transactions (id, tenant_id, user_id, type, amount, description, reference_id, reference_type, transaction_date)
		VALUES ($1, $2, $3, 'in', $4, $5, $6, 'profit_distribution', CURRENT_DATE)
	`, utils.GenerateUUID(), tenantID, userID, req.Amount, fmt.Sprintf("Bagi hasil toko periode %s", req.Period), req.DistributionID)

	if err := tx.Commit(); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(c, "Reinvestment added from distribution", gin.H{"success": true})
}

func (h *FinanceHandler) UpdateReinvestmentTransaction(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}
	id := c.Param("id")

	var req struct {
		Description string `json:"description"`
		Notes       string `json:"notes"`
	}
	_ = c.ShouldBindJSON(&req)

	_, err := database.DB.Exec("UPDATE reinvestment_transactions SET description = $1, notes = $2 WHERE id = $3 AND (user_id = $4 OR tenant_id = $4 OR user_id = $5 OR tenant_id = $5)", req.Description, req.Notes, id, tenantID, userID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Transaction updated", gin.H{"success": true})
}

func (h *FinanceHandler) DeleteReinvestmentTransaction(c *gin.Context) {
	tenantID := c.GetString("tenantId")
	userID := c.GetString("userId")
	if tenantID == "" {
		tenantID = userID
	}
	if userID == "" {
		userID = tenantID
	}
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM reinvestment_transactions WHERE id = $1 AND (user_id = $2 OR tenant_id = $2 OR user_id = $3 OR tenant_id = $3)", id, tenantID, userID)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondSuccess(c, "Transaction deleted", gin.H{"success": true})
}

