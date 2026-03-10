// src/app/trade/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertCircle } from "lucide-react";
import Image from "next/image";
import { Coin } from "@/types/coin";
import { API_BASE_URL } from "@/lib/config";

interface Holding {
  id: number;
  coin_id: string;
  coin_name: string;
  amount: number;
  avg_price: number;
}

interface User {
  id: number;
  balance: number;
}

export default function TradePage() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // 初期残高設定用
  const [initBalance, setInitBalance] = useState("");
  const [showInit, setShowInit] = useState(false);

  const fetchUser = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/user`);
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      setShowInit(false);
    } else {
      setShowInit(true);
    }
  }, []);

  const fetchCoins = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/coins`);
    const data = await res.json();
    setCoins(data);
    if (data.length > 0) setSelectedCoin(data[0]);
  }, []);

  const fetchHoldings = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/holdings`);
    const data = await res.json();
    setHoldings(data);
  }, []);

  useEffect(() => {
    fetchUser();
    fetchCoins();
    fetchHoldings();
  }, [fetchUser, fetchCoins, fetchHoldings]);

  const handleInit = async () => {
    const res = await fetch(`${API_BASE_URL}/api/user/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance: parseFloat(initBalance) }),
    });
    if (res.ok) {
      fetchUser();
    }
  };

  const handleTrade = async (type: "buy" | "sell") => {
    if (!selectedCoin || !amount) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/trade/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coin_id: selectedCoin.id,
          coin_name: selectedCoin.name,
          amount: parseFloat(amount),
          price: selectedCoin.current_price,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setMessage(data.message);
        setAmount("");
        fetchUser();
        fetchHoldings();
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const total =
    selectedCoin && amount
      ? parseFloat(amount) * selectedCoin.current_price
      : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-xl font-black tracking-tight text-gray-900">
            トレード
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* 初期残高設定 */}
        {showInit && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900">初期残高を設定</h2>
            <input
              type="number"
              value={initBalance}
              onChange={(e) => setInitBalance(e.target.value)}
              placeholder="例: 1000000"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleInit}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              設定する
            </button>
          </div>
        )}

        {/* 残高表示 */}
        {user && (
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
            <p className="text-indigo-100 text-sm font-bold">利用可能残高</p>
            <p className="text-4xl font-black mt-1">
              ¥{user.balance.toLocaleString()}
            </p>
          </div>
        )}

        {/* トレードフォーム */}
        {user && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            {/* コイン選択 */}
            <div className="relative">
              <select
                value={selectedCoin?.id || ""}
                onChange={(e) => {
                  const coin = coins.find((c) => c.id === e.target.value);
                  if (coin) setSelectedCoin(coin);
                }}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
              >
                {coins.map((coin) => (
                  <option key={coin.id} value={coin.id}>
                    {coin.name} (¥{coin.current_price.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* 現在価格 */}
            {selectedCoin && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {selectedCoin.image && (
                  <div className="relative w-8 h-8">
                    <Image
                      src={selectedCoin.image}
                      alt={selectedCoin.name}
                      fill
                      sizes="32px"
                      className="object-contain"
                    />
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">現在価格</p>
                  <p className="font-bold text-gray-900">
                    ¥{selectedCoin.current_price.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* 数量入力 */}
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
              {total > 0 && (
                <p className="text-sm text-gray-500">
                  合計:{" "}
                  <span className="font-bold text-gray-900">
                    ¥{total.toLocaleString()}
                  </span>
                </p>
              )}
            </div>

            {/* エラー・メッセージ */}
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

            {/* BUY / SELL ボタン */}
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
        )}

        {/* 保有残高 */}
        {holdings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900">保有残高</h2>
            {holdings.map((h) => (
              <div
                key={h.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="font-bold text-gray-900">{h.coin_name}</p>
                  <p className="text-xs text-gray-500">
                    平均取得価格 ¥{h.avg_price.toLocaleString()}
                  </p>
                </div>
                <p className="font-mono font-bold text-gray-900">
                  {h.amount}枚
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
