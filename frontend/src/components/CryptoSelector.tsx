// src/components/CryptoSelector.tsx
"use client";

import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { Coin } from '@/types/coin';

interface CryptoSelectorProps {
  cryptos: Coin[];
  selectedCrypto: Coin | null;
  onSelect: (crypto: Coin) => void;
}

export function CryptoSelector({ cryptos, selectedCrypto, onSelect }: CryptoSelectorProps) {
  // 価格フォーマット用
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
      {/* 1. タイトル部分 */}
      <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">
        分析する銘柄を選択
      </h3>

      {/* 2. セレクトボックス（プルダウン） */}
      <div className="relative">
        <select
          value={selectedCrypto?.id || ''}
          onChange={(e) => {
            const crypto = cryptos.find(c => c.id === e.target.value);
            if (crypto) onSelect(crypto);
          }}
          className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer font-bold text-gray-700"
        >
          {/* 未選択時のプレースホルダー */}
          <option value="" disabled>銘柄を選んでください</option>
          
          {cryptos.length === 0 ? (
            <option disabled>読み込み中...</option>
            ) : (
          cryptos.map((crypto) => (
            <option key={crypto.id} value={crypto.id}>
              #{crypto.market_cap_rank} {crypto.name} ({crypto.symbol.toUpperCase()})
            </option>
          ))
        )}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      {/* 3. 選択後のプレビューカード（選択されている時だけ表示） */}
      {selectedCrypto && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl text-white shadow-lg shadow-indigo-100">
          
          {/* 左側：アイコンと名前 */}
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 bg-white rounded-full flex-shrink-0">
              {/* 画像がある時だけ Image コンポーネントを出す（エラー防止） */}
              {selectedCrypto.image ? (
                <Image 
                  src={selectedCrypto.image} 
                  alt={selectedCrypto.name} 
                  fill 
                  className="object-contain p-2" 
                />
              ) : (
                <div className="w-full h-full bg-gray-200 rounded-full" />
              )}
            </div>
            <div>
              <p className="font-black text-lg leading-tight">{selectedCrypto.name}</p>
              <p className="text-indigo-100 text-xs font-bold uppercase">{selectedCrypto.symbol}</p>
            </div>
          </div>

          {/* 右側：現在の価格 */}
          <div className="text-right">
            <p className="font-mono font-bold text-xl leading-tight">
              {formatPrice(selectedCrypto.current_price)}
            </p>
            <p className="text-xs font-bold opacity-80 italic">RANK #{selectedCrypto.market_cap_rank}</p>
          </div>

        </div>
      )}
    </div>
  );
}