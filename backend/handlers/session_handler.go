// backend/handlers/session_handler.go
package handlers

import (
	"crypto-ai-app/services"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetSessionList はセッション一覧を返す
func GetSessionList(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}
	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusOK, []services.SessionSummary{})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	sessions, err := services.GetSessionList(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "セッション一覧の取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

// GetSessionTrades はセッション別トレード一覧を返す
func GetSessionTrades(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}
	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	sessionIDStr := c.Param("id")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "セッションIDが不正です"})
		return
	}

	// セッションがこのユーザーのものか確認
	valid, err := services.ValidateSessionOwner(user.ID, uint(sessionID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "セッションの確認に失敗しました"})
		return
	}
	if !valid {
		c.JSON(http.StatusNotFound, gin.H{"error": "セッションが見つかりません"})
		return
	}

	trades, err := services.GetSessionTrades(user.ID, uint(sessionID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "取引履歴の取得に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, trades)
}

// DeleteSession は過去セッションを削除する
func DeleteSession(c *gin.Context) {
	authID, ok := getAuthID(c)
	if !ok {
		return
	}
	user, err := services.GetUserByAuthID(authID)
	if err != nil {
		if errors.Is(err, services.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました"})
		return
	}

	sessionIDStr := c.Param("id")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "セッションIDが不正です"})
		return
	}

	if err := services.DeleteSession(user.ID, uint(sessionID), user.SessionID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "セッションを削除しました"})
}
