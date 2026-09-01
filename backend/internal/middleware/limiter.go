package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type ipRateLimiter struct {
	mu      sync.Mutex
	history map[string][]time.Time
	window  time.Duration
	max     int
}

func newIPRateLimiter(window time.Duration, max int) *ipRateLimiter {
	limiter := &ipRateLimiter{
		history: make(map[string][]time.Time),
		window:  window,
		max:     max,
	}

	// Clean up stale entries every 5 minutes
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			limiter.mu.Lock()
			now := time.Now()
			for ip, times := range limiter.history {
				var valid []time.Time
				for _, t := range times {
					if now.Sub(t) < limiter.window {
						valid = append(valid, t)
					}
				}
				if len(valid) == 0 {
					delete(limiter.history, ip)
				} else {
					limiter.history[ip] = valid
				}
			}
			limiter.mu.Unlock()
		}
	}()

	return limiter
}

var LoginLimiter = newIPRateLimiter(15*time.Minute, 15)

func LoginRateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if ip == "127.0.0.1" || ip == "::1" || ip == "localhost" {
			c.Next()
			return
		}

		LoginLimiter.mu.Lock()
		now := time.Now()
		var valid []time.Time
		for _, t := range LoginLimiter.history[ip] {
			if now.Sub(t) < LoginLimiter.window {
				valid = append(valid, t)
			}
		}

		if len(valid) >= LoginLimiter.max {
			LoginLimiter.mu.Unlock()
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Terlalu banyak percobaan login dari IP Anda, silakan coba lagi setelah 15 menit.",
			})
			c.Abort()
			return
		}

		valid = append(valid, now)
		LoginLimiter.history[ip] = valid
		LoginLimiter.mu.Unlock()

		c.Next()
	}
}
