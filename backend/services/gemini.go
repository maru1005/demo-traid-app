// backend/services/gemini.go
package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// Gemini APIのリクエスト構造体
type geminiRequest struct {
	Contents []geminiContent `json:"contents"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

// Gemini APIのレスポンス構造体
type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func GetAIAnalysis(coinName string, price float64, change24h float64) (string, error) {
	// 1. .envからGeminiのAPIキーを取得
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY が設定されていません")
	}

	// 2. エンドポイントURL（gemini-2.0-flash-lite: 無料枠あり・高速）
	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s",
		apiKey,
	)

	// 3. プロンプトの作成
	prompt := fmt.Sprintf(
		"あなたはプロの仮想通貨アナリストです。%s (¥%.2f, 変動率 %.2f%%) の今後の見通しを200文字程度の日本語でポジティブに分析してください。",
		coinName, price, change24h,
	)

	// 4. リクエストボディの作成
	reqBody := geminiRequest{
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: prompt}}},
		},
	}
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	// 5. HTTPリクエストの送信
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Gemini APIエラー (status %d): %s", resp.StatusCode, string(body))
	}

	// 6. レスポンスの解析
	var result geminiResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if len(result.Candidates) > 0 && len(result.Candidates[0].Content.Parts) > 0 {
		return result.Candidates[0].Content.Parts[0].Text, nil
	}

	return "分析結果が得られませんでした。", nil
}
