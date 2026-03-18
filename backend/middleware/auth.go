// backend/middleware/auth.go
package middleware

import (
	"context"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Authorizationヘッダーからトークンを取得
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "トークンの形式が不正です"})
			c.Abort()
			return
		}

		// SupabaseのJWKS URLから公開鍵を取得
		supabaseURL := os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
		if supabaseURL == "" {
			supabaseURL = "https://bfsmvedvmyqlatfjmloz.supabase.co"
		}
		jwksURL := supabaseURL + "/auth/v1/.well-known/jwks.json"

		keySet, err := jwk.Fetch(context.Background(), jwksURL)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "公開鍵の取得に失敗しました"})
			c.Abort()
			return
		}

		// トークンを検証
		token, err := jwt.Parse([]byte(tokenString), jwt.WithKeySet(keySet))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "トークンが無効です"})
			c.Abort()
			return
		}

		// subクレームからユーザーIDを取得
		authID := token.Subject()
		if authID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "ユーザーIDの取得に失敗しました"})
			c.Abort()
			return
		}

		c.Set("auth_id", authID)
		c.Next()
	}
}
