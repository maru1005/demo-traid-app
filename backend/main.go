// backend/main.go
package main

import (
	"crypto-ai-app/database"
	"crypto-ai-app/handlers"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// .envを読み込む
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}

	// データベース接続
	database.Connect()

	r := gin.Default()

	// CORS設定
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Next()
	})

	// ルートハンドラーの登録
	r.GET("/api/coins", handlers.GetCoins)

	r.GET("/api/analyze", handlers.AnalyzeCoin)

	// サーバー起動
	r.Run(":8080")
}
