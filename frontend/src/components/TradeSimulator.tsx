// src/components/TradeSimulator.tsx
"use client";

import { useState, useMemo } from "react";
import { Coin, HoldingPnL } from "@/types";

type Props = {
  holdings: HoldingPnL[];
  coins: Coin[];
};

type TradeType = "buy" | "sell";

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

export const TradeSimulator = ({ holdings, coins }: Props) => {
  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [selectedCoinId, setSelectedCoinId] = useState<string>("");
  const [amount, setAmount] = useState("");

  const selectableCoins =
    tradeType === "buy"
      ? coins
      : holdings.map((h) => ({
          id: h.coin_id,
          name: h.coin_name,
          current_price: h.current_price,
        }));

  const handleCoinChange = (coinId: string) => {
    setSelectedCoinId(coinId);
    setAmount("");
  };

  const handleTradeTypeChange = (type: TradeType) => {
    setTradeType(type);
    setSelectedCoinId("");
    setAmount("");
  };

  const selectedHolding = holdings.find((h) => h.coin_id === selectedCoinId);
  const selectedCoin = coins.find((c) => c.id === selectedCoinId);

  const currentPrice =
    selectedCoin?.current_price ?? selectedHolding?.current_price ?? 0;

  const parsedAmount = parseFloat(amount) || 0;

  const result = useMemo((): SimulationResult => {
    if (!selectedCoinId || parsedAmount <= 0 || currentPrice <= 0) return null;

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
  }, [tradeType, selectedCoinId, parsedAmount, currentPrice, selectedHolding]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-gray-900">シミュレーター</h2>

      {/* 買い/売り切り替え */}
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

      {/* コイン選択 */}
      <div className="space-y-1">
        <label className="text-sm font-bold text-gray-700">コイン</label>
        {tradeType === "sell" && holdings.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">保有コインがありません</p>
        ) : (
          <select
            value={selectedCoinId}
            onChange={(e) => handleCoinChange(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 font-bold text-gray-700"
          >
            <option value="">選択してください</option>
            {selectableCoins.map((coin) => (
              <option key={coin.id} value={coin.id}>
                {coin.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 現在価格・保有情報 */}
      {selectedCoinId && (
        <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">現在価格</span>
            <span className="font-bold text-gray-900">
              ¥{currentPrice.toLocaleString()}
            </span>
          </div>
          {tradeType === "sell" && selectedHolding && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">保有量</span>
                <span className="font-bold text-gray-900">
                  {selectedHolding.amount}枚
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">取得単価</span>
                <span className="font-bold text-gray-900">
                  ¥{selectedHolding.avg_price.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* 数量 */}
      <div className="space-y-1">
        <label className="text-sm font-bold text-gray-700">数量</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="例: 0.1"
          step="0.0001"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* 結果表示 */}
      {result && (
        <div className="pt-4 border-t border-gray-100 space-y-2">
          {result.type === "buy" && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">取引コスト</span>
                <span className="font-bold text-gray-900">
                  ¥{result.cost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">取引後の保有量</span>
                <span className="font-bold text-gray-900">
                  {result.newTotalAmount.toFixed(4)}枚
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">取引後の平均取得単価</span>
                <span className="font-bold text-gray-900">
                  ¥{Math.round(result.newAvgPrice).toLocaleString()}
                </span>
              </div>
            </>
          )}

          {result.type === "sell" && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">売却額</span>
                <span className="font-bold text-gray-900">
                  ¥{result.revenue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">この取引の損益</span>
                <span
                  className={`font-black ${result.pnl >= 0 ? "text-emerald-600" : "text-rose-500"}`}
                >
                  {result.pnl >= 0 ? "+" : ""}¥
                  {Math.round(result.pnl).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">売却後の保有量</span>
                <span
                  className={`font-bold ${result.remainingAmount < 0 ? "text-rose-500" : "text-gray-900"}`}
                >
                  {result.remainingAmount < 0
                    ? "保有量が不足しています"
                    : `${result.remainingAmount.toFixed(4)}枚`}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
