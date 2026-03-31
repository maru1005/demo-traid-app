// backend/service/trade_service.go
package services

import (
	"crypto-ai-app/database"
	"crypto-ai-app/models"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Sentinel Errors (定義済みエラー)
var (
	ErrInsufficientBalance = errors.New("残高が不足しています")
	ErrHoldingNotFound     = errors.New("保有コインが見つかりません")
	ErrInsufficientHolding = errors.New("保有数量が不足しています")
	ErrInvalidInput        = errors.New("入力値が不正です")
)

// 損益計算結果用の構造体
type HoldingPnL struct {
	CoinID       string  `json:"coin_id"`
	CoinName     string  `json:"coin_name"`
	Amount       float64 `json:"amount"`
	AvgPrice     float64 `json:"avg_price"`
	CurrentPrice float64 `json:"current_price"`
	Pnl          float64 `json:"pnl"`
	PnlPercent   float64 `json:"pnl_percent"`
}

// BuyCoin コインの購入処理
func BuyCoin(userID uint, coinID, coinName string, amount, price float64) error {
	if coinID == "" || amount <= 0 || price <= 0 {
		return ErrInvalidInput
	}

	total := amount * price

	return database.DB.Transaction(func(tx *gorm.DB) error {
		// ユーザーの残高を確認
		var currentUser models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", userID).First(&currentUser).Error; err != nil {
			return err
		}

		if currentUser.Balance < total {
			return ErrInsufficientBalance
		}

		if err := tx.Model(&currentUser).Update("balance", currentUser.Balance-total).Error; err != nil {
			return err
		}

		// ユーザー保有額
		var holding models.Holding
		result := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("user_id = ? AND coin_id = ?", currentUser.ID, coinID).First(&holding)
		if result.Error != nil {
			if errors.Is(result.Error, gorm.ErrRecordNotFound) {
				holding = models.Holding{
					UserID:   currentUser.ID,
					CoinID:   coinID,
					CoinName: coinName,
					Amount:   amount,
					AvgPrice: price,
				}
				if err := tx.Create(&holding).Error; err != nil {
					return err
				}
			} else {
				return result.Error
			}
		} else {
			totalAmount := holding.Amount + amount
			avgPrice := (holding.Amount*holding.AvgPrice + amount*price) / totalAmount

			if err := tx.Model(&holding).Updates(map[string]interface{}{
				"amount":    totalAmount,
				"avg_price": avgPrice,
			}).Error; err != nil {
				return err
			}
		}

		trade := models.Trade{
			UserID:    currentUser.ID,
			CoinID:    coinID,
			CoinName:  coinName,
			Type:      "buy",
			Amount:    amount,
			Price:     price,
			Total:     total,
			CreatedAt: time.Now(),
		}
		if err := tx.Create(&trade).Error; err != nil {
			return err
		}

		return nil
	})
}

// SellCoin はコインの売却処理を行います
func SellCoin(userID uint, coinID, coinName string, amount, price float64) error {
	if coinID == "" || amount <= 0 || price <= 0 {
		return ErrInvalidInput
	}

	total := amount * price

	return database.DB.Transaction(func(tx *gorm.DB) error {
		// 保有コインを確認
		var holding models.Holding
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("user_id = ? AND coin_id = ?", userID, coinID).First(&holding).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrHoldingNotFound
			}
			return err // DBエラーなどをそのまま返す
		}
		if holding.Amount < amount {
			return ErrInsufficientHolding
		}

		// ユーザー残高更新
		var currentUser models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", userID).First(&currentUser).Error; err != nil {
			return err
		}
		if err := tx.Model(&currentUser).Update("balance", currentUser.Balance+total).Error; err != nil {
			return err
		}

		newAmount := holding.Amount - amount
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
			CoinID:    coinID,
			CoinName:  coinName,
			Type:      "sell",
			Amount:    amount,
			Price:     price,
			Total:     total,
			CreatedAt: time.Now(),
		}
		if err := tx.Create(&trade).Error; err != nil {
			return err
		}

		return nil
	})
}

// CalculateHoldingsPnL 保有コインの損益計算
func CalculateHoldingsPnL(userID uint) ([]HoldingPnL, error) {
	var holdings []models.Holding
	if err := database.DB.Where("user_id = ?", userID).Find(&holdings).Error; err != nil {
		return nil, err
	}
	if len(holdings) == 0 {
		return []HoldingPnL{}, nil
	}

	coinIDs := make([]string, len(holdings))
	for i, h := range holdings {
		coinIDs[i] = h.CoinID
	}

	prices, err := FetchCurrentPrices(coinIDs)
	if err != nil {
		return nil, err
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

	return result, nil
}

// CalculateCustomPnL は外部（フロントエンド等）から与えられた価格を基に損益計算を行います
func CalculateCustomPnL(userID uint, prices map[string]float64) ([]HoldingPnL, error) {
	var holdings []models.Holding
	if err := database.DB.Where("user_id = ?", userID).Find(&holdings).Error; err != nil {
		return nil, err
	}
	if len(holdings) == 0 {
		return []HoldingPnL{}, nil
	}

	result := make([]HoldingPnL, 0, len(holdings))
	for _, h := range holdings {
		currentPrice, ok := prices[h.CoinID]
		if !ok {
			// 価格が渡されていないコインは計算から除外
			continue
		}
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

	return result, nil
}

// GetHoldings はユーザーの保有コイン一覧を取得します
func GetHoldings(userID uint) ([]models.Holding, error) {
	var holdings []models.Holding
	if err := database.DB.Where("user_id = ?", userID).Find(&holdings).Error; err != nil {
		return nil, err
	}
	return holdings, nil
}

// GetTrades はユーザーの取引履歴を取得します
func GetTrades(userID uint) ([]models.Trade, error) {
	var trades []models.Trade
	if err := database.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&trades).Error; err != nil {
		return nil, err
	}
	return trades, nil
}
