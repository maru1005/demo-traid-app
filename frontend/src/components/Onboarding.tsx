// src/components/Onboarding.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

type Props = {
  onComplete: () => void;
};

export const Onboarding = ({ onComplete }: Props) => {
  const [initialBalance, setInitialBalance] = useState("");
  const [targetPnL, setTargetPnL] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    const balance = parseFloat(initialBalance);
    const target = parseFloat(targetPnL);

    if (!balance || balance <= 0 || !target || target <= 0) {
      toast.error("初期残高と目標損益を正しく入力してください");
      return;
    }

    setLoading(true);

    try {
      const { apiClient } = await import("@/lib/apiClient");
      await apiClient.startSession({
        initial_balance: balance,
        target_pnl: target,
      });
      onComplete();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-md space-y-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">
            デモトレへようこそ
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            仮想の資金でトレード練習ができます。初期資金と目標損益を設定してください
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">初期資金</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                ¥
              </span>
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="1,000,000"
                className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">目標損益</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                ¥
              </span>
              <input
                type="number"
                value={targetPnL}
                onChange={(e) => setTargetPnL(e.target.value)}
                placeholder="100,000"
                className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? "設定中..." : "練習を始める"}
        </button>
      </div>
    </div>
  );
};
