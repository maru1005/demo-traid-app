"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
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
  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [amount, setAmount] = useState("");
  const [analysis, setAnalysis] = useState<string>("");
  const [signal, setSignal] = useState<"BUY" | "SELL" | "HOLD" | null>(null);
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
  const estimatedTotal =
    parsedAmount > 0 && currentPrice > 0
      ? Math.round(parsedAmount * currentPrice)
      : 0;

  const handleTradeTypeChange = (type: TradeType) => {
    setTradeType(type);
    setSelectedCoin(null);
    setAmount("");
    setAnalysis("");
    setSignal(null);
    setError("");
  };

  const handleCoinChange = (coin: Coin) => {
    setSelectedCoin(coin);
    setAmount("");
    setAnalysis("");
    setSignal(null);
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
    setSignal(null);

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
      const match = res.analysis.match(/判断:\s*(BUY|SELL|HOLD)/)
      setSignal((match?.[1] as "BUY" | "SELL" | "HOLD") ?? "HOLD")
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const getCatImage = (sig: "BUY" | "SELL" | "HOLD") => {
    if (sig === "BUY") return "/cats/cat_buy.png"
    if (sig === "SELL") return "/cats/cat_sell.png"
    return Math.random() < 0.5 ? "/cats/cat_hold_a.png" : "/cats/cat_hold_b.png"
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex flex-col lg:flex-row lg:gap-6">
        {/* 左カラム: シミュレーター */}
        <div className="lg:w-96 flex-shrink-0 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">シミュレーター</h2>

          {/* BUY / SELL */}
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

          {/* コイン選択（価格右端） */}
          {tradeType === "sell" && holdings.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">保有コインがありません</p>
          ) : (
            <CoinSelector
              coins={selectableCoins}
              selectedCoin={selectedCoin}
              onChange={handleCoinChange}
            />
          )}

          {/* 数量 + 合計 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-700">数量</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.1"
                step="0.0001"
                className="w-32 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
              />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-700">合計</p>
              <p className="font-bold text-gray-900 tabular-nums">
                ¥{estimatedTotal > 0 ? estimatedTotal.toLocaleString() : "--"}
              </p>
            </div>
          </div>

          {/* 結果 */}
          {tradeType === "buy" && (
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">取引後の保有量</p>
                <p className="font-bold text-gray-900 tabular-nums">
                  {result?.type === "buy"
                    ? `${result.newTotalAmount.toFixed(4)}枚`
                    : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">取引後の平均単価</p>
                <p className="font-bold text-gray-900 tabular-nums">
                  {result?.type === "buy" && selectedHolding
                    ? `¥${Math.round(result.newAvgPrice).toLocaleString()}`
                    : "--"}
                </p>
              </div>
            </div>
          )}

          {tradeType === "sell" && (
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">売却後の保有量</p>
                <p
                  className={`font-bold tabular-nums ${
                    result?.type === "sell" && result.remainingAmount < 0
                      ? "text-rose-500"
                      : "text-gray-900"
                  }`}
                >
                  {result?.type === "sell"
                    ? result.remainingAmount < 0
                      ? "保有量不足"
                      : `${result.remainingAmount.toFixed(4)}枚`
                    : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">この取引の損益</p>
                <p
                  className={`font-bold tabular-nums ${
                    result?.type === "sell"
                      ? result.pnl >= 0
                        ? "text-emerald-600"
                        : "text-rose-500"
                      : "text-gray-900"
                  }`}
                >
                  {result?.type === "sell"
                    ? `${result.pnl >= 0 ? "+" : ""}¥${Math.round(result.pnl).toLocaleString()}`
                    : "--"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 区切り線（PCのみ） */}
        <div className="hidden lg:block w-px bg-gray-100 flex-shrink-0" />

        {/* 右カラム: AI分析 */}
        <div className="flex-1 space-y-3 mt-6 lg:mt-0">
          <div className="flex justify-between items-center">
            <button
              onClick={handleAnalyze}
              disabled={!selectedCoin || loading}
              className={`flex items-center gap-2 text-lg font-bold transition-opacity ${
                selectedCoin && !loading
                  ? "opacity-100 cursor-pointer hover:opacity-70"
                  : "opacity-40 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              ) : (
                <Sparkles className="w-5 h-5 text-indigo-600" />
              )}
              AI投資戦略分析
            </button>
            {signal && (
              <div className="flex items-center gap-3">
                <Image
                  src={getCatImage(signal)}
                  alt={signal}
                  width={64}
                  height={64}
                  className="object-contain"
                  unoptimized
                />
                <span className={`text-lg font-black px-3 py-1 rounded-xl ${
                  signal === "BUY"
                    ? "bg-emerald-100 text-emerald-600"
                    : signal === "SELL"
                    ? "bg-rose-100 text-rose-500"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {signal}
                </span>
              </div>
            )}
          </div>

          {!analysis && !loading && !error && (
            <p className="text-sm text-gray-400">
              コインを選択して分析ボタンを押してください
            </p>
          )}

          {loading && (
            <div className="text-center py-6">
              <Image
                src="/cats/cat_loading.png"
                alt="loading"
                width={120}
                height={120}
                className="mx-auto mb-3 object-contain"
                unoptimized
              />
              <p className="text-sm font-bold text-gray-500 animate-pulse">
                AI が市場トレンドを計算中...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <p className="text-rose-900 font-bold text-sm">分析エラー</p>
              </div>
              <p className="text-rose-600 text-xs mb-3 ml-6">{error}</p>
              <button
                onClick={handleAnalyze}
                className="ml-6 text-sm font-black text-rose-500 hover:text-rose-700 underline"
              >
                もう一度試す
              </button>
            </div>
          )}

          {analysis && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
                  {analysis}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-400 italic">
                  ※
                  この分析はAIによる予測であり、投資の最終決定は自己責任で行ってください。
                </p>
                <button
                  onClick={() => {
                    setAnalysis("");
                    setSignal(null);
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
    </div>
  );
};
