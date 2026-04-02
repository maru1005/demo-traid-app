// src/app/history/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Trade } from "@/types";
import { apiClient } from "@/lib/apiClient";

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = Number(params.id);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const data = await apiClient.getSessionTrades(sessionId);
      setTrades(data);
      setLoading(false);
    };
    fetch();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/history"
              className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
            >
              ← 履歴
            </Link>
            <h1 className="text-xl font-black tracking-tight text-gray-900">
              セッション {sessionId}
            </h1>
          </div>
          <nav className="hidden lg:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
            >
              ダッシュボード
            </Link>
            <Link
              href="/trade"
              className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
            >
              トレード
            </Link>
            <Link href="/history" className="text-sm font-bold text-indigo-600">
              履歴
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-bold">取引履歴がありません</p>
          </div>
        ) : (
          trades.map((trade) => {
            const isBuy = trade.type === "buy";
            const isDeposit = trade.type === "deposit";
            return (
              <div
                key={trade.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black ${
                        isDeposit
                          ? "bg-indigo-50 text-indigo-600"
                          : isBuy
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {isDeposit ? "入金" : isBuy ? "BUY" : "SELL"}
                    </span>
                    <p className="font-bold text-gray-900">{trade.coin_name}</p>
                  </div>
                  <p className="font-mono font-bold text-gray-900">
                    ¥{trade.total.toLocaleString()}
                  </p>
                </div>
                {!isDeposit && (
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>
                      {trade.amount}枚 @ ¥{trade.price.toLocaleString()}
                    </span>
                    <span>
                      {new Date(trade.created_at).toLocaleString("ja-JP")}
                    </span>
                  </div>
                )}
                {isDeposit && (
                  <div className="mt-2 text-xs text-gray-400">
                    {new Date(trade.created_at).toLocaleString("ja-JP")}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
