// src/components/CoinSelector.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Coin } from "@/types";

type Props = {
  coins: Coin[];
  selectedCoin: Coin | null;
  onChange: (coin: Coin) => void;
};

export const CoinSelector = ({ coins, selectedCoin, onChange }: Props) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(price);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between">
      <div className="relative" ref={ref}>
        <button
          onClick={() => setShowDropdown((v) => !v)}
          className={`flex items-center gap-2 hover:bg-gray-50 rounded-xl px-3 py-2 transition-colors ${
            selectedCoin ? "-ml-3" : "w-full justify-center"
          }`}
        >
          {selectedCoin && (
            <div className="relative w-7 h-7 flex-shrink-0">
              <Image
                src={selectedCoin.image}
                alt={selectedCoin.name}
                fill
                sizes="28px"
                className="object-contain"
              />
            </div>
          )}
          <span className={`font-bold ${selectedCoin ? "text-gray-900" : "text-gray-400"}`}>
            {selectedCoin?.name ?? "選択してください"}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showDropdown ? "rotate-180" : ""}`}
          />
        </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[200px] overflow-hidden">
              {coins.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => {
                    onChange(coin);
                    setShowDropdown(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors ${
                    coin.id === selectedCoin?.id ? "bg-indigo-50" : ""
                  }`}
                >
                  <div className="relative w-6 h-6 flex-shrink-0">
                    {coin.image && (
                      <Image
                        src={coin.image}
                        alt={coin.name}
                        fill
                        sizes="24px"
                        className="object-contain"
                      />
                    )}
                  </div>
                  <span className="text-left font-bold text-gray-900 text-sm">
                    {coin.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

      {selectedCoin && (
        <div className="text-right">
          <p className="text-2xl font-black text-gray-900">
            {formatPrice(selectedCoin.current_price)}
          </p>
        </div>
      )}
    </div>
  );
};
