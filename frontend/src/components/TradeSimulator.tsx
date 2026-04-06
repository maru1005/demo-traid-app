// src/components/TradeSimulator.tsx
// トレードフォーム
"use client";

import { useState, useMemo, useEffect } from "react";
import { Coin, HoldingPnL } from "@/types";
import { CoinSelector } from "@/components/CoinSelector";

type TradeType = "buy" | "sell";

export type SimulatorState = {
  coin: Coin | null;
  tradeType: TradeType;
  holding?: {
    amount: number;
    avgPrice: number;
    pnl: number;
  };
};

type Props = {
  holdings: HoldingPnL[];
  coins: Coin[];
  onSimulatorChange?: (state: SimulatorState) => void;
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

export const TradeSimulator = ({ holdings, coins, onSimulatorChange }: Props) => {
  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [amount, setAmount] = useState("");

  const sellableCoins: Coin[] = holdings.map((h) => ({
    id: h.coin_id,
    name: h.coin_name,
    current_price: h.current_price,
    image: coins.find((c) => c.id === h.coin_id)?.image ?? "",
    symbol: coins.find((c) => c.id === h.coin_id)?.symbol ?? "",
    market_cap: 0,
    market_cap_rank: 0,
    price_change_percentage_24h: coins.find((c) => c.id === h.coin_id)?.price_change_percentage_24h ?? 0,
    price_change_percentage_7d_in_currency: 0,
    price_change_percentage_1y_in_currency: 0,
  }));

  const selectableCoins = tradeType === "buy" ? coins : sellableCoins;

  const selectedHolding = holdings.find((h) => h.coin_id === selectedCoin?.id);

  const handleTradeTypeChange = (type: TradeType) => {
    setTradeType(type);
    setSelectedCoin(null);
    setAmount("");
  };

  const handleCoinChange = (coin: Coin) => {
    setSelectedCoin(coin);
    setAmount("");
  };

  useEffect(() => {
    if (!onSimulatorChange) return;
    onSimulatorChange({
      coin: selectedCoin,
      tradeType,
      holding:
        tradeType === "sell" && selectedHolding
          ? {
              amount: selectedHolding.amount,
              avgPrice: selectedHolding.avg_price,
              pnl: selectedHolding.pnl,
            }
          : undefined,
    });
  }, [selectedCoin, tradeType, selectedHolding, onSimulatorChange]);

  const currentPrice = selectedCoin?.current_price ?? 0;
  const parsedAmount = parseFloat(amount) || 0;

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
          <CoinSelector
            coins={selectableCoins}
            selectedCoin={selectedCoin}
            onChange={handleCoinChange}
          />
        )}
      </div>

      {/* 数量 */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-bold text-gray-700 flex-shrink-0">数量</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="例: 0.1"
          step="0.0001"
          className="w-32 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-sm font-bold text-gray-500 flex-shrink-0 ml-auto">合計</span>
        <span className="text-sm font-bold text-gray-900 flex-shrink-0">
          ¥{parsedAmount > 0 && currentPrice > 0 ? Math.round(parsedAmount * currentPrice).toLocaleString() : "0"}
        </span>
      </div>

      {/* 結果表示 */}
      {result && (
        <div className="pt-4 border-t border-gray-100 space-y-2">
          {result.type === "buy" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">取引後の保有量</p>
                <p className="font-bold text-gray-900 text-sm">
                  {result.newTotalAmount.toFixed(4)}枚
                </p>
              </div>
              {selectedHolding && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">取引後の平均取得単価</p>
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
                <p className={`font-bold text-sm ${result.remainingAmount < 0 ? "text-rose-500" : "text-gray-900"}`}>
                  {result.remainingAmount < 0 ? "保有量不足" : `${result.remainingAmount.toFixed(4)}枚`}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">この取引の損益</p>
                <p className={`font-bold text-sm ${result.pnl >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                  {result.pnl >= 0 ? "+" : ""}¥{Math.round(result.pnl).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
