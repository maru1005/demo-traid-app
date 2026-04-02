// src/app/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SessionSummary } from "@/types";
import { apiClient } from "@/lib/apiClient";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchSessions = async () => {
    const data = await apiClient.getSessions();
    setSessions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (sessionId: number) => {
    if (!confirm(`セッション ${sessionId} の履歴を削除しますか？`)) return;
    setDeletingId(sessionId);
    try {
      await apiClient.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tight text-gray-900">
            取引履歴
          </h1>
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

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-bold">取引履歴がありません</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.session_id}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-bold">
                    セッション {session.session_id}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(session.started_at).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}{" "}
                    開始
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(session.session_id)}
                  disabled={deletingId === session.session_id}
                  className="text-xs font-bold text-gray-300 hover:text-rose-400 transition-colors disabled:opacity-50"
                >
                  削除
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-bold">累計入金</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">
                    ¥{session.total_deposited.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-bold">初期資金</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">
                    ¥{session.initial_balance.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-bold">取引回数</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">
                    {session.trade_count}回
                  </p>
                </div>
              </div>

              <Link
                href={`/history/${session.session_id}`}
                className="block w-full text-center text-sm font-bold text-indigo-600 hover:text-indigo-700 py-2 border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-colors"
              >
                取引詳細を見る →
              </Link>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
