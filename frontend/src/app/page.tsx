// src/app/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { TrendingUp, RefreshCw, AlertCircle } from "lucide-react";

// コンポーネントのインポート
import { CryptoDetail } from "@/components/CryptoDetail";
import { AIAnalysis } from "@/components/AIAnalysis";
import { Coin, PriceHistoryPoint } from "@/types/coin";
import {
  buildApiUrl,
  type GetCoinsResponse,
  type GetHistoryResponse,
  type GetAnalyzeResponse,
  type HistoryDays,
} from "@/types/api";
import { API_BASE_URL } from "@/lib/config";

export default function Home() {
  // --- 状態管理 ---
  const [coins, setCoins] = useState<Coin[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [historyDays, setHistoryDays] = useState<HistoryDays>(365);

  // 7日・1年の変動率は本来GoのDBやAPIから取るのが理想ですが、
  // 今回はフロント側で計算または初期値を設定します
  const [change7d, setChange7d] = useState(0);
  const [change1y, setChange1y] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const api = useMemo(() => buildApiUrl(API_BASE_URL), []);

  // --- 1. Goバックエンドからコイン一覧を取得 ---
  const fetchCoins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(api.coins());
      if (!res.ok) throw new Error("サーバーからのデータ取得に失敗しました");
      const data: GetCoinsResponse = await res.json();
      setCoins(data);
      if (data.length > 0 && !selectedCoin) {
        setSelectedCoin(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "接続エラー");
    } finally {
      setLoading(false);
    }
  }, [selectedCoin, api]);

  // --- 2. 特定のコインの詳細（履歴）を取得 ---
  const abortRef = useRef<AbortController | null>(null);

  const fetchDetailData = useCallback(
    async (coin: Coin, days: HistoryDays = 365) => {
      // 前のfetchをキャンセル（レースコンディション防止）
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      try {
        const res = await fetch(api.history({ id: coin.id, days }), {
          cache: "no-store",
          signal,
        });
        const data: GetHistoryResponse = await res.json();
        setPriceHistory(data);
        setChange7d(coin.price_change_percentage_7d_in_currency ?? 0);
        setChange1y(coin.price_change_percentage_1y_in_currency ?? 0);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Detail Fetch Error:", err);
      }
    },
    [api],
  );

  // --- 3. GoのGemini APIを呼び出す関数 (AIAnalysisに渡す用) ---
  const handleAnalyze = async (): Promise<string> => {
    if (!selectedCoin) return "";

    const res = await fetch(
      api.analyze({
        name: selectedCoin.name,
        price: selectedCoin.current_price,
        change: selectedCoin.price_change_percentage_24h,
      }),
    );
    const data: GetAnalyzeResponse = await res.json();
    return data.analysis;
  };

  useEffect(() => {
    fetchCoins();
  }, [fetchCoins]);

  useEffect(() => {
    if (selectedCoin) {
      fetchDetailData(selectedCoin, historyDays);
    }
  }, [selectedCoin, historyDays, fetchDetailData]);

  // --- UI レンダリング ---
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {" "}
      {/* Figmaらしい少し青みのある背景色 */}
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">
              CRYPTO AI
            </h1>
          </div>
          <button
            onClick={fetchCoins}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-600">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {/* 詳細・チャート部分（銘柄選択統合済み） */}
        {selectedCoin && (
          <CryptoDetail
            crypto={selectedCoin}
            coins={coins}
            onCoinSelect={setSelectedCoin}
            priceHistory={priceHistory}
            priceChange7d={change7d}
            priceChange1y={change1y}
            historyDays={historyDays}
            onHistoryDaysChange={setHistoryDays}
          />
        )}

        {/* 3. AI分析部分 */}
        {selectedCoin && (
          <AIAnalysis
            crypto={selectedCoin}
            priceChange24h={selectedCoin.price_change_percentage_24h}
            priceChange7d={change7d}
            priceChange1y={change1y}
            onAnalyze={handleAnalyze}
          />
        )}
      </main>
    </div>
  );
}
