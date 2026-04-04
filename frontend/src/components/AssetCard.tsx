// src/components/AssetCard.tsx
"use client";

import { useState, useMemo } from "react";
import { User, HoldingPnL } from "@/types";
import { apiClient } from "@/lib/apiClient";

type Props = {
  user: User | null;
  holdingsPnL: HoldingPnL[];
  onDepositComplete: () => void;
};

export const AssetCard = ({ user, holdingsPnL, onDepositComplete }: Props) => {
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");

  const totalAssets = useMemo(() => {
    const holdingsValue = holdingsPnL.reduce(
      (sum, h) => sum + h.current_price * h.amount,
      0,
    );
    return (user?.balance ?? 0) + holdingsValue;
  }, [user, holdingsPnL]);

  const handleDeposit = async () => {
    if (!depositAmount) return;
    await apiClient.deposit({ amount: parseFloat(depositAmount) });
    setDepositAmount("");
    setShowDeposit(false);
    onDepositComplete();
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        {/* 総資産 | 利用可能残高 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs font-bold text-gray-400 mb-1">総資産</p>
            <p className="text-2xl font-black text-gray-900">
              ¥{totalAssets.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 mb-1">利用可能残高</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-gray-900">
                ¥{(user?.balance ?? 0).toLocaleString()}
              </p>
              <button
                onClick={() => setShowDeposit(true)}
                className="text-xs font-bold text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50 transition-colors flex-shrink-0"
              >
                入金
              </button>
            </div>
          </div>
        </div>

        {/* 保有コイン一覧 */}
        {holdingsPnL.length > 0 && (
          <div className="border-t border-gray-100 pt-4 space-y-2">
            {holdingsPnL.map((h) => (
              <div key={h.coin_id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">{h.coin_name}</p>
                  <p className="text-xs text-gray-400">{h.amount}枚</p>
                </div>
                <p
                  className={`text-sm font-bold ${h.pnl >= 0 ? "text-emerald-600" : "text-rose-500"}`}
                >
                  {h.pnl >= 0 ? "+" : ""}¥{Math.round(h.pnl).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 入金モーダル */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-black text-gray-900">入金</h2>
              <p className="text-sm text-gray-500 mt-1">入金額を入力してください</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">金額</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="100,000"
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowDeposit(false); setDepositAmount(""); }}
                className="py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeposit}
                className="py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                入金する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
