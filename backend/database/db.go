// backend/database/db.go
package database

import (
	"crypto-ai-app/models"
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	// 接続情報の取得
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	port := os.Getenv("DB_PORT")
	dbname := os.Getenv("DB_NAME")

	// 接続チェック
	fmt.Println("--- 🚀 DB接続試行中 ---")
	fmt.Printf("Target: %s:%s | DB: %s | User: %s\n", host, port, dbname, user)

	if host == "" {
		log.Fatal("❌ DB_HOST が設定されていません。.env ファイルを確認してください。")
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Tokyo",
		host, user, os.Getenv("DB_PASSWORD"), dbname, port)

	// GORMで接続
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ DB接続エラー (DSNを再確認してください): %v", err)
	}

	// モデルの自動マイグレーション
	// models/coin.go を書き換えるだけでDBのテーブルが自動更新
	err = db.AutoMigrate(&models.Coin{}, &models.User{}, &models.Trade{}, &models.Holding{})
	if err != nil {
		log.Fatalf("❌ マイグレーション失敗: %v", err)
	}

	DB = db
	fmt.Println("✅ DB接続 & マイグレーション成功！")
}
