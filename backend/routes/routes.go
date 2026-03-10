// backend/routes/routes.go
package routes

import (
	"crypto-ai-app/handlers"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/coins", handlers.GetCoins)
		api.GET("/analyze", handlers.AnalyzeCoin)
		api.GET("/history", handlers.GetPriceHistory)
	}
}
