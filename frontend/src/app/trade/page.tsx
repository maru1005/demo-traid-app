"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Coin, User, HoldingPnL, Trade } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { TradeSimulator } from "@/components/TradeSimulator";
import { TargetPnLCard } from "@/components/TargetPnLCard";
import { CoinSelector } from "@/components/CoinSelector";

export default function TradePage() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [holdingsPnL, setHoldingsPnL] = useState<HoldingPnL[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [depositAmount, setDepositAmount] = useState("");
  const [showDeposit, setShowDeposit] = useState(false);

  const [targetPnL, setTargetPnL] = useState(100000);

  const fetchUser = useCallback(async () => {
    const data = await apiClient.getUser();
    setUser(data);
  }, []);

  const fetchCoins = useCallback(async () => {
    const data = await apiClient.getCoins();
    setCoins(data);
    if (data.length > 0) setSelectedCoin(data[0]);
  }, []);

  const fetchHoldingsPnL = useCallback(async () => {
    const data = await apiClient.getHoldingsPnL();
    setHoldingsPnL(data);
  }, []);

  const fetchRecentTrades = useCallback(async () => {
    const data = await apiClient.getTrades();
    setRecentTrades(data.slice(0, 5));
  }, []);

  useEffect(() => {
    fetchUser();
    fetchCoins();
    fetchHoldingsPnL();
    fetchRecentTrades();
  }, [fetchUser, fetchCoins, fetchHoldingsPnL, fetchRecentTrades]);

  // 総資産 = 残高 + 保有コイン時価
  const totalAssets = useMemo(() => {
    const holdingsValue = holdingsPnL.reduce(
      (sum, h) => sum + h.current_price * h.amount,
      0,
    );
    return (user?.balance ?? 0) + holdingsValue;
  }, [user, holdingsPnL]);

  // 現在の実損益（総資産ベース）- TargetPnLCardに渡す
  // 初期残高が取れないため、holdingsPnLの合計損益で代用（セッション設計後に改善）
  const currentPnL = useMemo(() => {
    return holdingsPnL.reduce((sum, h) => sum + h.pnl, 0);
  }, [holdingsPnL]);

  const handleDeposit = async () => {
    if (!depositAmount) return;
    await apiClient.deposit({ amount: parseFloat(depositAmount) });
    setDepositAmount("");
    setShowDeposit(false);
    fetchUser();
  };

  const handleTrade = async (type: "buy" | "sell") => {
    if (!selectedCoin || !amount) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const fn = type === "buy" ? apiClient.buy : apiClient.sell;
      const data = await fn({
        coin_id: selectedCoin.id,
        coin_name: selectedCoin.name,
        amount: parseFloat(amount),
        price: selectedCoin.current_price,
      });
      setMessage(data.message);
      setAmount("");
      fetchUser();
      fetchHoldingsPnL();
      fetchRecentTrades();
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const estimatedTradeTotal =
    selectedCoin && amount
      ? parseFloat(amount) * selectedCoin.current_price
      : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tight text-gray-900">
            トレード
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* 上段：総資産 + 目標損益 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 総資産カード */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-indigo-100 text-sm font-bold">総資産</p>
            <p className="text-4xl font-black mt-1">
              ¥{totalAssets.toLocaleString()}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-indigo-200 text-xs">
                利用可能残高: ¥{(user?.balance ?? 0).toLocaleString()}
              </p>
              <button
                onClick={() => setShowDeposit((v) => !v)}
                className="text-xs font-bold text-indigo-200 hover:text-white transition-colors"
              >
                {showDeposit ? "▲ 閉じる" : "＋ 入金"}
              </button>
            </div>

            {showDeposit && (
              <div className="mt-4 space-y-2">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="例: 100000"
                  className="w-full bg-white/20 text-white placeholder-indigo-300 border border-white/30 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <button
                  onClick={handleDeposit}
                  className="w-full bg-white text-indigo-600 py-2 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
                >
                  入金する
                </button>
              </div>
            )}
          </div>

          {/* 目標損益カード */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">目標損益</h2>
            <TargetPnLCard
              targetPnL={targetPnL}
              currentPnL={currentPnL}
              onChange={setTargetPnL}
            />
          </div>
        </div>

        {/* 中段：トレード + シミュレーター */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* 左：トレードフォーム */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900">トレード</h2>

            <CoinSelector
              coins={coins}
              selectedCoin={selectedCoin}
              onChange={setSelectedCoin}
            />

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">数量</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="例: 0.001"
                step="0.0001"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {estimatedTradeTotal > 0 && (
                <p className="text-sm text-gray-500">
                  合計:{" "}
                  <span className="font-bold text-gray-900">
                    ¥{estimatedTradeTotal.toLocaleString()}
                  </span>
                </p>
              )}
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}
            {message && (
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-emerald-600">
                <p className="text-sm font-bold">{message}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTrade("buy")}
                disabled={loading}
                className="py-4 rounded-xl font-black text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                BUY
              </button>
              <button
                onClick={() => handleTrade("sell")}
                disabled={loading}
                className="py-4 rounded-xl font-black text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                SELL
              </button>
            </div>
          </div>

          {/* 右：シミュレーター */}
          <div className="lg:sticky lg:top-24">
            <TradeSimulator holdings={holdingsPnL} coins={coins} />
          </div>
        </div>

        {/* 下段：直近5件の売買履歴 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">直近の取引</h2>
          {recentTrades.length === 0 ? (
            <p className="text-sm text-gray-400">取引履歴がありません</p>
          ) : (
            <div className="space-y-2">
              {recentTrades.map((trade) => {
                const isBuy = trade.type === "buy";
                return (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-black px-2 py-1 rounded-md ${
                          isBuy
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-rose-100 text-rose-500"
                        }`}
                      >
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {trade.coin_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(trade.created_at).toLocaleString("ja-JP")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        ¥{trade.total.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {trade.amount} 枚 @ ¥{trade.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
