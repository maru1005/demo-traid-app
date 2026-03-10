package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger はリクエストのログを出力するミドルウェアです
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		clientIP := c.ClientIP()
		method := c.Request.Method

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()
		requestID := c.GetString("RequestID")

		log.Printf("[%s] %d | %13v | %15s | %-7s %s",
			requestID, statusCode, latency, clientIP, method, path,
		)
	}
}
