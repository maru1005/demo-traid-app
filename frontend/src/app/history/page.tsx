// src/app/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Trade } from "@/types";
import { API_BASE_URL } from "@/lib/config";

export default function HistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const fetchTrades = async () => {
      const res = await fetch(`${API_BASE_URL}/api/trades`);
      const data = await res.json();
      setTrades(data);
    };
    fetchTrades();
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-xl font-black tracking-tight text-gray-900">
            取引履歴
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-3">
        {trades.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-bold">取引履歴がありません</p>
          </div>
        ) : (
          trades.map((trade) => (
            <div
              key={trade.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      trade.type === "buy"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {trade.type === "buy" ? "BUY" : "SELL"}
                  </span>
                  <p className="font-bold text-gray-900">{trade.coin_name}</p>
                </div>
                <p className="font-mono font-bold text-gray-900">
                  ¥{trade.total.toLocaleString()}
                </p>
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>
                  {trade.amount}枚 @ ¥{trade.price.toLocaleString()}
                </span>
                <span>{formatDate(trade.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
