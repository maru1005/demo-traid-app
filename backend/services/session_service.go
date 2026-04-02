// backend/services/session_service.go
package services

import (
	"crypto-ai-app/database"
	"crypto-ai-app/models"
	"errors"

	"gorm.io/gorm"
)

// SessionSummary はセッション一覧用の集計情報
type SessionSummary struct {
	SessionID      uint    `json:"session_id"`
	InitialBalance float64 `json:"initial_balance"`
	TotalDeposited float64 `json:"total_deposited"`
	TradeCount     int     `json:"trade_count"`
	StartedAt      string  `json:"started_at"` // 最初のdepositの日時
}

// GetSessionList はユーザーの全セッション一覧を返す
func GetSessionList(userID uint) ([]SessionSummary, error) {
	// session_idごとにグルーピングして集計
	type row struct {
		SessionID      uint    `gorm:"column:session_id"`
		TotalDeposited float64 `gorm:"column:total_deposited"`
		TradeCount     int     `gorm:"column:trade_count"`
		StartedAt      string  `gorm:"column:started_at"`
	}

	var rows []row
	if err := database.DB.Model(&models.Trade{}).
		Select(`
			session_id,
			COALESCE(SUM(CASE WHEN type = 'deposit' THEN total ELSE 0 END), 0) AS total_deposited,
			COUNT(CASE WHEN type IN ('buy', 'sell') THEN 1 END) AS trade_count,
			MIN(created_at) AS started_at
		`).
		Where("user_id = ?", userID).
		Group("session_id").
		Order("session_id DESC").
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	// usersテーブルからinitial_balanceは現セッションのものしかないので
	// depositレコードの最初のtotalをinitial_balanceとして使う
	result := make([]SessionSummary, 0, len(rows))
	for _, r := range rows {
		// 各セッションの最初のdepositをinitial_balanceとして取得
		var firstDeposit models.Trade
		var initialBalance float64
		if err := database.DB.
			Where("user_id = ? AND session_id = ? AND type = ?", userID, r.SessionID, "deposit").
			Order("created_at ASC").
			First(&firstDeposit).Error; err == nil {
			initialBalance = firstDeposit.Total
		}

		result = append(result, SessionSummary{
			SessionID:      r.SessionID,
			InitialBalance: initialBalance,
			TotalDeposited: r.TotalDeposited,
			TradeCount:     r.TradeCount,
			StartedAt:      r.StartedAt,
		})
	}

	return result, nil
}

// GetSessionTrades はセッション別トレード一覧を返す
func GetSessionTrades(userID uint, sessionID uint) ([]models.Trade, error) {
	var trades []models.Trade
	if err := database.DB.
		Where("user_id = ? AND session_id = ?", userID, sessionID).
		Order("created_at DESC").
		Find(&trades).Error; err != nil {
		return nil, err
	}

	// sessionIDが存在するか確認（別ユーザーのセッションへのアクセス防止）
	if len(trades) == 0 {
		// 空でも正常として返す
		return []models.Trade{}, nil
	}

	return trades, nil
}

// セッションIDがそのユーザーのものか確認
func ValidateSessionOwner(userID uint, sessionID uint) (bool, error) {
	var count int64
	if err := database.DB.Model(&models.Trade{}).
		Where("user_id = ? AND session_id = ?", userID, sessionID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetSessionPnL はセッションの損益サマリーを返す（将来用）
func GetSessionPnL(userID uint, sessionID uint) (float64, error) {
	type result struct {
		PnL float64
	}
	var r result
	err := database.DB.Raw(`
		SELECT
			COALESCE(SUM(CASE WHEN type = 'sell' THEN total ELSE 0 END), 0) -
			COALESCE(SUM(CASE WHEN type = 'buy' THEN total ELSE 0 END), 0) AS pnl
		FROM trades
		WHERE user_id = ? AND session_id = ? AND type IN ('buy', 'sell')
	`, userID, sessionID).Scan(&r).Error
	if err != nil {
		return 0, err
	}
	return r.PnL, nil
}

// GetSessionListWithPnL はセッション一覧に実現損益を付加して返す（将来用）
func GetSessionListWithPnL(userID uint) ([]SessionSummary, error) {
	return GetSessionList(userID)
}

// deleteHoldingsInTransaction はトランザクション内で保有コインを削除する（内部用）
func deleteHoldingsInTransaction(tx *gorm.DB, userID uint) error {
	return tx.Where("user_id = ?", userID).Delete(&models.Holding{}).Error
}

// DeleteSession は過去セッションのトレード履歴を削除する（現セッションは削除不可）
func DeleteSession(userID uint, sessionID uint, currentSessionID uint) error {
	if sessionID == currentSessionID {
		return errors.New("現在のセッションは削除できません")
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		// そのセッションがこのユーザーのものか確認
		valid, err := ValidateSessionOwner(userID, sessionID)
		if err != nil {
			return err
		}
		if !valid {
			return errors.New("セッションが見つかりません")
		}

		return tx.Where("user_id = ? AND session_id = ?", userID, sessionID).
			Delete(&models.Trade{}).Error
	})
}
