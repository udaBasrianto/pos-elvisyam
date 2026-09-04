package database

import (
	"log"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

func AutoMigrate(db *sqlx.DB) error {
	queries := []string{
		// 1. registration_tokens
		`CREATE TABLE IF NOT EXISTS registration_tokens (
			id         VARCHAR(36) PRIMARY KEY,
			token      VARCHAR(50) NOT NULL UNIQUE,
			created_by VARCHAR(36),
			status     VARCHAR(20) DEFAULT 'unused',
			used_by    VARCHAR(36),
			used_at    TIMESTAMP,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// 2. users
		`CREATE TABLE IF NOT EXISTS users (
			id                       VARCHAR(36) PRIMARY KEY,
			email                    VARCHAR(255) NOT NULL UNIQUE,
			password                 VARCHAR(255) NOT NULL,
			full_name                VARCHAR(255),
			role                     VARCHAR(50) DEFAULT 'kasir',
			tenant_id                VARCHAR(36),
			shop_slug                VARCHAR(255),
			subscription_tier        VARCHAR(20) DEFAULT 'free',
			subscription_expires_at  TIMESTAMP,
			max_products             INT DEFAULT 100,
			max_transactions         INT DEFAULT 1000,
			created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
		`CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)`,

		// 3. user_roles
		`CREATE TABLE IF NOT EXISTS user_roles (
			id         VARCHAR(36) PRIMARY KEY,
			user_id    VARCHAR(36) NOT NULL,
			role       VARCHAR(50) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// 4. settings
		`CREATE TABLE IF NOT EXISTS settings (
			id                     VARCHAR(36) PRIMARY KEY,
			user_id                VARCHAR(36) NOT NULL UNIQUE,
			business_name          VARCHAR(255) DEFAULT 'Toko Saya',
			business_address       TEXT,
			business_phone         VARCHAR(50),
			business_email         VARCHAR(255),
			business_logo          TEXT,
			tax_rate               DECIMAL(5,2) DEFAULT 0,
			default_discount       DECIMAL(5,2) DEFAULT 0,
			currency               VARCHAR(10) DEFAULT 'IDR',
			receipt_template       VARCHAR(50) DEFAULT 'default',
			receipt_footer         TEXT,
			auto_backup            BOOLEAN DEFAULT FALSE,
			online_store_enabled   BOOLEAN DEFAULT TRUE,
			print_receipt          BOOLEAN DEFAULT TRUE,
			low_stock_notification BOOLEAN DEFAULT TRUE,
			logo_url               VARCHAR(255),
			description            TEXT,
			min_spend_for_member   DECIMAL(15,2) DEFAULT 100000,
			point_rate             DECIMAL(15,2) DEFAULT 10000,
			point_value            DECIMAL(15,2) DEFAULT 100,
			gold_threshold         DECIMAL(15,2) DEFAULT 1000000,
			platinum_threshold     DECIMAL(15,2) DEFAULT 5000000,
			created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// 5. categories
		`CREATE TABLE IF NOT EXISTS categories (
			id          VARCHAR(36) PRIMARY KEY,
			user_id     VARCHAR(36) NOT NULL,
			name        VARCHAR(255) NOT NULL,
			description TEXT,
			color       VARCHAR(50),
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)`,

		// 6. brands
		`CREATE TABLE IF NOT EXISTS brands (
			id          VARCHAR(36) PRIMARY KEY,
			user_id     VARCHAR(36) NOT NULL,
			name        VARCHAR(255) NOT NULL,
			description TEXT,
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_brands_user ON brands(user_id)`,

		// 7. suppliers
		`CREATE TABLE IF NOT EXISTS suppliers (
			id           VARCHAR(36) PRIMARY KEY,
			user_id      VARCHAR(36) NOT NULL,
			name         VARCHAR(255) NOT NULL,
			contact_name VARCHAR(255),
			email        VARCHAR(255),
			phone        VARCHAR(50),
			address      TEXT,
			notes        TEXT,
			created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_suppliers_user ON suppliers(user_id)`,

		// 8. products
		`CREATE TABLE IF NOT EXISTS products (
			id                    VARCHAR(36) PRIMARY KEY,
			user_id               VARCHAR(36) NOT NULL,
			category_id           VARCHAR(36),
			category              VARCHAR(100),
			supplier_id           VARCHAR(36),
			brand_id              VARCHAR(36),
			name                  VARCHAR(255) NOT NULL,
			description           TEXT,
			price                 DECIMAL(15,2) NOT NULL DEFAULT 0,
			cost                  DECIMAL(15,2) DEFAULT 0,
			cost_price            DECIMAL(15,2) DEFAULT 0,
			stock                 INT DEFAULT 0,
			min_stock             INT DEFAULT 0,
			unit                  VARCHAR(50) DEFAULT 'pcs',
			barcode               VARCHAR(255),
			sku                   VARCHAR(255),
			image                 TEXT,
			brand                 VARCHAR(255),
			supplier              VARCHAR(255),
			product_type          VARCHAR(20) DEFAULT 'physical',
			ownership_type        VARCHAR(20) DEFAULT 'owned',
			is_active             BOOLEAN DEFAULT TRUE,
			show_in_online_store  BOOLEAN DEFAULT FALSE,
			created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`,
		`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,

		// 9. customers
		`CREATE TABLE IF NOT EXISTS customers (
			id               VARCHAR(36) PRIMARY KEY,
			user_id          VARCHAR(36) NOT NULL,
			name             VARCHAR(255) NOT NULL,
			email            VARCHAR(255),
			phone            VARCHAR(50),
			address          TEXT,
			notes            TEXT,
			balance          DECIMAL(12,2) DEFAULT 0,
			total_purchases  DECIMAL(15,2) DEFAULT 0,
			total_spent      DECIMAL(12,2) DEFAULT 0,
			points           INT DEFAULT 0,
			is_member        BOOLEAN DEFAULT false,
			member_tier      VARCHAR(20) DEFAULT 'silver',
			status           VARCHAR(50) DEFAULT 'active',
			created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id)`,

		// 10. point_history
		`CREATE TABLE IF NOT EXISTS point_history (
			id               VARCHAR(36) PRIMARY KEY,
			tenant_id        VARCHAR(36) NOT NULL,
			customer_id      VARCHAR(36) NOT NULL,
			transaction_id   VARCHAR(36),
			type             VARCHAR(20) NOT NULL,
			points           INT NOT NULL,
			amount           DECIMAL(15,2) DEFAULT 0,
			notes            TEXT,
			created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_point_history_tenant ON point_history(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_point_history_cust ON point_history(customer_id)`,

		// 11. cash_shifts
		`CREATE TABLE IF NOT EXISTS cash_shifts (
			id                   VARCHAR(36) PRIMARY KEY,
			tenant_id            VARCHAR(36),
			user_id              VARCHAR(36) NOT NULL,
			cashier_name         VARCHAR(255),
			user_name            VARCHAR(255),
			starting_cash        DECIMAL(15,2) DEFAULT 0,
			ending_cash          DECIMAL(15,2) DEFAULT 0,
			expected_cash        DECIMAL(15,2) DEFAULT 0,
			difference           DECIMAL(15,2) DEFAULT 0,
			cash_difference      DECIMAL(15,2) DEFAULT 0,
			total_cash_sales     DECIMAL(15,2) DEFAULT 0,
			total_non_cash_sales DECIMAL(15,2) DEFAULT 0,
			total_sales          DECIMAL(15,2) DEFAULT 0,
			transaction_count    INT DEFAULT 0,
			status               VARCHAR(20) DEFAULT 'open',
			notes                TEXT,
			opened_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			closed_at            TIMESTAMP,
			start_time           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			end_time             TIMESTAMP,
			created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_cash_shifts_user ON cash_shifts(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_cash_shifts_tenant ON cash_shifts(tenant_id)`,

		// 12. transactions
		`CREATE TABLE IF NOT EXISTS transactions (
			id             VARCHAR(36) PRIMARY KEY,
			user_id        VARCHAR(36) NOT NULL,
			shift_id       VARCHAR(36),
			customer_id    VARCHAR(36),
			customer_name  VARCHAR(255),
			subtotal       DECIMAL(15,2) DEFAULT 0,
			tax            DECIMAL(15,2) DEFAULT 0,
			tax_amount     DECIMAL(15,2) DEFAULT 0,
			total_amount   DECIMAL(15,2) DEFAULT 0,
			total          DECIMAL(15,2) DEFAULT 0,
			discount       DECIMAL(15,2) DEFAULT 0,
			final_amount   DECIMAL(15,2) DEFAULT 0,
			payment_method VARCHAR(50) DEFAULT 'cash',
			payment_amount DECIMAL(15,2) DEFAULT 0,
			amount_paid    DECIMAL(15,2) DEFAULT 0,
			change_amount  DECIMAL(15,2) DEFAULT 0,
			promo_code     VARCHAR(50),
			promo_discount DECIMAL(15,2) DEFAULT 0,
			cashier_name   VARCHAR(255),
			notes          TEXT,
			status         VARCHAR(50) DEFAULT 'completed',
			invoice_number VARCHAR(100),
			latitude       DECIMAL(10,8),
			longitude      DECIMAL(11,8),
			created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at)`,

		// 13. transaction_items
		`CREATE TABLE IF NOT EXISTS transaction_items (
			id                       VARCHAR(36) PRIMARY KEY,
			transaction_id           VARCHAR(36) NOT NULL,
			product_id               VARCHAR(36),
			product_name             VARCHAR(255) NOT NULL,
			quantity                 INT NOT NULL DEFAULT 1,
			price                    DECIMAL(15,2) NOT NULL DEFAULT 0,
			unit_price               DECIMAL(15,2) NOT NULL DEFAULT 0,
			cost_price               DECIMAL(15,2) DEFAULT 0,
			subtotal                 DECIMAL(15,2) NOT NULL DEFAULT 0,
			consignment_settlement_id VARCHAR(36),
			created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_tx_items_tx ON transaction_items(transaction_id)`,
		`CREATE INDEX IF NOT EXISTS idx_tx_items_product ON transaction_items(product_id)`,

		// 14. stock_movements
		`CREATE TABLE IF NOT EXISTS stock_movements (
			id             VARCHAR(36) PRIMARY KEY,
			user_id        VARCHAR(36) NOT NULL,
			product_id     VARCHAR(36) NOT NULL,
			type           VARCHAR(50) NOT NULL,
			quantity       INT NOT NULL,
			stock_before   INT NOT NULL,
			stock_after    INT NOT NULL,
			reference_type VARCHAR(50),
			reference_id   VARCHAR(36),
			created_by     VARCHAR(36),
			notes          TEXT,
			created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_sm_user ON stock_movements(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_sm_product ON stock_movements(product_id)`,

		// 15. expense_categories & expenses
		`CREATE TABLE IF NOT EXISTS expense_categories (
			id         VARCHAR(36) PRIMARY KEY,
			user_id    VARCHAR(36) NOT NULL,
			name       VARCHAR(100) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS expenses (
			id          VARCHAR(36) PRIMARY KEY,
			user_id     VARCHAR(36) NOT NULL,
			title       VARCHAR(255) NOT NULL,
			category    VARCHAR(100),
			amount      DECIMAL(15,2) NOT NULL,
			date        DATE NOT NULL,
			notes       TEXT,
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id)`,

		// 16. incomes & income_costs
		`CREATE TABLE IF NOT EXISTS incomes (
			id             VARCHAR(36) PRIMARY KEY,
			user_id        VARCHAR(36) NOT NULL,
			title          VARCHAR(255) NOT NULL,
			client_name    VARCHAR(255),
			project_name   VARCHAR(255),
			description    TEXT,
			amount         DECIMAL(15,2) NOT NULL,
			status         VARCHAR(50) DEFAULT 'paid',
			payment_method VARCHAR(50),
			income_date    DATE,
			due_date       DATE,
			paid_date      DATE,
			category       VARCHAR(100),
			notes          TEXT,
			created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS income_costs (
			id          VARCHAR(36) PRIMARY KEY,
			income_id   VARCHAR(36) NOT NULL,
			description VARCHAR(255) NOT NULL,
			amount      DECIMAL(15,2) NOT NULL,
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// 17. reinvestment
		`CREATE TABLE IF NOT EXISTS reinvestment_balance (
			id            VARCHAR(36) PRIMARY KEY,
			tenant_id     VARCHAR(36) NOT NULL UNIQUE,
			total_balance DECIMAL(15,2) DEFAULT 0,
			updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS reinvestment_transactions (
			id          VARCHAR(36) PRIMARY KEY,
			tenant_id   VARCHAR(36) NOT NULL,
			type        VARCHAR(20) NOT NULL,
			amount      DECIMAL(15,2) NOT NULL,
			source      VARCHAR(100),
			description TEXT,
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// 18. promo_codes, discounts, product_units, otp, smtp, ai
		`CREATE TABLE IF NOT EXISTS promo_codes (
			id            VARCHAR(36) PRIMARY KEY,
			tenant_id     VARCHAR(36) NOT NULL,
			code          VARCHAR(50) NOT NULL,
			discount_type VARCHAR(20) NOT NULL,
			discount_val  DECIMAL(15,2) NOT NULL,
			min_purchase  DECIMAL(15,2) DEFAULT 0,
			max_discount  DECIMAL(15,2) DEFAULT 0,
			is_active     BOOLEAN DEFAULT TRUE,
			created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS discounts (
			id         VARCHAR(36) PRIMARY KEY,
			user_id    VARCHAR(36) NOT NULL,
			name       VARCHAR(255) NOT NULL,
			type       VARCHAR(50) NOT NULL,
			value      DECIMAL(15,2) NOT NULL DEFAULT 0,
			is_active  BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS product_units (
			id             VARCHAR(36) PRIMARY KEY,
			product_id     VARCHAR(36) NOT NULL,
			unit_name      VARCHAR(50) NOT NULL,
			conversion_qty INT DEFAULT 1,
			unit_price     DECIMAL(15,2) DEFAULT 0,
			unit_barcode   VARCHAR(255),
			created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS reinvestment_plans (
			id          VARCHAR(36) PRIMARY KEY,
			user_id     VARCHAR(36) NOT NULL,
			title       VARCHAR(255) NOT NULL,
			amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
			target_date DATE,
			status      VARCHAR(50) DEFAULT 'planned',
			notes       TEXT,
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS otp_codes (
			id         VARCHAR(36) PRIMARY KEY,
			email      VARCHAR(255) NOT NULL,
			code       VARCHAR(10) NOT NULL,
			type       VARCHAR(50) NOT NULL,
			expires_at TIMESTAMP NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS smtp_settings (
			id          VARCHAR(36) PRIMARY KEY,
			smtp_host   VARCHAR(255),
			smtp_port   VARCHAR(10),
			smtp_user   VARCHAR(255),
			smtp_pass   TEXT,
			from_name   VARCHAR(255),
			from_email  VARCHAR(255),
			smtp_secure BOOLEAN DEFAULT TRUE,
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT TRUE`,
		`CREATE TABLE IF NOT EXISTS ai_settings (
			id              VARCHAR(36) PRIMARY KEY,
			active_provider VARCHAR(50) DEFAULT 'gemini',
			gemini_key      TEXT,
			openai_key      TEXT,
			groq_key        TEXT,
			sumopod_key     TEXT,
			sumopod_model   VARCHAR(100) DEFAULT 'deepseek-chat',
			openrouter_key   TEXT,
			openrouter_model VARCHAR(150) DEFAULT 'google/gemini-2.0-flash-exp:free',
			created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS openrouter_key TEXT`,
		`ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS openrouter_model VARCHAR(150) DEFAULT 'google/gemini-2.0-flash-exp:free'`,
		`CREATE TABLE IF NOT EXISTS landing_cms (
			id         VARCHAR(50) PRIMARY KEY,
			content    TEXT,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// 19. audit_logs, discussions, announcements
		`CREATE TABLE IF NOT EXISTS audit_logs (
			id          VARCHAR(36) PRIMARY KEY,
			user_id     VARCHAR(36) NOT NULL,
			action_type VARCHAR(50) NOT NULL,
			entity_type VARCHAR(50) NOT NULL,
			entity_id   VARCHAR(255),
			old_values  TEXT,
			new_values  TEXT,
			ip_address  VARCHAR(50),
			user_agent  TEXT,
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS discussions (
			id          VARCHAR(36) PRIMARY KEY,
			user_id     VARCHAR(36) NOT NULL,
			tenant_id   VARCHAR(36) NOT NULL,
			title       VARCHAR(255) NOT NULL,
			description TEXT NOT NULL,
			category    VARCHAR(50) DEFAULT 'general',
			status      VARCHAR(50) DEFAULT 'open',
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS discussion_replies (
			id            VARCHAR(36) PRIMARY KEY,
			discussion_id VARCHAR(36) NOT NULL,
			user_id       VARCHAR(36) NOT NULL,
			reply_text    TEXT NOT NULL,
			created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS system_announcements (
			id         VARCHAR(36) PRIMARY KEY,
			message    TEXT NOT NULL,
			type       VARCHAR(50) DEFAULT 'info',
			is_active  BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// 20. consignment_settlements, profit_sharing, purchase_orders, payroll
		`CREATE TABLE IF NOT EXISTS consignment_settlements (
			id                   VARCHAR(36) PRIMARY KEY,
			tenant_id            VARCHAR(36) NOT NULL,
			supplier_id          VARCHAR(36) NOT NULL,
			supplier_name        VARCHAR(255) NOT NULL,
			total_quantity_sold  INT NOT NULL,
			total_debt_paid      DECIMAL(15,2) NOT NULL,
			settlement_date      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			period_start         TIMESTAMP,
			period_end           TIMESTAMP,
			notes                TEXT,
			created_by           VARCHAR(36),
			created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS profit_sharing_settings (
			id                 VARCHAR(36) PRIMARY KEY,
			user_id            VARCHAR(36) NOT NULL,
			tenant_id          VARCHAR(36),
			owner_percentage   DECIMAL(5,2) DEFAULT 40,
			manager_percentage DECIMAL(5,2) DEFAULT 30,
			store_percentage   DECIMAL(5,2) DEFAULT 30,
			owner_name         VARCHAR(255) DEFAULT 'Owner',
			manager_name       VARCHAR(255) DEFAULT 'Pengelola',
			is_active          BOOLEAN DEFAULT TRUE,
			period_type        VARCHAR(20) DEFAULT 'monthly',
			total_shares       DECIMAL(5,2) DEFAULT 100,
			created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS profit_sharing_parties (
			id            VARCHAR(36) PRIMARY KEY,
			tenant_id     VARCHAR(36) NOT NULL,
			name          VARCHAR(255) NOT NULL,
			share_percent DECIMAL(5,2) NOT NULL,
			bank_info     TEXT,
			notes         TEXT,
			created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS profit_distributions (
			id                 VARCHAR(36) PRIMARY KEY,
			user_id            VARCHAR(36) NOT NULL,
			tenant_id          VARCHAR(36),
			period_month       INT NOT NULL,
			period_year        INT NOT NULL,
			total_revenue      DECIMAL(15,2) DEFAULT 0,
			total_costs        DECIMAL(15,2) DEFAULT 0,
			total_expenses     DECIMAL(15,2) DEFAULT 0,
			net_profit         DECIMAL(15,2) NOT NULL,
			owner_amount       DECIMAL(15,2) DEFAULT 0,
			manager_amount     DECIMAL(15,2) DEFAULT 0,
			store_amount       DECIMAL(15,2) DEFAULT 0,
			owner_percentage   DECIMAL(5,2) DEFAULT 40,
			manager_percentage DECIMAL(5,2) DEFAULT 30,
			store_percentage   DECIMAL(5,2) DEFAULT 30,
			owner_paid         BOOLEAN DEFAULT FALSE,
			manager_paid       BOOLEAN DEFAULT FALSE,
			owner_paid_date    TIMESTAMP,
			manager_paid_date  TIMESTAMP,
			notes              TEXT,
			status             VARCHAR(20) DEFAULT 'draft',
			distribution_data  JSONB,
			created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS purchase_orders (
			id             VARCHAR(36) PRIMARY KEY,
			user_id        VARCHAR(36) NOT NULL,
			po_number      VARCHAR(100) NOT NULL,
			supplier_id    VARCHAR(36),
			supplier_name  VARCHAR(255) NOT NULL,
			status         VARCHAR(50) DEFAULT 'draft',
			payment_status VARCHAR(50) DEFAULT 'unpaid',
			total_amount   DECIMAL(15,2) DEFAULT 0,
			paid_amount    DECIMAL(15,2) DEFAULT 0,
			due_date       VARCHAR(50),
			notes          TEXT,
			created_by     VARCHAR(255),
			created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS purchase_order_items (
			id           VARCHAR(36) PRIMARY KEY,
			po_id        VARCHAR(36) NOT NULL,
			product_id   VARCHAR(36) NOT NULL,
			product_name VARCHAR(255) NOT NULL,
			qty_ordered  INT NOT NULL DEFAULT 1,
			qty_received INT NOT NULL DEFAULT 0,
			unit_cost    DECIMAL(15,2) NOT NULL DEFAULT 0,
			total        DECIMAL(15,2) NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS assets (
			id             VARCHAR(36) PRIMARY KEY,
			user_id        VARCHAR(36) NOT NULL,
			name           VARCHAR(255) NOT NULL,
			category       VARCHAR(100) DEFAULT 'Equipment',
			purchase_date  DATE,
			purchase_price DECIMAL(15,2) NOT NULL DEFAULT 0,
			current_value  DECIMAL(15,2) NOT NULL DEFAULT 0,
			notes          TEXT,
			created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS company_assets (
			id                VARCHAR(36) PRIMARY KEY,
			user_id           VARCHAR(36) NOT NULL,
			code              VARCHAR(100),
			name              VARCHAR(255) NOT NULL,
			category          VARCHAR(100) DEFAULT 'Peralatan Toko',
			purchase_date     DATE DEFAULT CURRENT_DATE,
			purchase_cost     DECIMAL(15,2) NOT NULL DEFAULT 0,
			useful_life_years INT DEFAULT 5,
			salvage_value     DECIMAL(15,2) DEFAULT 0,
			notes             TEXT,
			created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS payroll (
			id             VARCHAR(36) PRIMARY KEY,
			user_id        VARCHAR(36) NOT NULL,
			employee_id    VARCHAR(36) NOT NULL,
			employee_name  VARCHAR(255) NOT NULL,
			period_month   VARCHAR(10) NOT NULL,
			basic_salary   DECIMAL(15,2) NOT NULL DEFAULT 0,
			allowance      DECIMAL(15,2) DEFAULT 0,
			deduction      DECIMAL(15,2) DEFAULT 0,
			net_salary     DECIMAL(15,2) NOT NULL DEFAULT 0,
			payment_status VARCHAR(50) DEFAULT 'pending',
			paid_at        TIMESTAMP,
			created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS attendance (
			id            VARCHAR(36) PRIMARY KEY,
			user_id       VARCHAR(36) NOT NULL,
			employee_id   VARCHAR(36) NOT NULL,
			employee_name VARCHAR(255) NOT NULL,
			date          DATE NOT NULL,
			clock_in      TIME,
			clock_out     TIME,
			status        VARCHAR(50) DEFAULT 'present',
			notes         TEXT,
			created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS stock_opnames (
			id               VARCHAR(36) PRIMARY KEY,
			tenant_id        VARCHAR(36) NOT NULL,
			opname_number    VARCHAR(50) NOT NULL,
			status           VARCHAR(20) DEFAULT 'draft',
			notes            TEXT,
			total_discrepancy INT DEFAULT 0,
			total_items      INT DEFAULT 0,
			created_by       VARCHAR(36),
			created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			committed_at     TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS stock_opname_items (
			id              VARCHAR(36) PRIMARY KEY,
			stock_opname_id VARCHAR(36) NOT NULL,
			product_id      VARCHAR(36) NOT NULL,
			product_name    VARCHAR(255) NOT NULL,
			system_stock    INT NOT NULL,
			physical_stock  INT NOT NULL,
			difference      INT NOT NULL,
			notes           TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS recipes (
			id                  VARCHAR(36) PRIMARY KEY,
			tenant_id           VARCHAR(36) NOT NULL,
			parent_product_id   VARCHAR(36) NOT NULL,
			material_product_id VARCHAR(36) NOT NULL,
			quantity            DECIMAL(15,4) NOT NULL DEFAULT 1,
			unit                VARCHAR(50) DEFAULT 'pcs',
			created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// 21. storefront tables
		`CREATE TABLE IF NOT EXISTS store_orders (
			id                VARCHAR(36) PRIMARY KEY,
			tenant_id         VARCHAR(36) NOT NULL,
			order_number      VARCHAR(50) NOT NULL,
			customer_name     VARCHAR(255) NOT NULL,
			customer_phone    VARCHAR(50),
			customer_address  TEXT,
			total_amount      DECIMAL(15,2) NOT NULL,
			status            VARCHAR(50) DEFAULT 'pending',
			notes             TEXT,
			store_customer_id VARCHAR(36),
			created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS store_order_items (
			id           VARCHAR(36) PRIMARY KEY,
			order_id     VARCHAR(36) NOT NULL,
			product_id   VARCHAR(36) NOT NULL,
			product_name VARCHAR(255) NOT NULL,
			quantity     INT NOT NULL DEFAULT 1,
			unit_price   DECIMAL(15,2) NOT NULL,
			subtotal     DECIMAL(15,2) NOT NULL,
			created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS store_customers (
			id         VARCHAR(36) PRIMARY KEY,
			name       VARCHAR(255) NOT NULL,
			email      VARCHAR(255) NOT NULL UNIQUE,
			password   VARCHAR(255) NOT NULL,
			phone      VARCHAR(50),
			address    TEXT,
			is_active  BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		// Alterations for backward compatibility on existing databases
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS min_spend_for_member DECIMAL(15,2) DEFAULT 100000`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS point_rate DECIMAL(15,2) DEFAULT 10000`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS point_value DECIMAL(15,2) DEFAULT 100`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS gold_threshold DECIMAL(15,2) DEFAULT 1000000`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS platinum_threshold DECIMAL(15,2) DEFAULT 5000000`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255)`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS description TEXT`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_discount DECIMAL(5,2) DEFAULT 0`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS online_store_enabled BOOLEAN DEFAULT TRUE`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS print_receipt BOOLEAN DEFAULT TRUE`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS low_stock_notification BOOLEAN DEFAULT TRUE`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_backup BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT false`,
		`ALTER TABLE customers ADD COLUMN IF NOT EXISTS member_tier VARCHAR(20) DEFAULT 'silver'`,
		`ALTER TABLE customers ADD COLUMN IF NOT EXISTS points INT DEFAULT 0`,
		`ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_purchases DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance DECIMAL(12,2) DEFAULT 0`,
		`ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_slug VARCHAR(255)`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36)`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free'`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS max_products INT DEFAULT 100`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS max_transactions INT DEFAULT 1000`,
		`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36)`,
		`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS created_by VARCHAR(36)`,
		`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_id VARCHAR(36)`,
		`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50)`,
		`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS stock_before INT DEFAULT 0`,
		`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS stock_after INT DEFAULT 0`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs'`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'physical'`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(20) DEFAULT 'owned'`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS show_in_online_store BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier VARCHAR(255)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id VARCHAR(36)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id VARCHAR(36)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id VARCHAR(36)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(255)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(255)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8)`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8)`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100)`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(255)`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shift_id VARCHAR(36)`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tax DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS total DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS final_amount DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash'`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS change_amount DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50)`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS promo_discount DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT`,
		`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed'`,
		`ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS consignment_settlement_id VARCHAR(36)`,
		`ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36)`,
		`ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(255)`,
		`ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS ending_cash DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS expected_cash DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS difference DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS total_cash_sales DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS total_non_cash_sales DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS total_sales DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS transaction_count INT DEFAULT 0`,
		`ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
		`ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP`,
		`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS store_customer_id VARCHAR(36)`,
		`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'transfer'`,
		`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS payment_proof TEXT`,
		`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS client_name VARCHAR(255)`,
		`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS project_name VARCHAR(255)`,
		`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'paid'`,
		`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`,
		`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS income_date DATE`,
		`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS due_date DATE`,
		`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS paid_date DATE`,
		`ALTER TABLE incomes ADD COLUMN IF NOT EXISTS category VARCHAR(100)`,
		`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(100)`,
		`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255)`,
		`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
		`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`,
		`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT`,
		`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT`,
		`ALTER TABLE categories ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT '#6366f1'`,
		`ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT`,
		`ALTER TABLE brands ADD COLUMN IF NOT EXISTS description TEXT`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS auth_background TEXT`,

		// feature_requests
		`CREATE TABLE IF NOT EXISTS feature_requests (
			id             VARCHAR(36) PRIMARY KEY,
			user_id        VARCHAR(36) NOT NULL,
			tenant_id      VARCHAR(36),
			user_email     VARCHAR(255),
			business_name  VARCHAR(255),
			title          VARCHAR(255) NOT NULL,
			category       VARCHAR(100) NOT NULL DEFAULT 'general',
			priority       VARCHAR(50) NOT NULL DEFAULT 'medium',
			description    TEXT NOT NULL,
			image_url      TEXT,
			status         VARCHAR(50) NOT NULL DEFAULT 'pending',
			admin_notes    TEXT,
			upvotes_count  INT NOT NULL DEFAULT 0,
			created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_feature_requests_user ON feature_requests(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status)`,
		`CREATE INDEX IF NOT EXISTS idx_feature_requests_category ON feature_requests(category)`,

		// feature_request_upvotes
		`CREATE TABLE IF NOT EXISTS feature_request_upvotes (
			id                 VARCHAR(36) PRIMARY KEY,
			feature_request_id VARCHAR(36) NOT NULL,
			user_id            VARCHAR(36) NOT NULL,
			created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(feature_request_id, user_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_fr_upvotes_request ON feature_request_upvotes(feature_request_id)`,
		`CREATE INDEX IF NOT EXISTS idx_fr_upvotes_user ON feature_request_upvotes(user_id)`,

		// service_queues (Modul Jasa & Antrian)
		`CREATE TABLE IF NOT EXISTS service_queues (
			id                  VARCHAR(36) PRIMARY KEY,
			tenant_id           VARCHAR(36) NOT NULL,
			user_id             VARCHAR(36) NOT NULL,
			queue_number        VARCHAR(20) NOT NULL,
			customer_name       VARCHAR(255) NOT NULL,
			customer_phone      VARCHAR(50),
			vehicle_plate       VARCHAR(50),
			service_name        VARCHAR(255) NOT NULL,
			service_price       DECIMAL(15,2) DEFAULT 0,
			service_duration_min INT DEFAULT 30,
			assigned_staff_id   VARCHAR(36),
			assigned_staff_name VARCHAR(255),
			bay_or_chair        VARCHAR(50),
			status              VARCHAR(30) DEFAULT 'waiting',
			progress_step       VARCHAR(50) DEFAULT 'waiting',
			notes               TEXT,
			tracking_code       VARCHAR(36) NOT NULL UNIQUE,
			transaction_id      VARCHAR(36),
			called_at           TIMESTAMP,
			start_time          TIMESTAMP,
			finished_time       TIMESTAMP,
			created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_service_queues_tenant ON service_queues(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_service_queues_status ON service_queues(status)`,
		`CREATE INDEX IF NOT EXISTS idx_service_queues_tracking ON service_queues(tracking_code)`,
		`CREATE INDEX IF NOT EXISTS idx_service_queues_created ON service_queues(created_at)`,

		// ALTER TABLE additions for settings
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS service_queue_enabled BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS workshop_enabled BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS service_stations TEXT DEFAULT 'Pit 1,Pit 2,Pit 3,Kursi 1,Kursi 2'`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS queue_prefix VARCHAR(10) DEFAULT 'A'`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS favicon_url TEXT`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS barcode_settings TEXT`,

		// -------------------------------------------------------------
		// MODUL BENGKEL (WORKSHOP / AUTOMOTIVE SERVICE MANAGEMENT)
		// -------------------------------------------------------------
		// 1. vehicles (Master Kendaraan)
		`CREATE TABLE IF NOT EXISTS vehicles (
			id              VARCHAR(36) PRIMARY KEY,
			tenant_id       VARCHAR(36) NOT NULL,
			customer_id     VARCHAR(36),
			plate_number    VARCHAR(50) NOT NULL,
			vehicle_type    VARCHAR(30) DEFAULT 'car',
			brand           VARCHAR(100),
			model           VARCHAR(100),
			year            INT,
			color           VARCHAR(50),
			vin_number      VARCHAR(100),
			engine_number   VARCHAR(100),
			transmission    VARCHAR(30) DEFAULT 'Manual',
			fuel_type       VARCHAR(30) DEFAULT 'Bensin',
			current_km      INT DEFAULT 0,
			notes           TEXT,
			created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON vehicles(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number)`,
		`CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id)`,

		// 2. workshop_services (Katalog Jasa Servis & Komisi Mekanik)
		`CREATE TABLE IF NOT EXISTS workshop_services (
			id                   VARCHAR(36) PRIMARY KEY,
			tenant_id            VARCHAR(36) NOT NULL,
			name                 VARCHAR(255) NOT NULL,
			code                 VARCHAR(50),
			category             VARCHAR(100) DEFAULT 'Perawatan Berkala',
			standard_duration_min INT DEFAULT 30,
			price                DECIMAL(15,2) NOT NULL DEFAULT 0,
			commission_type      VARCHAR(20) DEFAULT 'percentage',
			commission_value     DECIMAL(15,2) DEFAULT 0,
			is_active            BOOLEAN DEFAULT TRUE,
			created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_ws_services_tenant ON workshop_services(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_ws_services_category ON workshop_services(category)`,

		// 3. workshop_stalls (Master Stall / Pit / Lift Bengkel)
		`CREATE TABLE IF NOT EXISTS workshop_stalls (
			id          VARCHAR(36) PRIMARY KEY,
			tenant_id   VARCHAR(36) NOT NULL,
			name        VARCHAR(100) NOT NULL,
			stall_type  VARCHAR(50) DEFAULT 'general',
			status      VARCHAR(30) DEFAULT 'available',
			notes       TEXT,
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_ws_stalls_tenant ON workshop_stalls(tenant_id)`,

		// 4. work_orders (Surat Perintah Kerja / PKB Bengkel)
		`CREATE TABLE IF NOT EXISTS work_orders (
			id                  VARCHAR(36) PRIMARY KEY,
			tenant_id           VARCHAR(36) NOT NULL,
			wo_number           VARCHAR(50) NOT NULL UNIQUE,
			customer_id         VARCHAR(36) NOT NULL,
			vehicle_id          VARCHAR(36) NOT NULL,
			entry_km            INT NOT NULL DEFAULT 0,
			fuel_level          VARCHAR(20) DEFAULT 'half',
			customer_complaint  TEXT,
			diagnosis_notes     TEXT,
			service_advisor_id  VARCHAR(36),
			service_advisor_name VARCHAR(255),
			lead_mechanic_id    VARCHAR(36),
			lead_mechanic_name  VARCHAR(255),
			stall_id            VARCHAR(36),
			status              VARCHAR(30) DEFAULT 'draft',
			total_labor         DECIMAL(15,2) DEFAULT 0,
			total_parts         DECIMAL(15,2) DEFAULT 0,
			total_discount      DECIMAL(15,2) DEFAULT 0,
			total_tax           DECIMAL(15,2) DEFAULT 0,
			grand_total         DECIMAL(15,2) DEFAULT 0,
			payment_status      VARCHAR(20) DEFAULT 'unpaid',
			transaction_id      VARCHAR(36),
			inspection_data     TEXT,
			next_service_km     INT,
			next_service_date   DATE,
			reminder_notes      TEXT,
			reminder_sent       BOOLEAN DEFAULT FALSE,
			started_at          TIMESTAMP,
			finished_at         TIMESTAMP,
			created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_wo_tenant ON work_orders(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_wo_customer ON work_orders(customer_id)`,
		`CREATE INDEX IF NOT EXISTS idx_wo_vehicle ON work_orders(vehicle_id)`,
		`CREATE INDEX IF NOT EXISTS idx_wo_status ON work_orders(status)`,
		`CREATE INDEX IF NOT EXISTS idx_wo_number ON work_orders(wo_number)`,
		`CREATE INDEX IF NOT EXISTS idx_wo_created ON work_orders(created_at)`,

		// 5. work_order_items (Rincian Jasa & Sparepart SPK)
		`CREATE TABLE IF NOT EXISTS work_order_items (
			id              VARCHAR(36) PRIMARY KEY,
			work_order_id   VARCHAR(36) NOT NULL,
			item_type       VARCHAR(20) NOT NULL,
			product_id      VARCHAR(36),
			service_id      VARCHAR(36),
			name            VARCHAR(255) NOT NULL,
			qty             DECIMAL(10,2) DEFAULT 1,
			unit_price      DECIMAL(15,2) DEFAULT 0,
			discount        DECIMAL(15,2) DEFAULT 0,
			subtotal        DECIMAL(15,2) DEFAULT 0,
			mechanic_id     VARCHAR(36),
			mechanic_name   VARCHAR(255),
			mechanic_fee    DECIMAL(15,2) DEFAULT 0,
			status          VARCHAR(30) DEFAULT 'pending',
			created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_wo_items_order ON work_order_items(work_order_id)`,

		// -------------------------------------------------------------
		// MODUL BARBERSHOP & SALON PREMIER
		// -------------------------------------------------------------
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS barbershop_enabled BOOLEAN DEFAULT FALSE`,

		// 1. barber_staff (Master Kapster / Barber / Stylist)
		`CREATE TABLE IF NOT EXISTS barber_staff (
			id                      VARCHAR(36) PRIMARY KEY,
			tenant_id               VARCHAR(36) NOT NULL,
			name                    VARCHAR(255) NOT NULL,
			nickname                VARCHAR(100),
			phone                   VARCHAR(50),
			specialization          VARCHAR(150) DEFAULT 'General Barber',
			chair_number            VARCHAR(50) DEFAULT 'Kursi 1',
			status                  VARCHAR(30) DEFAULT 'active',
			commission_rate_percent DECIMAL(5,2) DEFAULT 30,
			commission_rate_fixed   DECIMAL(15,2) DEFAULT 0,
			photo_url               TEXT,
			bio                     TEXT,
			created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_barber_staff_tenant ON barber_staff(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_barber_staff_status ON barber_staff(status)`,

		// 2. barber_services (Katalog Treatment & Layanan)
		`CREATE TABLE IF NOT EXISTS barber_services (
			id               VARCHAR(36) PRIMARY KEY,
			tenant_id        VARCHAR(36) NOT NULL,
			name             VARCHAR(255) NOT NULL,
			code             VARCHAR(50),
			category         VARCHAR(100) DEFAULT 'Haircut',
			duration_minutes INT DEFAULT 30,
			price            DECIMAL(15,2) NOT NULL DEFAULT 0,
			commission_type  VARCHAR(20) DEFAULT 'percentage',
			commission_value DECIMAL(15,2) DEFAULT 30,
			description      TEXT,
			is_active        BOOLEAN DEFAULT TRUE,
			created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_barber_services_tenant ON barber_services(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_barber_services_category ON barber_services(category)`,

		// 3. barber_appointments (Booking, Antrian & Transaksi Cukur)
		`CREATE TABLE IF NOT EXISTS barber_appointments (
			id              VARCHAR(36) PRIMARY KEY,
			tenant_id       VARCHAR(36) NOT NULL,
			booking_code    VARCHAR(50) NOT NULL,
			customer_id     VARCHAR(36),
			customer_name   VARCHAR(255) NOT NULL,
			customer_phone  VARCHAR(50),
			barber_id       VARCHAR(36),
			barber_name     VARCHAR(255),
			chair_number    VARCHAR(50),
			booking_date    DATE NOT NULL,
			start_time      VARCHAR(10) NOT NULL,
			end_time        VARCHAR(10),
			status          VARCHAR(30) DEFAULT 'scheduled',
			service_total   DECIMAL(15,2) DEFAULT 0,
			products_total  DECIMAL(15,2) DEFAULT 0,
			discount_total  DECIMAL(15,2) DEFAULT 0,
			grand_total     DECIMAL(15,2) DEFAULT 0,
			payment_status  VARCHAR(20) DEFAULT 'unpaid',
			transaction_id  VARCHAR(36),
			style_notes     TEXT,
			hair_formula    TEXT,
			rating          INT DEFAULT 5,
			notes           TEXT,
			created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_barber_apt_tenant ON barber_appointments(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_barber_apt_date ON barber_appointments(booking_date)`,
		`CREATE INDEX IF NOT EXISTS idx_barber_apt_status ON barber_appointments(status)`,
		`CREATE INDEX IF NOT EXISTS idx_barber_apt_barber ON barber_appointments(barber_id)`,
		`CREATE INDEX IF NOT EXISTS idx_barber_apt_code ON barber_appointments(booking_code)`,

		// 4. barber_appointment_items (Rincian Jasa & Produk Tambahan)
		`CREATE TABLE IF NOT EXISTS barber_appointment_items (
			id                VARCHAR(36) PRIMARY KEY,
			appointment_id    VARCHAR(36) NOT NULL,
			item_type         VARCHAR(20) NOT NULL,
			service_id        VARCHAR(36),
			product_id        VARCHAR(36),
			name              VARCHAR(255) NOT NULL,
			qty               DECIMAL(10,2) DEFAULT 1,
			unit_price        DECIMAL(15,2) DEFAULT 0,
			discount          DECIMAL(15,2) DEFAULT 0,
			subtotal          DECIMAL(15,2) DEFAULT 0,
			barber_id         VARCHAR(36),
			barber_name       VARCHAR(255),
			commission_amount DECIMAL(15,2) DEFAULT 0,
			created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_barber_apt_items_apt ON barber_appointment_items(appointment_id)`,

		// 5. barber_customer_profiles (Buku Rekam Jejak Gaya Rambut Pelanggan)
		`CREATE TABLE IF NOT EXISTS barber_customer_profiles (
			id                  VARCHAR(36) PRIMARY KEY,
			tenant_id           VARCHAR(36) NOT NULL,
			customer_id         VARCHAR(36) NOT NULL,
			preferred_barber_id VARCHAR(36),
			favorite_style      VARCHAR(255),
			hair_type           VARCHAR(100),
			scalp_condition     VARCHAR(150),
			style_notes         TEXT,
			color_formula       TEXT,
			last_visit_date     DATE,
			total_visits        INT DEFAULT 1,
			created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_barber_cust_profile_tenant ON barber_customer_profiles(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_barber_cust_profile_cust ON barber_customer_profiles(customer_id)`,

		// -------------------------------------------------------------
		// MODUL CAFE, COFFEE SHOP & RESTORAN (F&B MANAGEMENT SYSTEM)
		// -------------------------------------------------------------
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS service_queue_enabled BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS workshop_enabled BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS barbershop_enabled BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS fnb_enabled BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS fnb_service_charge_percent DECIMAL(5,2) DEFAULT 0`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS theme_color VARCHAR(50) DEFAULT 'emerald'`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS tagline VARCHAR(255) DEFAULT 'Sehat Alami, Hidup Harmoni'`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_unique ON settings(user_id)`,

		// 1. fnb_tables (Denah & Manajemen Meja)
		`CREATE TABLE IF NOT EXISTS fnb_tables (
			id              VARCHAR(36) PRIMARY KEY,
			tenant_id       VARCHAR(36) NOT NULL,
			table_number    VARCHAR(50) NOT NULL,
			section         VARCHAR(100) DEFAULT 'Indoor AC',
			capacity        INT DEFAULT 4,
			status          VARCHAR(30) DEFAULT 'available',
			active_order_id VARCHAR(36),
			qr_code_token   VARCHAR(100) NOT NULL,
			pos_x           INT DEFAULT 0,
			pos_y           INT DEFAULT 0,
			notes           TEXT,
			created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_tables_tenant ON fnb_tables(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_tables_status ON fnb_tables(status)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_tables_token ON fnb_tables(qr_code_token)`,

		// 2. fnb_raw_materials (Bahan Baku Mentah & Supplies)
		`CREATE TABLE IF NOT EXISTS fnb_raw_materials (
			id            VARCHAR(36) PRIMARY KEY,
			tenant_id     VARCHAR(36) NOT NULL,
			sku           VARCHAR(100),
			name          VARCHAR(255) NOT NULL,
			category      VARCHAR(100) DEFAULT 'Bahan Minuman',
			unit          VARCHAR(50) NOT NULL DEFAULT 'gram',
			cost_per_unit DECIMAL(15,2) NOT NULL DEFAULT 0,
			current_stock DECIMAL(15,2) NOT NULL DEFAULT 0,
			minimum_stock DECIMAL(15,2) NOT NULL DEFAULT 0,
			created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_raw_mat_tenant ON fnb_raw_materials(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_raw_mat_category ON fnb_raw_materials(category)`,

		// 3. fnb_recipes (BOM Resep Menu Makanan/Minuman)
		`CREATE TABLE IF NOT EXISTS fnb_recipes (
			id          VARCHAR(36) PRIMARY KEY,
			tenant_id   VARCHAR(36) NOT NULL,
			product_id  VARCHAR(36) NOT NULL,
			material_id VARCHAR(36) NOT NULL,
			quantity    DECIMAL(15,4) NOT NULL DEFAULT 1,
			unit        VARCHAR(50) NOT NULL,
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_recipes_tenant ON fnb_recipes(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_recipes_prod ON fnb_recipes(product_id)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_recipes_mat ON fnb_recipes(material_id)`,

		// 4. fnb_modifier_groups & fnb_modifiers (Add-ons / Toppings / Sugar & Ice Level)
		`CREATE TABLE IF NOT EXISTS fnb_modifier_groups (
			id            VARCHAR(36) PRIMARY KEY,
			tenant_id     VARCHAR(36) NOT NULL,
			name          VARCHAR(255) NOT NULL,
			display_name  VARCHAR(255),
			selection_type VARCHAR(50) DEFAULT 'single',
			is_required   BOOLEAN DEFAULT FALSE,
			min_selection INT DEFAULT 0,
			max_selection INT DEFAULT 1,
			created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`ALTER TABLE fnb_modifier_groups ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)`,
		`ALTER TABLE fnb_modifier_groups ADD COLUMN IF NOT EXISTS selection_type VARCHAR(50) DEFAULT 'single'`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_mod_groups_tenant ON fnb_modifier_groups(tenant_id)`,

		`CREATE TABLE IF NOT EXISTS fnb_modifiers (
			id          VARCHAR(36) PRIMARY KEY,
			group_id    VARCHAR(36) NOT NULL,
			name        VARCHAR(255) NOT NULL,
			price_delta DECIMAL(15,2) DEFAULT 0,
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_modifiers_group ON fnb_modifiers(group_id)`,

		// 5. fnb_orders (Pesanan Meja & Takeaway)
		`CREATE TABLE IF NOT EXISTS fnb_orders (
			id              VARCHAR(36) PRIMARY KEY,
			tenant_id       VARCHAR(36) NOT NULL,
			order_number    VARCHAR(50) NOT NULL,
			order_type      VARCHAR(30) DEFAULT 'dine_in',
			table_id        VARCHAR(36),
			table_number    VARCHAR(50),
			guest_count     INT DEFAULT 1,
			customer_name   VARCHAR(255) DEFAULT 'Tamu Meja',
			customer_phone  VARCHAR(50),
			status          VARCHAR(30) DEFAULT 'open',
			kitchen_status  VARCHAR(30) DEFAULT 'pending',
			subtotal        DECIMAL(15,2) DEFAULT 0,
			tax_amount      DECIMAL(15,2) DEFAULT 0,
			service_charge  DECIMAL(15,2) DEFAULT 0,
			discount_amount DECIMAL(15,2) DEFAULT 0,
			grand_total     DECIMAL(15,2) DEFAULT 0,
			payment_status  VARCHAR(30) DEFAULT 'unpaid',
			transaction_id  VARCHAR(36),
			notes           TEXT,
			created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_orders_tenant ON fnb_orders(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_orders_status ON fnb_orders(status)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_orders_table ON fnb_orders(table_id)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_orders_kstatus ON fnb_orders(kitchen_status)`,

		// 6. fnb_order_items (Rincian Item Makanan / Minuman Pesanan)
		`CREATE TABLE IF NOT EXISTS fnb_order_items (
			id              VARCHAR(36) PRIMARY KEY,
			order_id        VARCHAR(36) NOT NULL,
			product_id      VARCHAR(36) NOT NULL,
			name            VARCHAR(255) NOT NULL,
			qty             DECIMAL(10,2) DEFAULT 1,
			unit_price      DECIMAL(15,2) DEFAULT 0,
			modifiers_json  TEXT,
			subtotal        DECIMAL(15,2) DEFAULT 0,
			kitchen_station VARCHAR(50) DEFAULT 'kitchen',
			item_status     VARCHAR(30) DEFAULT 'pending',
			notes           TEXT,
			created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_order_items_order ON fnb_order_items(order_id)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_order_items_station ON fnb_order_items(kitchen_station)`,
		`CREATE INDEX IF NOT EXISTS idx_fnb_order_items_status ON fnb_order_items(item_status)`,

		// -------------------------------------------------------------
		// MODUL BISNIS LAUNDRY & DRY CLEAN (KILOAN, SATUAN, SEPATU, KARPET)
		// -------------------------------------------------------------
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS laundry_enabled BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS laundry_perfume_options TEXT DEFAULT 'Akasia,Downy Red,Sakura,Ocean Fresh,Lavender,Snappy,Molto Blue'`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS laundry_rack_locations TEXT DEFAULT 'Rak A-01,Rak A-02,Rak A-03,Rak B-01,Rak B-02,Rak B-03,Gantungan 01,Gantungan 02'`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS laundry_prefix VARCHAR(10) DEFAULT 'LND'`,

		// 1. laundry_services (Katalog Layanan & Tarif)
		`CREATE TABLE IF NOT EXISTS laundry_services (
			id              VARCHAR(36) PRIMARY KEY,
			tenant_id       VARCHAR(36) NOT NULL,
			name            VARCHAR(255) NOT NULL,
			service_type    VARCHAR(50) DEFAULT 'kiloan',
			unit            VARCHAR(20) DEFAULT 'kg',
			price           DECIMAL(15,2) NOT NULL DEFAULT 0,
			duration_hours  INT DEFAULT 48,
			notes           TEXT,
			is_active       BOOLEAN DEFAULT TRUE,
			created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_laundry_services_tenant ON laundry_services(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_laundry_services_type ON laundry_services(service_type)`,

		// 2. laundry_orders (Nota & SPK Laundry)
		`CREATE TABLE IF NOT EXISTS laundry_orders (
			id                   VARCHAR(36) PRIMARY KEY,
			tenant_id            VARCHAR(36) NOT NULL,
			order_number         VARCHAR(50) NOT NULL,
			tracking_code        VARCHAR(50) NOT NULL UNIQUE,
			customer_id          VARCHAR(36),
			customer_name        VARCHAR(255) NOT NULL,
			customer_phone       VARCHAR(50) NOT NULL,
			status               VARCHAR(30) DEFAULT 'received',
			perfume              VARCHAR(100) DEFAULT 'Akasia',
			rack_location        VARCHAR(100) DEFAULT 'Rak A-01',
			total_weight_or_qty  DECIMAL(10,2) DEFAULT 0,
			total_pieces         INT DEFAULT 0,
			subtotal             DECIMAL(15,2) DEFAULT 0,
			discount             DECIMAL(15,2) DEFAULT 0,
			total_amount         DECIMAL(15,2) DEFAULT 0,
			payment_status       VARCHAR(20) DEFAULT 'unpaid',
			payment_method       VARCHAR(50) DEFAULT 'cash',
			amount_paid          DECIMAL(15,2) DEFAULT 0,
			change_amount        DECIMAL(15,2) DEFAULT 0,
			notes                TEXT,
			estimated_completion TIMESTAMP,
			completed_at         TIMESTAMP,
			picked_up_at         TIMESTAMP,
			cashier_name         VARCHAR(255),
			created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_laundry_orders_tenant ON laundry_orders(tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_laundry_orders_status ON laundry_orders(status)`,
		`CREATE INDEX IF NOT EXISTS idx_laundry_orders_track ON laundry_orders(tracking_code)`,
		`CREATE INDEX IF NOT EXISTS idx_laundry_orders_created ON laundry_orders(created_at)`,

		// 3. laundry_order_items (Detail Rincian Item Order)
		`CREATE TABLE IF NOT EXISTS laundry_order_items (
			id              VARCHAR(36) PRIMARY KEY,
			order_id        VARCHAR(36) NOT NULL,
			service_id      VARCHAR(36),
			service_name    VARCHAR(255) NOT NULL,
			service_type    VARCHAR(50) DEFAULT 'kiloan',
			unit            VARCHAR(20) DEFAULT 'kg',
			quantity        DECIMAL(10,2) DEFAULT 1,
			price           DECIMAL(15,2) DEFAULT 0,
			subtotal        DECIMAL(15,2) DEFAULT 0,
			item_details    TEXT,
			created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_laundry_order_items_order ON laundry_order_items(order_id)`,

		// -------------------------------------------------------------
		// SUB-KATEGORI & DESKRIPSI PRODUK + PENGATURAN TOKO ONLINE DINAMIS
		// -------------------------------------------------------------
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT`,
		`CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(sub_category)`,

		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_reviews TEXT`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_features TEXT`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(255)`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(255)`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50)`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS footer_text TEXT`,
		`ALTER TABLE settings ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255)`,
		`CREATE INDEX IF NOT EXISTS idx_settings_custom_domain ON settings(custom_domain)`,

		// -------------------------------------------------------------
		// PROFIT DISTRIBUTIONS COLUMNS MIGRATION
		// -------------------------------------------------------------
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS period_year INT DEFAULT 2026`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS total_costs DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS total_expenses DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS owner_amount DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS manager_amount DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS store_amount DECIMAL(15,2) DEFAULT 0`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS owner_percentage DECIMAL(5,2) DEFAULT 40`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS manager_percentage DECIMAL(5,2) DEFAULT 30`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS store_percentage DECIMAL(5,2) DEFAULT 30`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS owner_paid BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS manager_paid BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS owner_paid_date TIMESTAMP`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS manager_paid_date TIMESTAMP`,
		`ALTER TABLE profit_distributions ADD COLUMN IF NOT EXISTS notes TEXT`,
		`CREATE INDEX IF NOT EXISTS idx_profit_distributions_user ON profit_distributions(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_profit_distributions_tenant ON profit_distributions(tenant_id)`,

		// -------------------------------------------------------------
		// PROFIT SHARING SETTINGS COLUMNS MIGRATION
		// -------------------------------------------------------------
		`ALTER TABLE profit_sharing_settings ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)`,
		`ALTER TABLE profit_sharing_settings ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36)`,
		`ALTER TABLE profit_sharing_settings ADD COLUMN IF NOT EXISTS owner_percentage DECIMAL(5,2) DEFAULT 40`,
		`ALTER TABLE profit_sharing_settings ADD COLUMN IF NOT EXISTS manager_percentage DECIMAL(5,2) DEFAULT 30`,
		`ALTER TABLE profit_sharing_settings ADD COLUMN IF NOT EXISTS store_percentage DECIMAL(5,2) DEFAULT 30`,
		`ALTER TABLE profit_sharing_settings ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255) DEFAULT 'Owner'`,
		`ALTER TABLE profit_sharing_settings ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255) DEFAULT 'Pengelola'`,
		`ALTER TABLE profit_sharing_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,
		`ALTER TABLE profit_sharing_settings ADD COLUMN IF NOT EXISTS period_type VARCHAR(20) DEFAULT 'monthly'`,
		`ALTER TABLE profit_sharing_settings ADD COLUMN IF NOT EXISTS total_shares DECIMAL(5,2) DEFAULT 100`,
		`ALTER TABLE profit_sharing_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
		`ALTER TABLE profit_sharing_settings ALTER COLUMN tenant_id DROP NOT NULL`,
		`ALTER TABLE profit_sharing_settings DROP CONSTRAINT IF EXISTS profit_sharing_settings_tenant_id_key`,
		`CREATE INDEX IF NOT EXISTS idx_profit_sharing_settings_user ON profit_sharing_settings(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_profit_sharing_settings_tenant ON profit_sharing_settings(tenant_id)`,

		// -------------------------------------------------------------
		// SUB-CATEGORIES MASTER TABLE (DENGAN INDUK CATEGORY_ID)
		// -------------------------------------------------------------
		`CREATE TABLE IF NOT EXISTS sub_categories (
			id VARCHAR(36) PRIMARY KEY,
			user_id VARCHAR(36) NOT NULL,
			category_id VARCHAR(36) NOT NULL,
			name VARCHAR(100) NOT NULL,
			description TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_sub_categories_user ON sub_categories(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_sub_categories_cat ON sub_categories(category_id)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category_id VARCHAR(36)`,
		`CREATE INDEX IF NOT EXISTS idx_products_sub_category_id ON products(sub_category_id)`,

		// Google OAuth Settings & user associations
		`CREATE TABLE IF NOT EXISTS google_auth_settings (
			id                VARCHAR(36) PRIMARY KEY,
			client_id         TEXT DEFAULT '',
			client_secret     TEXT DEFAULT '',
			is_enabled        BOOLEAN DEFAULT FALSE,
			enable_storefront BOOLEAN DEFAULT TRUE,
			enable_pos        BOOLEAN DEFAULT TRUE,
			created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS google_id VARCHAR(100)`,
		`ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100)`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			log.Printf("⚠️ AutoMigrate query note: %v", err)
		}
	}

	// Default Seeds: Super Admin
	var count int
	_ = db.Get(&count, "SELECT COUNT(*) FROM users WHERE role = 'super_admin'")
	if count == 0 {
		hashed, _ := bcrypt.GenerateFromPassword([]byte("mas@abd.com"), bcrypt.DefaultCost)
		id := uuid.New().String()
		_, _ = db.Exec(`
			INSERT INTO users (id, email, password, full_name, role, tenant_id)
			VALUES ($1, 'mas@abd.com', $2, 'Super Admin', 'super_admin', $1)
		`, id, string(hashed))
		log.Println("👤 Default Super Admin created: mas@abd.com / mas@abd.com")
	}

	// Default Registration Token
	var tokenCount int
	_ = db.Get(&tokenCount, "SELECT COUNT(*) FROM registration_tokens")
	if tokenCount == 0 {
		_, _ = db.Exec(`
			INSERT INTO registration_tokens (id, token, status)
			VALUES ($1, 'REG-POSH-2026', 'unused')
		`, uuid.New().String())
		log.Println("🔑 Default Registration Token created: REG-POSH-2026")
	}

	log.Println("✅ PostgreSQL AutoMigrate completed successfully")
	return nil
}
