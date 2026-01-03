// src/components/AIAnalysis.tsx
"use client";

import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Coin } from '@/types/coin';

interface AIAnalysisProps {
  crypto: Coin;
  priceChange24h: number;
  priceChange7d: number;
  priceChange1y: number;
  onAnalyze: () => Promise<string>;
}

export function AIAnalysis({ 
  crypto, 
  priceChange24h, 
  priceChange7d, 
  priceChange1y,
  onAnalyze 
}: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // 数値を安全にフォーマットする補助関数
  const formatPercent = (val: number | undefined) => {
    const safeVal = val ?? 0;
    const sign = safeVal >= 0 ? '+' : '';
    return `${sign}${safeVal.toFixed(2)}%`;
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setAnalysis('');
    
    try {
      const result = await onAnalyze();
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 shadow-sm">
      {/* 1. ヘッダー */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-indigo-600" />
        <h3 className="font-bold text-gray-900 text-lg">Gemini AI 投資戦略分析</h3>
      </div>

      {/* 2. 入力データプレビュー（バッジ形式で整理） */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">分析パラメーター</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">対象銘柄</p>
            <p className="font-bold text-gray-800">{crypto.name} ({crypto.symbol.toUpperCase()})</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs text-gray-500">24h 変動率</p>
            <p className={`font-bold ${priceChange24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatPercent(priceChange24h)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">7d 変動率</p>
            <p className={`font-bold ${priceChange7d >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatPercent(priceChange7d)}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs text-gray-500">1y 変動率</p>
            <p className={`font-bold ${priceChange1y >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatPercent(priceChange1y)}
            </p>
          </div>
        </div>
      </div>

      {/* 3. メインアクション / 状態表示 */}
      <div className="min-h-[100px] flex items-center justify-center">
        {!analysis && !loading && !error && (
          <button
            onClick={handleAnalyze}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl hover:bg-indigo-700 transition-all font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-[0.98]"
          >
            <Sparkles className="w-5 h-5" />
            AI分析レポートを生成
          </button>
        )}

        {loading && (
          <div className="text-center py-6">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-500 animate-pulse">
              Gemini Pro が市場トレンドを計算中...
            </p>
          </div>
        )}

        {error && (
          <div className="w-full bg-rose-50 border border-rose-100 rounded-xl p-5 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-rose-900 font-bold mb-1">分析エラー</p>
            <p className="text-rose-600 text-xs mb-4">{error}</p>
            <button 
              onClick={handleAnalyze}
              className="text-sm font-black text-rose-500 hover:text-rose-700 underline"
            >
              もう一度試す
            </button>
          </div>
        )}
      </div>

      {/* 4. 分析結果表示 */}
      {analysis && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white rounded-xl p-6 border border-indigo-100 shadow-inner relative overflow-hidden">
             {/* 背景の装飾アイコン */}
            <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-indigo-50 opacity-[0.03]" />
            <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed relative z-10">
              {analysis}
            </div>
          </div>
          <p className="text-[10px] text-gray-400 text-center italic">
            ※ この分析はAIによる予測であり、投資の最終決定は自己責任で行ってください。
          </p>
        </div>
      )}
    </div>
  );
}