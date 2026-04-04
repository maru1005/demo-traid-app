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

// StartSession は初回・リセット後のセッション開始処理
// 初期残高・目標損益を設定し、depositレコードを履歴に残す
func StartSession(userID uint, initialBalance, targetPnL float64) error {
	if initialBalance <= 0 || targetPnL <= 0 {
		return ErrInvalidInput
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", userID).First(&user).Error; err != nil {
			return err
		}

		// セッションIDをインクリメント
		newSessionID := user.SessionID + 1

		// ユーザー情報を更新
		if err := tx.Model(&user).Updates(map[string]interface{}{
			"balance":         initialBalance,
			"initial_balance": initialBalance,
			"target_pnl":      targetPnL,
			"session_id":      newSessionID,
		}).Error; err != nil {
			return err
		}

		// 入金レコードを履歴に追加
		deposit := models.Trade{
			UserID:    userID,
			SessionID: newSessionID,
			CoinID:    "deposit",
			CoinName:  "入金",
			Type:      "deposit",
			Amount:    1,
			Price:     initialBalance,
			Total:     initialBalance,
			CreatedAt: time.Now(),
		}
		if err := tx.Create(&deposit).Error; err != nil {
			return err
		}

		return nil
	})
}

// ResetSession は既存セッションをリセットして新セッションを開始する
// 保有コインをすべて清算し、初期残高・目標損益を再設定する
func ResetSession(userID uint, initialBalance, targetPnL float64) error {
	if initialBalance <= 0 || targetPnL <= 0 {
		return ErrInvalidInput
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", userID).First(&user).Error; err != nil {
			return err
		}

		// 保有コインを全削除
		if err := tx.Where("user_id = ?", userID).Delete(&models.Holding{}).Error; err != nil {
			return err
		}

		// 新セッションID
		newSessionID := user.SessionID + 1

		// ユーザー情報を更新
		if err := tx.Model(&user).Updates(map[string]interface{}{
			"balance":         initialBalance,
			"initial_balance": initialBalance,
			"target_pnl":      targetPnL,
			"session_id":      newSessionID,
		}).Error; err != nil {
			return err
		}

		// 新セッションの入金レコード
		deposit := models.Trade{
			UserID:    userID,
			SessionID: newSessionID,
			CoinID:    "deposit",
			CoinName:  "入金",
			Type:      "deposit",
			Amount:    1,
			Price:     initialBalance,
			Total:     initialBalance,
			CreatedAt: time.Now(),
		}
		if err := tx.Create(&deposit).Error; err != nil {
			return err
		}

		return nil
	})
}

// BuyCoin コインの購入処理
func BuyCoin(userID uint, coinID, coinName string, amount, price float64) error {
	if coinID == "" || amount <= 0 || price <= 0 {
		return ErrInvalidInput
	}

	total := amount * price

	return database.DB.Transaction(func(tx *gorm.DB) error {
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
			SessionID: currentUser.SessionID,
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

// SellCoin コインの売却処理
func SellCoin(userID uint, coinID, coinName string, amount, price float64) error {
	if coinID == "" || amount <= 0 || price <= 0 {
		return ErrInvalidInput
	}

	total := amount * price

	return database.DB.Transaction(func(tx *gorm.DB) error {
		var holding models.Holding
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("user_id = ? AND coin_id = ?", userID, coinID).First(&holding).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrHoldingNotFound
			}
			return err
		}
		if holding.Amount < amount {
			return ErrInsufficientHolding
		}

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
			SessionID: currentUser.SessionID,
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
// DBにキャッシュ済みのコイン価格を使用（CoinGecko直接呼び出しを回避）
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

	// DBキャッシュから価格を取得（CoinGeckoレート制限を回避）
	var coins []models.Coin
	if err := database.DB.Where("id IN ?", coinIDs).Find(&coins).Error; err != nil {
		return nil, err
	}
	prices := make(map[string]float64, len(coins))
	for _, c := range coins {
		prices[c.ID] = c.CurrentPrice
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

// CalculateCustomPnL は外部から与えられた価格を基に損益計算を行います
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

// UpdateTarget は目標損益のみ更新します（保有コイン・残高はそのまま）
func UpdateTarget(userID uint, targetPnL float64) error {
	if targetPnL <= 0 {
		return ErrInvalidInput
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", userID).First(&user).Error; err != nil {
			return err
		}

		if err := tx.Model(&user).Updates(map[string]interface{}{
			"target_pnl": targetPnL,
			"session_id": user.SessionID + 1,
		}).Error; err != nil {
			return err
		}

		return nil
	})
}
