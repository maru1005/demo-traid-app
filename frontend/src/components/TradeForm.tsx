// src/components/TradeForm.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Coin } from "@/types/coin";
import { PriceHistoryPoint } from "@/types/coin";
import { HistoryDays } from "@/types/api";
import { apiClient } from "@/lib/apiClient";
import { CoinSelector } from "@/components/CoinSelector";

type Props = {
  coins: Coin[];
  onTradeComplete: () => void;
};


const PERIOD_OPTIONS: { shortLabel: string; value: HistoryDays }[] = [
  { shortLabel: "24h", value: 1 },
  { shortLabel: "7d", value: 7 },
  { shortLabel: "1y", value: 365 },
];

export const TradeForm = ({ coins, onTradeComplete }: Props) => {
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const [historyDays, setHistoryDays] = useState<HistoryDays>(1);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [change7d, setChange7d] = useState(0);
  const [change1y, setChange1y] = useState(0);

  const fetchSeqRef = useRef(0);

  useEffect(() => {
    if (coins.length > 0 && !selectedCoin) {
      const bitcoin = coins.find((c) => c.id === "bitcoin") ?? coins[0];
      setSelectedCoin(bitcoin);
    }
  }, [coins]);

  const fetchHistory = useCallback(async (coin: Coin, days: HistoryDays) => {
    const seq = ++fetchSeqRef.current;
    try {
      const data = await apiClient.getHistory({ id: coin.id, days });
      if (seq === fetchSeqRef.current) {
        setPriceHistory(data);
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCoin) {
      setPriceHistory([]);
      return;
    }
    setChange7d(selectedCoin.price_change_percentage_7d_in_currency ?? 0);
    setChange1y(selectedCoin.price_change_percentage_1y_in_currency ?? 0);
    fetchHistory(selectedCoin, historyDays);
  }, [selectedCoin, historyDays, fetchHistory]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(price);

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  const estimatedTotal =
    selectedCoin && amount
      ? parseFloat(amount) * selectedCoin.current_price
      : 0;

  const getChangeForPeriod = (value: HistoryDays): number => {
    if (value === 1) return selectedCoin?.price_change_percentage_24h ?? 0;
    if (value === 7) return change7d;
    return change1y;
  };

  const handleTrade = async (type: "buy" | "sell") => {
    if (!selectedCoin || !amount) return;
    setLoading(true);

    try {
      const fn = type === "buy" ? apiClient.buy : apiClient.sell;
      const data = await fn({
        coin_id: selectedCoin.id,
        coin_name: selectedCoin.name,
        amount: parseFloat(amount),
        price: selectedCoin.current_price,
      });
      toast.success(data.message);
      setAmount("");
      onTradeComplete();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* コイン選択ヘッダー */}
      <div className="px-6 pt-6 pb-4">
        <CoinSelector
          coins={coins}
          selectedCoin={selectedCoin}
          onChange={setSelectedCoin}
        />
      </div>

      {/* 価格推移 + チャート（コイン選択後のみ） */}
      {selectedCoin && (
        <>
          {/* 変動率 + 期間切り替え */}
          <div className="flex items-center gap-2 px-6 py-3 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-400 flex-shrink-0">
              価格推移
            </span>
            {PERIOD_OPTIONS.map(({ shortLabel, value }) => {
              const change = getChangeForPeriod(value);
              const isActive = historyDays === value;
              return (
                <button
                  key={value}
                  onClick={() => setHistoryDays(value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span>{shortLabel}</span>
                  <span
                    className={
                      change >= 0 ? "text-emerald-600" : "text-rose-500"
                    }
                  >
                    {formatPercentage(change)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* チャート */}
          <div className="px-2 border-t border-gray-100">
            <ResponsiveContainer
              key={`${selectedCoin.id}-${historyDays}`}
              width="100%"
              height={160}
            >
              <LineChart data={priceHistory}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis dataKey="date" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  formatter={(val: unknown) => {
                    const numericVal =
                      typeof val === "number" ? val : Number(val);
                    const priceText = isNaN(numericVal)
                      ? String(val)
                      : formatPrice(numericVal);
                    return [priceText, "価格"] as [string, string];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* 数量 + BUY/SELL */}
      <div className="px-6 py-4 border-t border-gray-100 space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700 flex-shrink-0">
            数量
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.001"
            step="0.0001"
            className="w-32 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-sm font-bold text-gray-500 flex-shrink-0 ml-auto">
            合計
          </span>
          <span className="text-sm font-bold text-gray-900 flex-shrink-0">
            ¥{estimatedTotal > 0 ? Math.round(estimatedTotal).toLocaleString() : "0"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleTrade("buy")}
            disabled={loading}
            className="py-2 rounded-xl font-black text-sm text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            BUY
          </button>
          <button
            onClick={() => handleTrade("sell")}
            disabled={loading}
            className="py-2 rounded-xl font-black text-sm text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50"
          >
            SELL
          </button>
        </div>
      </div>
    </div>
  );
};
