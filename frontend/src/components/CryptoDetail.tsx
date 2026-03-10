// src/components/CryptoDetail.tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import Image from "next/image";
import { Coin, PriceHistoryPoint } from "@/types/coin";
import type { HistoryDays } from "@/types/api";

interface CryptoDetailProps {
  crypto: Coin;
  priceHistory: PriceHistoryPoint[];
  priceChange7d: number;
  priceChange1y: number;
  historyDays: HistoryDays;
  onHistoryDaysChange: (days: HistoryDays) => void;
}

const PERIOD_OPTIONS: { label: string; value: HistoryDays }[] = [
  { label: "24時間", value: 1 },
  { label: "7日間", value: 7 },
  { label: "1年間", value: 365 },
];

export function CryptoDetail({
  crypto,
  priceHistory,
  priceChange7d,
  priceChange1y,
  historyDays,
  onHistoryDaysChange,
}: CryptoDetailProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatPercentage = (value: number | undefined | null) => {
    const safeValue = value ?? 0;
    const sign = safeValue >= 0 ? "+" : "";
    return `${sign}${safeValue.toFixed(2)}%`;
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    return `$${(value / 1e6).toFixed(2)}M`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm">
      <div className="flex items-center gap-4">
        {crypto.image && (
          <div className="relative w-16 h-16">
            <Image
              src={crypto.image}
              alt={crypto.name}
              fill
              sizes="64px"
              className="object-contain"
            />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{crypto.name}</h2>
          <p className="text-gray-500 uppercase font-medium">{crypto.symbol}</p>
        </div>
      </div>

      <div>
        <p className="text-gray-500 text-sm font-medium">現在価格</p>
        <p className="text-4xl font-black text-gray-900">
          {formatPrice(crypto.current_price)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "24時間", val: crypto.price_change_percentage_24h },
          { label: "7日間", val: priceChange7d },
          { label: "1年間", val: priceChange1y },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-gray-50 rounded-xl p-4 border border-gray-100"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1 font-bold">
              <Calendar className="w-3 h-3" /> {item.label}
            </div>
            <div
              className={`flex items-center gap-1 font-bold ${item.val >= 0 ? "text-emerald-600" : "text-rose-600"}`}
            >
              {item.val >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{formatPercentage(item.val)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-500 font-bold mb-1">時価総額</p>
          <p className="font-bold text-gray-900">
            {formatMarketCap(crypto.market_cap)}
          </p>
        </div>
        <div className="text-right text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          RANK #{crypto.market_cap_rank}
        </div>
      </div>

      <div className="pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" /> 価格推移
          </h3>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {PERIOD_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onHistoryDaysChange(value)}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${
                  historyDays === value
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full min-w-0">
          <ResponsiveContainer
            key={`${crypto.id}-${historyDays}`}
            width="100%"
            height={256}
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
                  // [表示する値, ラベル] の形式であることを型アサーションで教える
                  return [priceText, "価格"] as [string, string];
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#4f46e5"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
