package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Recovery はpanicを捕捉し、JSON形式でエラーを返すミドルウェアです
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("[PANIC] %v", err)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error": "サーバー内部でエラーが発生しました",
				})
			}
		}()
		c.Next()
	}
}
