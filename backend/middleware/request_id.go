package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// RequestID は各リクエストに一意のIDを付与するミドルウェアです
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			b := make([]byte, 8)
			if _, err := rand.Read(b); err == nil {
				requestID = fmt.Sprintf("%d-%s", time.Now().UnixNano(), hex.EncodeToString(b))
			} else {
				requestID = fmt.Sprintf("%d", time.Now().UnixNano())
			}
		}
		c.Set("RequestID", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}
