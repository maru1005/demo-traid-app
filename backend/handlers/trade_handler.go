// backend/handlers/trade_handler.go
package handlers

import (
	"crypto-ai-app/database"
	"crypto-ai-app/models"
	"crypto-ai-app/services"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// auth_idからユーザーを取得するヘルパー
// 戻り値: user, found, ok
// ok=false → 認証エラー（レスポンス済み）
// found=false → ユーザー未登録（正常）
func getUserByAuthID(c *gin.Context) (*models.User, bool, bool) {
	authID, ok := getAuthID(c)
	if !ok {
		return nil, false, false
	}
	var user models.User
	err := database.DB.Where("auth_id = ?", authID).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, false, true // 未登録は正常
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー取得に失敗しました"})
		return nil, false, false
	}
	return &user, true, true
}

// 買う
func BuyCoin(c *gin.Context) {
	user, found, ok := getUserByAuthID(c)
	if !ok {
		return
	}
	if !found {
		c.JSON(http.StatusBadRequest, gin.H{"error": "初期残高を設定してください"})
		return
	}

	var req struct {
		CoinID   string  `json:"coin_id"`
		CoinName string  `json:"coin_name"`
		Amount   float64 `json:"amount"`
		Price    float64 `json:"price"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	total := req.Amount * req.Price

	// transactioin
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// ユーザーの残高を確認
		var currentUser models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", user.ID).First(&currentUser).Error; err != nil {
			return err
		}

		if currentUser.Balance < total {
			return errors.New("残高が不足しています")
		}

		if err := tx.Model(&currentUser).Update("balance", currentUser.Balance-total).Error; err != nil {
			return err
		}

		// ユーザー保有額
		var holding models.Holding
		result := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("user_id = ? AND coin_id = ?", currentUser.ID, req.CoinID).First(&holding)
		if result.Error != nil {
			if errors.Is(result.Error, gorm.ErrRecordNotFound) {
				holding = models.Holding{
					UserID:   currentUser.ID,
					CoinID:   req.CoinID,
					CoinName: req.CoinName,
					Amount:   req.Amount,
					AvgPrice: req.Price,
				}
				if err := tx.Create(&holding).Error; err != nil {
					return err
				}
			} else {
				return result.Error
			}
		} else {
			totalAmount := holding.Amount + req.Amount
			avgPrice := (holding.Amount*holding.AvgPrice + req.Amount*req.Price) / totalAmount

			if err := tx.Model(&holding).Updates(map[string]interface{}{
				"amount":    totalAmount,
				"avg_price": avgPrice,
			}).Error; err != nil {
				return err
			}
		}

		trade := models.Trade{
			UserID:    currentUser.ID,
			CoinID:    req.CoinID,
			CoinName:  req.CoinName,
			Type:      "buy",
			Amount:    req.Amount,
			Price:     req.Price,
			Total:     total,
			CreatedAt: time.Now(),
		}
		if err := tx.Create(&trade).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		// エラーハンドリング
		if req.CoinID == "" || req.Amount <= 0 || req.Price <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
			return
		}

		if err.Error() == "残高が不足しています" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "取引に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "購入しました"})
}

// 売る
func SellCoin(c *gin.Context) {
	user, found, ok := getUserByAuthID(c)
	if !ok {
		return
	}
	if !found {
		c.JSON(http.StatusBadRequest, gin.H{"error": "初期残高を設定してください"})
		return
	}

	var req struct {
		CoinID   string  `json:"coin_id"`
		CoinName string  `json:"coin_name"`
		Amount   float64 `json:"amount"`
		Price    float64 `json:"price"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストが不正です"})
		return
	}

	total := req.Amount * req.Price

	// transaction
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// 保有量を確認
		var holding models.Holding
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("user_id = ? AND coin_id = ?", user.ID, req.CoinID).First(&holding).Error; err != nil {
			return errors.New("保有コインが見つかりません")
		}
		if holding.Amount < req.Amount {
			return errors.New("保有数量が不足しています")
		}

		// ユーザー残高更新
		var currentUser models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", user.ID).First(&currentUser).Error; err != nil {
			return err
		}
		if err := tx.Model(&currentUser).Update("balance", currentUser.Balance+total).Error; err != nil {
			return err
		}

		newAmount := holding.Amount - req.Amount
		if newAmount <= 0 {
			if err := tx.Delete(&holding).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Model(&holding).Update("amount", newAmount).Error; err != nil {
				return err
			}
		}

		trade := models.Trade{
			UserID:    currentUser.ID,
			CoinID:    req.CoinID,
			CoinName:  req.CoinName,
			Type:      "sell",
			Amount:    req.Amount,
			Price:     req.Price,
			Total:     total,
			CreatedAt: time.Now(),
		}
		if err := tx.Create(&trade).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		if err.Error() == "保有コインが見つかりません" || err.Error() == "保有数量が不足しています" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "取引に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "売却しました"})
}

// 保有残高一覧
func GetHoldings(c *gin.Context) {
	user, found, ok := getUserByAuthID(c)
	if !ok {
		return
	}
	if !found {
		c.JSON(http.StatusOK, []models.Holding{})
		return
	}
	var holdings []models.Holding
	database.DB.Where("user_id = ?", user.ID).Find(&holdings)
	c.JSON(http.StatusOK, holdings)
}

// 取引履歴一覧
func GetTrades(c *gin.Context) {
	user, found, ok := getUserByAuthID(c)
	if !ok {
		return
	}
	if !found {
		c.JSON(http.StatusOK, []models.Trade{})
		return
	}
	var trades []models.Trade
	database.DB.Where("user_id = ?", user.ID).Order("created_at desc").Find(&trades)
	c.JSON(http.StatusOK, trades)
}

// 損益一覧
type HoldingPnL struct {
	CoinID       string  `json:"coin_id"`
	CoinName     string  `json:"coin_name"`
	Amount       float64 `json:"amount"`
	AvgPrice     float64 `json:"avg_price"`
	CurrentPrice float64 `json:"current_price"`
	Pnl          float64 `json:"pnl"`
	PnlPercent   float64 `json:"pnl_percent"`
}

func GetHoldingsPnL(c *gin.Context) {
	user, found, ok := getUserByAuthID(c)
	if !ok {
		return
	}
	if !found {
		c.JSON(http.StatusOK, []HoldingPnL{})
		return
	}

	var holdings []models.Holding
	if err := database.DB.Where("user_id = ?", user.ID).Find(&holdings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保有データの取得に失敗しました"})
		return
	}
	if len(holdings) == 0 {
		c.JSON(http.StatusOK, []HoldingPnL{})
		return
	}

	coinIDs := make([]string, len(holdings))
	for i, h := range holdings {
		coinIDs[i] = h.CoinID
	}

	prices, err := services.FetchCurrentPrices(coinIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "現在価格の取得に失敗しました"})
		return
	}

	result := make([]HoldingPnL, 0, len(holdings))
	for _, h := range holdings {
		currentPrice := prices[h.CoinID]
		pnl := (currentPrice - h.AvgPrice) * h.Amount
		pnlPercent := 0.0
		if h.AvgPrice > 0 {
			pnlPercent = (currentPrice - h.AvgPrice) / h.AvgPrice * 100
		}
		result = append(result, HoldingPnL{
			CoinID:       h.CoinID,
			CoinName:     h.CoinName,
			Amount:       h.Amount,
			AvgPrice:     h.AvgPrice,
			CurrentPrice: currentPrice,
			Pnl:          pnl,
			PnlPercent:   pnlPercent,
		})
	}

	c.JSON(http.StatusOK, result)
}
