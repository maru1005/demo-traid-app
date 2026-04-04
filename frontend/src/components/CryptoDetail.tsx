// src/components/CryptoDetail.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Calendar, ChevronDown } from "lucide-react";
import Image from "next/image";
import { Coin, PriceHistoryPoint } from "@/types/coin";
import type { HistoryDays } from "@/types/api";

interface CryptoDetailProps {
  crypto: Coin;
  coins: Coin[];
  onCoinSelect: (coin: Coin) => void;
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
  coins,
  onCoinSelect,
  priceHistory,
  priceChange7d,
  priceChange1y,
  historyDays,
  onHistoryDaysChange,
}: CryptoDetailProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatPercentage = (value: number | undefined | null) => {
    const safeValue = value ?? 0;
    const sign = safeValue >= 0 ? "+" : "";
    return `${sign}${safeValue.toFixed(2)}%`;
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `¥${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `¥${(value / 1e9).toFixed(2)}B`;
    return `¥${(value / 1e6).toFixed(2)}M`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm">
      {/* ヘッダー: 銘柄選択ドロップダウン + 現在価格 */}
      <div className="flex items-center justify-between">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="flex items-center gap-2 hover:bg-gray-50 rounded-xl px-3 py-2 -ml-3 transition-colors"
          >
            <div className="relative w-8 h-8 flex-shrink-0">
              {crypto.image && (
                <Image
                  src={crypto.image}
                  alt={crypto.name}
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              )}
            </div>
            <span className="text-xl font-bold text-gray-900">
              {crypto.name}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${showDropdown ? "rotate-180" : ""}`}
            />
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[200px] overflow-hidden">
              {coins.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => {
                    onCoinSelect(coin);
                    setShowDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                    coin.id === crypto.id ? "bg-indigo-50" : ""
                  }`}
                >
                  {coin.image && (
                    <div className="relative w-6 h-6 flex-shrink-0">
                      <Image
                        src={coin.image}
                        alt={coin.name}
                        fill
                        sizes="24px"
                        className="object-contain"
                      />
                    </div>
                  )}
                  <span className="font-bold text-gray-900 text-sm">
                    {coin.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-right">
          <p className="text-2xl font-black text-gray-900">
            {formatPrice(crypto.current_price)}
          </p>
          <p
            className={`text-sm font-bold ${
              crypto.price_change_percentage_24h >= 0
                ? "text-emerald-600"
                : "text-rose-500"
            }`}
          >
            {formatPercentage(crypto.price_change_percentage_24h)}
          </p>
        </div>
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

      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-xs text-gray-500 font-bold mb-1">時価総額</p>
        <p className="font-bold text-gray-900">
          {formatMarketCap(crypto.market_cap)}
        </p>
      </div>

      <div className="pt-4">
        <div className="flex flex-wrap items-center gap-4 mb-4">
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
