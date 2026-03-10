// backend/main.go
package main

import (
	"crypto-ai-app/database"
	"crypto-ai-app/middleware"
	"crypto-ai-app/routes"
	"log"

	"github.com/gin-contrib/cors"
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

	r := gin.New()

	// グローバルミドルウェア（適用順が重要）
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())
	r.Use(middleware.Recovery())

	// CORS設定
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{"http://localhost:3000"},
		AllowMethods: []string{"GET", "POST", "OPTIONS"},
		AllowHeaders: []string{"Content-Type"},
	}))

	// ルートハンドラーの登録
	routes.SetupRoutes(r)
	// サーバー起動
	r.Run(":8080")
}
