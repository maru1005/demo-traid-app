package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func GetAIAnalysis(coinName string, price float64, change24h float64) (string, error) {
	// 1. .envからOpenAIのキーを取得
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("OPENAI_API_KEY が設定されていません")
	}

	url := "https://api.openai.com/v1/chat/completions"

	// 2. リクエストボディの作成 (gpt-4o または gpt-3.5-turbo)
	prompt := fmt.Sprintf("あなたはプロの仮想通貨アナリストです。%s (¥%.2f, 変動率 %.2f%%) の今後の見通しを200文字程度の日本語でポジティブに分析してください。", coinName, price, change24h)

	requestBody, _ := json.Marshal(map[string]interface{}{
		"model": "gpt-4o-mini", // 安くて速い最新モデル
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	})

	// 3. リクエストの作成
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	// 4. 送信
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("OpenAIエラー: %s", string(body))
	}

	// 5. レスポンスの解析
	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if len(result.Choices) > 0 {
		return result.Choices[0].Message.Content, nil
	}

	return "分析結果が得られませんでした。", nil
}
