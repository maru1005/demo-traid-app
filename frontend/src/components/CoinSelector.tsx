// src/components/CoinSelector.tsx
"use client";

import Image from "next/image";
import { Coin } from "@/types";

type Props = {
  coins: Coin[];
  selectedCoin: Coin | null;
  onChange: (coin: Coin) => void;
};

export const CoinSelector = ({ coins, selectedCoin, onChange }: Props) => {
  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">対象コイン</p>

      <select
        value={selectedCoin?.id || ""}
        onChange={(e) => {
          const coin = coins.find((c) => c.id === e.target.value);
          if (coin) onChange(coin);
        }}
        className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700"
      >
        {coins.map((coin) => (
          <option key={coin.id} value={coin.id}>
            {coin.name} (¥{coin.current_price.toLocaleString()})
          </option>
        ))}
      </select>

      {selectedCoin && (
        <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
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
    </div>
  );
};
