// src/components/SimulatorWithAnalysis.tsx
"use client";

import { useState, useMemo } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Coin, HoldingPnL, User } from "@/types";
import { CoinSelector } from "@/components/CoinSelector";
import { apiClient } from "@/lib/apiClient";

type TradeType = "buy" | "sell";

type Props = {
  holdings: HoldingPnL[];
  coins: Coin[];
  user: User | null;
};

type BuyResult = {
  type: "buy";
  cost: number;
  newAvgPrice: number;
  newTotalAmount: number;
};

type SellResult = {
  type: "sell";
  revenue: number;
  pnl: number;
  remainingAmount: number;
};

type SimulationResult = BuyResult | SellResult | null;

export const SimulatorWithAnalysis = ({ holdings, coins, user }: Props) => {
  // シミュレーター状態
  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [amount, setAmount] = useState("");

  // AI分析状態
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const sellableCoins: Coin[] = holdings.map((h) => ({
    id: h.coin_id,
    name: h.coin_name,
    current_price: h.current_price,
    image: coins.find((c) => c.id === h.coin_id)?.image ?? "",
    symbol: coins.find((c) => c.id === h.coin_id)?.symbol ?? "",
    market_cap: 0,
    market_cap_rank: 0,
    price_change_percentage_24h:
      coins.find((c) => c.id === h.coin_id)?.price_change_percentage_24h ?? 0,
    price_change_percentage_7d_in_currency: 0,
    price_change_percentage_1y_in_currency: 0,
  }));

  const selectableCoins = tradeType === "buy" ? coins : sellableCoins;
  const selectedHolding = holdings.find((h) => h.coin_id === selectedCoin?.id);
  const currentPrice = selectedCoin?.current_price ?? 0;
  const parsedAmount = parseFloat(amount) || 0;

  const handleTradeTypeChange = (type: TradeType) => {
    setTradeType(type);
    setSelectedCoin(null);
    setAmount("");
    setAnalysis("");
    setError("");
  };

  const handleCoinChange = (coin: Coin) => {
    setSelectedCoin(coin);
    setAmount("");
    setAnalysis("");
    setError("");
  };

  const result = useMemo((): SimulationResult => {
    if (!selectedCoin || parsedAmount <= 0 || currentPrice <= 0) return null;

    if (tradeType === "buy") {
      const cost = parsedAmount * currentPrice;
      const existingAmount = selectedHolding?.amount ?? 0;
      const existingAvgPrice = selectedHolding?.avg_price ?? 0;
      const newTotalAmount = existingAmount + parsedAmount;
      const newAvgPrice =
        existingAmount > 0
          ? (existingAmount * existingAvgPrice + parsedAmount * currentPrice) /
            newTotalAmount
          : currentPrice;
      return { type: "buy", cost, newAvgPrice, newTotalAmount };
    } else {
      if (!selectedHolding) return null;
      const revenue = parsedAmount * currentPrice;
      const pnl = (currentPrice - selectedHolding.avg_price) * parsedAmount;
      const remainingAmount = selectedHolding.amount - parsedAmount;
      return { type: "sell", revenue, pnl, remainingAmount };
    }
  }, [tradeType, selectedCoin, parsedAmount, currentPrice, selectedHolding]);

  const handleAnalyze = async () => {
    if (!selectedCoin) return;
    setLoading(true);
    setError("");
    setAnalysis("");

    const holdingsValue = holdings.reduce(
      (sum, h) => sum + h.current_price * h.amount,
      0,
    );
    const totalAssets = (user?.balance ?? 0) + holdingsValue;
    const remaining = Math.max(
      0,
      (user?.total_deposited ?? 0) + (user?.target_pnl ?? 0) - totalAssets,
    );

    try {
      const res = await apiClient.analyze({
        name: selectedCoin.name,
        price: selectedCoin.current_price,
        change: selectedCoin.price_change_percentage_24h,
        trade_type: tradeType,
        balance: user?.balance ?? 0,
        remaining,
        change_7d: selectedCoin.price_change_percentage_7d_in_currency ?? 0,
        change_1y: selectedCoin.price_change_percentage_1y_in_currency ?? 0,
        holding_amount:
          tradeType === "sell" && selectedHolding
            ? selectedHolding.amount
            : undefined,
        avg_price:
          tradeType === "sell" && selectedHolding
            ? selectedHolding.avg_price
            : undefined,
        pnl:
          tradeType === "sell" && selectedHolding
            ? selectedHolding.pnl
            : undefined,
      });
      setAnalysis(res.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* シミュレーター：PCは横一列 */}
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">シミュレーター</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
          {/* 左列：BUY/SELL + コイン選択 */}
          <div className="space-y-3 lg:w-56">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTradeTypeChange("buy")}
                className={`py-2 rounded-xl font-black text-sm transition-colors ${
                  tradeType === "buy"
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                BUY
              </button>
              <button
                onClick={() => handleTradeTypeChange("sell")}
                className={`py-2 rounded-xl font-black text-sm transition-colors ${
                  tradeType === "sell"
                    ? "bg-rose-500 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                SELL
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">コイン</label>
              {tradeType === "sell" && holdings.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">
                  保有コインがありません
                </p>
              ) : (
                <CoinSelector
                  coins={selectableCoins}
                  selectedCoin={selectedCoin}
                  onChange={handleCoinChange}
                />
              )}
            </div>
          </div>

          {/* 右列：数量 + 結果 */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-gray-700 flex-shrink-0">
                数量
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="例: 0.1"
                step="0.0001"
                className="w-32 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm font-bold text-gray-500 flex-shrink-0 ml-auto">
                合計
              </span>
              <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                ¥
                {parsedAmount > 0 && currentPrice > 0
                  ? Math.round(parsedAmount * currentPrice).toLocaleString()
                  : "0"}
              </span>
            </div>

            {result && (
              <div className="pt-3 border-t border-gray-100">
                {result.type === "buy" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        取引後の保有量
                      </p>
                      <p className="font-bold text-gray-900 text-sm">
                        {result.newTotalAmount.toFixed(4)}枚
                      </p>
                    </div>
                    {selectedHolding && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          取引後の平均取得単価
                        </p>
                        <p className="font-bold text-gray-900 text-sm">
                          ¥{Math.round(result.newAvgPrice).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {result.type === "sell" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">売却後の保有量</p>
                      <p
                        className={`font-bold text-sm ${result.remainingAmount < 0 ? "text-rose-500" : "text-gray-900"}`}
                      >
                        {result.remainingAmount < 0
                          ? "保有量不足"
                          : `${result.remainingAmount.toFixed(4)}枚`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">この取引の損益</p>
                      <p
                        className={`font-bold text-sm ${result.pnl >= 0 ? "text-emerald-600" : "text-rose-500"}`}
                      >
                        {result.pnl >= 0 ? "+" : ""}¥
                        {Math.round(result.pnl).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI分析セクション */}
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-gray-900">Gemini AI 投資戦略分析</h3>
        </div>

        <div className="min-h-[80px] flex items-center justify-center">
          {!analysis && !loading && !error && (
            <button
              onClick={handleAnalyze}
              disabled={!selectedCoin}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                selectedCoin
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Sparkles className="w-5 h-5" />
              {tradeType === "buy" ? "BUY分析" : "SELL分析"}
            </button>
          )}

          {loading && (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
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

        {analysis && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white rounded-xl p-5 border border-indigo-100 shadow-inner relative overflow-hidden">
              <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-indigo-50 opacity-[0.03]" />
              <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed relative z-10">
                {analysis}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-400 italic">
                ※ この分析はAIによる予測であり、投資の最終決定は自己責任で行ってください。
              </p>
              <button
                onClick={() => {
                  setAnalysis("");
                  setError("");
                }}
                className="text-xs text-gray-400 hover:text-gray-600 font-bold ml-4 flex-shrink-0"
              >
                クリア
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
