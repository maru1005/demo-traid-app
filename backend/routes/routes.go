// backend/routes/routes.go
package routes

import (
	"crypto-ai-app/handlers"
	"crypto-ai-app/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		// 認証不要
		api.GET("/coins", handlers.GetCoins)
		api.GET("/history", handlers.GetPriceHistory)

		// 認証必要
		auth := api.Group("/")
		auth.Use(middleware.AuthRequired())
		{
			auth.GET("/analyze", handlers.AnalyzeCoin)

			// ユーザー
			auth.GET("/user", handlers.GetUser)
			auth.POST("/user/init", handlers.InitUser)
			auth.POST("/user/deposit", handlers.Deposit)

			// セッション
			auth.POST("/session/start", handlers.StartSession)
			auth.POST("/session/reset", handlers.ResetSession)
			auth.POST("/session/target", handlers.UpdateTarget)
			auth.GET("/sessions", handlers.GetSessionList)
			auth.GET("/sessions/:id/trades", handlers.GetSessionTrades)
			auth.DELETE("/sessions/:id", handlers.DeleteSession)

			// トレード
			auth.POST("/trade/buy", handlers.BuyCoin)
			auth.POST("/trade/sell", handlers.SellCoin)
			auth.GET("/holdings", handlers.GetHoldings)
			auth.GET("/holdings/pnl", handlers.GetHoldingsPnL)
			auth.GET("/trades", handlers.GetTrades)
			auth.POST("/trade/target-pnl", handlers.GetTargetPnL)
		}
	}
}
