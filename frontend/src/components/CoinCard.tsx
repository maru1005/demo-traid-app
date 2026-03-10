// src/components/CoinCard.tsx
"use client";

import { useState } from "react";
import Image from "next/image"; // Next.jsの最適化画像コンポーネント
import { Coin } from "@/types/coin";
import { buildApiUrl, type GetAnalyzeResponse } from "@/types/api";
import { API_BASE_URL } from "@/lib/config";

interface CoinCardProps {
  coin: Coin;
}

export default function CoinCard({ coin }: CoinCardProps) {
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const api = buildApiUrl(API_BASE_URL);
      const response = await fetch(
        api.analyze({
          name: coin.name,
          price: coin.current_price,
          change: coin.price_change_percentage_24h,
        }),
      );
      const data: GetAnalyzeResponse = await response.json();
      setAnalysis(data.analysis);
    } catch (error) {
      console.error("Analysis Error:", error);
      setAnalysis("分析に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  // 騰落率がプラスかマイナスかで色と記号を分ける
const isPositive = (coin.price_change_percentage_24h ?? 0) >= 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4 transition-all hover:shadow-md hover:border-indigo-100">
      <div className="flex items-center justify-between">
        {/* 左側：アイコンと名称 */}
        <div className="flex items-center space-x-4">
          {/* 画像最適化: 親要素に relative と w, h を指定して fill を使う */}
          <div className="relative w-12 h-12 flex-shrink-0">
            {coin.image && (
            <Image 
              src={coin.image} 
              alt={`${coin.name} logo`}
              fill
              sizes="48px"
              className="rounded-full object-cover"
            />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg leading-tight">{coin.name}</h3>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{coin.symbol}</span>
          </div>
        </div>

        {/* 右側：価格と騰落率 */}
        <div className="text-right flex flex-col items-end">
          <p className="font-mono text-xl font-bold text-gray-900">
            ¥{coin.current_price.toLocaleString()}
          </p>
          <span className={`flex items-center text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isPositive ? '▲' : '▼'} 
            {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 分析ボタンセクション */}
      <div className="mt-5 pt-4 border-t border-gray-50 flex flex-col gap-3">
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            loading 
              ? "bg-gray-50 text-gray-400 cursor-not-allowed" 
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-200"
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              分析中...
            </>
          ) : (
            "🤖 AIに今後の見通しを聞く"
          )}
        </button>

        {/* AI分析結果の表示エリア（ふわっと表示させるアニメーション付） */}
        {analysis && (
          <div className="mt-2 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-sm text-gray-800 leading-relaxed animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-indigo-600 font-bold text-xs uppercase tracking-widest">AI Analysis</span>
              <div className="h-[1px] flex-1 bg-indigo-100"></div>
            </div>
            <p className="whitespace-pre-wrap">{analysis}</p>
          </div>
        )}
      </div>
    </div>
  );
}