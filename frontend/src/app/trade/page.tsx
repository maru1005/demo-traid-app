// src/app/trade/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Coin, User, HoldingPnL } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { supabase } from "@/lib/supabase";
import { TargetPnLCard } from "@/components/TargetPnLCard";
import { Onboarding } from "@/components/Onboarding";
import { TradeForm } from "@/components/TradeForm";
import { AssetCard } from "@/components/AssetCard";
import { SimulatorWithAnalysis } from "@/components/SimulatorWithAnalysis";

type PageState = "loading" | "onboarding" | "trading" | "achieved";

export default function TradePage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [coins, setCoins] = useState<Coin[]>([]);
  const [holdingsPnL, setHoldingsPnL] = useState<HoldingPnL[]>([]);
  const [user, setUser] = useState<User | null>(null);
  // リセットモーダル
  const [showReset, setShowReset] = useState(false);
  const [resetBalance, setResetBalance] = useState("");
  const [resetTarget, setResetTarget] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // 目標再設定モーダル（続けるケース）
  const [showUpdateTarget, setShowUpdateTarget] = useState(false);
  const [newTarget, setNewTarget] = useState("");
  const [updateTargetLoading, setUpdateTargetLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    const data = await apiClient.getUser();
    setUser(data);
    if (!data || data.initial_balance === 0 || data.session_id === 0) {
      setPageState("onboarding");
    } else {
      setPageState("trading");
    }
  }, []);

  const fetchCoins = useCallback(async () => {
    const data = await apiClient.getCoins();
    setCoins(data);
  }, []);

  const fetchHoldingsPnL = useCallback(async () => {
    const data = await apiClient.getHoldingsPnL();
    setHoldingsPnL(data);
  }, []);

  useEffect(() => {
    fetchUser();
    fetchCoins();
    fetchHoldingsPnL();
  }, [fetchUser, fetchCoins, fetchHoldingsPnL]);

  const totalAssets = useMemo(() => {
    const holdingsValue = holdingsPnL.reduce(
      (sum, h) => sum + h.current_price * h.amount,
      0,
    );
    return (user?.balance ?? 0) + holdingsValue;
  }, [user, holdingsPnL]);

  const currentPnL = useMemo(() => {
    return holdingsPnL.reduce((sum, h) => sum + h.pnl, 0);
  }, [holdingsPnL]);

  useEffect(() => {
    if (pageState !== "trading" || !user || user.initial_balance === 0) return;
    const isAchieved = totalAssets >= user.total_deposited + user.target_pnl;
    if (isAchieved) setPageState("achieved");
  }, [totalAssets, user, pageState]);

  const handleReset = async () => {
    const balance = parseFloat(resetBalance);
    const target = parseFloat(resetTarget);
    if (!balance || balance <= 0 || !target || target <= 0) return;

    setResetLoading(true);
    try {
      await apiClient.resetSession({
        initial_balance: balance,
        target_pnl: target,
      });
      setShowReset(false);
      setResetBalance("");
      setResetTarget("");
      setPageState("trading");
      fetchUser();
      fetchHoldingsPnL();
    } catch {
      toast.error("リセットに失敗しました");
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleUpdateTarget = async () => {
    const target = parseFloat(newTarget);
    if (!target || target <= 0) return;

    setUpdateTargetLoading(true);
    try {
      await apiClient.updateTarget({ target_pnl: target });
      setShowUpdateTarget(false);
      setNewTarget("");
      setPageState("trading");
      fetchUser();
    } catch {
      toast.error("目標の更新に失敗しました");
    } finally {
      setUpdateTargetLoading(false);
    }
  };

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tight text-gray-900">
            トレード
          </h1>
          <nav className="hidden lg:flex items-center gap-6">
            <Link
              href="/history"
              className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
            >
              履歴
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              ログアウト
            </button>
          </nav>
        </div>
      </header>

      {/* 目標達成バナー */}
      {pageState === "achieved" && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-6 text-center space-y-4">
          <p className="text-2xl font-black">🎉 目標達成！</p>
          <p className="text-sm font-bold opacity-90">
            総資産 ¥{totalAssets.toLocaleString()} で目標を達成しました
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowUpdateTarget(true)}
              className="bg-white text-orange-500 font-black px-6 py-2 rounded-xl hover:bg-orange-50 transition-colors"
            >
              続ける → 目標再設定
            </button>
            <button
              onClick={() => setShowReset(true)}
              className="bg-orange-600 text-white font-black px-6 py-2 rounded-xl hover:bg-orange-700 transition-colors"
            >
              リセットして始める
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* 上段：左（AssetCard + TargetPnLCard）/ 右（TradeForm） */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <AssetCard
              user={user}
              holdingsPnL={holdingsPnL}
              onDepositComplete={fetchUser}
            />
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-900">目標損益</h2>
                <button
                  onClick={() => setShowReset(true)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  リセット
                </button>
              </div>
              <TargetPnLCard
                targetPnL={user?.target_pnl ?? 0}
                currentPnL={currentPnL}
                onChange={() => {}}
              />
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <TradeForm
              coins={coins}
              onTradeComplete={() => {
                fetchUser();
                fetchHoldingsPnL();
              }}
            />
          </div>
        </div>

        {/* 下段：シミュレーター + AI分析（統合、全幅） */}
        <SimulatorWithAnalysis coins={coins} holdings={holdingsPnL} user={user} />
      </main>

      {pageState === "onboarding" && (
        <Onboarding onComplete={() => { fetchUser(); fetchHoldingsPnL(); }} />
      )}

      {/* 目標再設定モーダル（続けるケース） */}
      {showUpdateTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-black text-gray-900">
                目標損益を再設定
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                保有コインと残高はそのままで目標だけ変更します
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                新しい目標損益
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                  ¥
                </span>
                <input
                  type="number"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="100,000"
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowUpdateTarget(false)}
                className="py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateTarget}
                disabled={updateTargetLoading}
                className="py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {updateTargetLoading ? "処理中..." : "設定する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* リセットモーダル */}
      {showReset && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-black text-gray-900">目標を再設定</h2>
              <p className="text-sm text-gray-500 mt-1">
                新しい初期資金と目標損益を入力してください
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">
                  初期資金
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                    ¥
                  </span>
                  <input
                    type="number"
                    value={resetBalance}
                    onChange={(e) => setResetBalance(e.target.value)}
                    placeholder="1,000,000"
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">
                  目標損益
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                    ¥
                  </span>
                  <input
                    type="number"
                    value={resetTarget}
                    onChange={(e) => setResetTarget(e.target.value)}
                    placeholder="100,000"
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowReset(false)}
                className="py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleReset}
                disabled={resetLoading}
                className="py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {resetLoading ? "処理中..." : "設定する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
