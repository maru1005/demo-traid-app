package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// getAuthID is a helper to get auth_id from the context.
func getAuthID(c *gin.Context) (string, bool) {
	authID, exists := c.Get("auth_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証情報が見つかりません"})
		return "", false
	}
	return authID.(string), true
}
