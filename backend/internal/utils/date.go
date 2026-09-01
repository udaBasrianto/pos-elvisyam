package utils

import (
	"time"
)

var WIBLocation *time.Location

func init() {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.FixedZone("WIB", 7*3600)
	}
	WIBLocation = loc
}

func NowWIB() time.Time {
	return time.Now().In(WIBLocation)
}

type WIBDateRanges struct {
	TodayStart       string
	TodayEnd         string
	MonthStart       string
	MonthEnd         string
	YearStart        string
	YearEnd          string
	Last7DaysStart   string
	Last30DaysStart  string
	LastMonthStart   string
	LastMonthEnd     string
	Last12MonthsStart string
}

func GetWIBDateRanges() WIBDateRanges {
	now := NowWIB()

	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, WIBLocation).Format("2006-01-02 15:04:05")
	todayEnd := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, WIBLocation).Format("2006-01-02 15:04:05")

	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, WIBLocation).Format("2006-01-02 15:04:05")
	lastDayOfMonth := time.Date(now.Year(), now.Month()+1, 0, 23, 59, 59, 0, WIBLocation).Format("2006-01-02 15:04:05")

	lastMonthStart := time.Date(now.Year(), now.Month()-1, 1, 0, 0, 0, 0, WIBLocation).Format("2006-01-02 15:04:05")
	lastMonthEnd := time.Date(now.Year(), now.Month(), 0, 23, 59, 59, 0, WIBLocation).Format("2006-01-02 15:04:05")

	yearStart := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, WIBLocation).Format("2006-01-02 15:04:05")
	yearEnd := time.Date(now.Year(), 12, 31, 23, 59, 59, 0, WIBLocation).Format("2006-01-02 15:04:05")

	last7Days := now.AddDate(0, 0, -7)
	last7DaysStart := time.Date(last7Days.Year(), last7Days.Month(), last7Days.Day(), 0, 0, 0, 0, WIBLocation).Format("2006-01-02 15:04:05")

	last30Days := now.AddDate(0, 0, -30)
	last30DaysStart := time.Date(last30Days.Year(), last30Days.Month(), last30Days.Day(), 0, 0, 0, 0, WIBLocation).Format("2006-01-02 15:04:05")

	last12Months := now.AddDate(-1, 1, 0)
	last12MonthsStart := time.Date(last12Months.Year(), last12Months.Month(), 1, 0, 0, 0, 0, WIBLocation).Format("2006-01-02 15:04:05")

	return WIBDateRanges{
		TodayStart:       todayStart,
		TodayEnd:         todayEnd,
		MonthStart:       monthStart,
		MonthEnd:         lastDayOfMonth,
		LastMonthStart:   lastMonthStart,
		LastMonthEnd:     lastMonthEnd,
		YearStart:        yearStart,
		YearEnd:          yearEnd,
		Last7DaysStart:   last7DaysStart,
		Last30DaysStart:  last30DaysStart,
		Last12MonthsStart: last12MonthsStart,
	}
}
