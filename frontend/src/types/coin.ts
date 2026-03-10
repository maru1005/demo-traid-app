// src/types/coin.ts
export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number; 
  price_change_percentage_1y_in_currency: number;  
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}