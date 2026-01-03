// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';

// コンポーネントのインポート
import { CryptoSelector } from '@/components/CryptoSelector';
import { CryptoDetail } from '@/components/CryptoDetail';
import { AIAnalysis } from '@/components/AIAnalysis';
import { Coin, PriceHistoryPoint } from '@/types/coin';

export default function Home() {
  // --- 状態管理 ---
  const [coins, setCoins] = useState<Coin[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  
  // 7日・1年の変動率は本来GoのDBやAPIから取るのが理想ですが、
  // 今回はフロント側で計算または初期値を設定します
  const [change7d, setChange7d] = useState(0);
  const [change1y, setChange1y] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- 1. Goバックエンドからコイン一覧を取得 ---
  const fetchCoins = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/api/coins");
      if (!res.ok) throw new Error("サーバーからのデータ取得に失敗しました");
      const data: Coin[] = await res.json();
      
      setCoins(data);
      if (data.length > 0 && !selectedCoin) {
        setSelectedCoin(data[0]); // 初期選択
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "接続エラー");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. 特定のコインの詳細（履歴）を取得 ---
  // ※本来はGoに履歴用エンドポイントを作るのがベストですが、
  //   今はフロントから直接CoinGecko（またはモック）で補完する想定です
  const fetchDetailData = async (coinId: string) => {
    try {
      // ここをGoのエンドポイントに変えることも可能ですが、一旦ダミー履歴を作成
      const mockHistory = Array.from({ length: 20 }, (_, i) => ({
        date: `${i + 1}日`,
        price: (selectedCoin?.current_price || 100) * (0.9 + Math.random() * 0.2),
      }));
      setPriceHistory(mockHistory);
      setChange7d(5.2);  // 仮の値
      setChange1y(120.5); // 仮の値
    } catch (err) {
      console.error("Detail Fetch Error:", err);
    }
  };

  // --- 3. GoのGemini APIを呼び出す関数 (AIAnalysisに渡す用) ---
  const handleAnalyze = async (): Promise<string> => {
    if (!selectedCoin) return "";
    
    // Goの /api/analyze を叩く
    const res = await fetch(
      `http://localhost:8080/api/analyze?name=${selectedCoin.name}&price=${selectedCoin.current_price}&change=${selectedCoin.price_change_percentage_24h}`
    );
    const data = await res.json();
    return data.analysis;
  };

  useEffect(() => {
    fetchCoins();
  }, []);

  useEffect(() => {
    if (selectedCoin) {
      fetchDetailData(selectedCoin.id);
    }
  }, [selectedCoin]);

  // --- UI レンダリング ---
  return (
    <div className="min-h-screen bg-[#f8fafc]"> {/* Figmaらしい少し青みのある背景色 */}
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">CRYPTO AI</h1>
          </div>
          <button 
            onClick={fetchCoins}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
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

        {/* 1. セレクター部分 */}
        <CryptoSelector 
          cryptos={coins} 
          selectedCrypto={selectedCoin} 
          onSelect={setSelectedCoin} 
        />

        {/* 2. 詳細・チャート部分 */}
        {selectedCoin && (
          <CryptoDetail 
            crypto={selectedCoin}
            priceHistory={priceHistory}
            priceChange7d={change7d}
            priceChange1y={change1y}
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