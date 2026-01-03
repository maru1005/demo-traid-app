// src/types/coin.ts
export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number; // Go側のJSONキーに合わせて調整
  market_cap: number;
  market_cap_rank: number;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

