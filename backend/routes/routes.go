// backend/routes/routes.go
package routes

import (
	"crypto-ai-app/handlers"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		// コイン
		api.GET("/coins", handlers.GetCoins)
		api.GET("/analyze", handlers.AnalyzeCoin)
		api.GET("/history", handlers.GetPriceHistory)

		// ユーザー
		api.GET("/user", handlers.GetUser)
		api.POST("/user/init", handlers.InitUser)
		api.POST("/user/deposit", handlers.Deposit)

		// トレード
		api.POST("/trade/buy", handlers.BuyCoin)
		api.POST("/trade/sell", handlers.SellCoin)
		api.GET("/holdings", handlers.GetHoldings)
		api.GET("/trades", handlers.GetTrades)
	}
}
