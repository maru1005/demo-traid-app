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

type openAIRequest struct {
	Model     string          `json:"model"`
	Messages  []openAIMessage `json:"messages"`
	MaxTokens int             `json:"max_tokens"`
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
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
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("OPENAI_API_KEY が設定されていません")
	}

	url := "https://api.openai.com/v1/chat/completions"

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

	reqBody := openAIRequest{
		Model: "gpt-4o-mini",
		Messages: []openAIMessage{
			{Role: "user", Content: prompt},
		},
		MaxTokens: 500,
	}
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("AI APIエラー (status %d): %s", resp.StatusCode, string(body))
	}

	var result openAIResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if len(result.Choices) > 0 {
		return result.Choices[0].Message.Content, nil
	}

	return "分析結果が得られませんでした。", nil
}
