// backend/services/gemini.go
package services

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

//go:embed prompts/analyze.md
var analyzePromptTemplate string

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

type AnalysisParams struct {
	CoinName      string
	Price         float64
	Change24h     float64
	Change7d      float64
	Change1y      float64
	TradeType     string
	Balance       float64
	Remaining     float64
	HoldingAmount *float64
	AvgPrice      *float64
	PnL           *float64
}

func GetAIAnalysis(params AnalysisParams) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY が設定されていません")
	}

	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s",
		apiKey,
	)

	tradeType := params.TradeType
	if tradeType == "" {
		tradeType = "buy"
	}
	tradeLabel := "BUY（購入）"
	if tradeType == "sell" {
		tradeLabel = "SELL（売却）"
	}

	holdingBlock := ""
	if tradeType == "sell" && params.HoldingAmount != nil && params.AvgPrice != nil && params.PnL != nil {
		holdingBlock = fmt.Sprintf(
			"## 保有情報\n- 保有量: %.4f枚\n- 取得単価: %.2f円\n- 含み損益: %.2f円",
			*params.HoldingAmount, *params.AvgPrice, *params.PnL,
		)
	}

	prompt := analyzePromptTemplate
	prompt = strings.ReplaceAll(prompt, "{{name}}", params.CoinName)
	prompt = strings.ReplaceAll(prompt, "{{price}}", fmt.Sprintf("%.2f", params.Price))
	prompt = strings.ReplaceAll(prompt, "{{change_24h}}", fmt.Sprintf("%.2f", params.Change24h))
	prompt = strings.ReplaceAll(prompt, "{{change_7d}}", fmt.Sprintf("%.2f", params.Change7d))
	prompt = strings.ReplaceAll(prompt, "{{change_1y}}", fmt.Sprintf("%.2f", params.Change1y))
	prompt = strings.ReplaceAll(prompt, "{{trade_type}}", tradeLabel)
	prompt = strings.ReplaceAll(prompt, "{{balance}}", fmt.Sprintf("%.0f", params.Balance))
	prompt = strings.ReplaceAll(prompt, "{{remaining}}", fmt.Sprintf("%.0f", params.Remaining))
	prompt = strings.ReplaceAll(prompt, "{{holding_block}}", holdingBlock)

	reqBody := geminiRequest{
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: prompt}}},
		},
	}
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Gemini APIエラー (status %d): %s", resp.StatusCode, string(body))
	}

	var result geminiResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if len(result.Candidates) > 0 && len(result.Candidates[0].Content.Parts) > 0 {
		return result.Candidates[0].Content.Parts[0].Text, nil
	}

	return "分析結果が得られませんでした。", nil
}
