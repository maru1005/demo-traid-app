/**
 * トレード関連の型定義
 * デモトレード機能のドメインモデルを一元管理します。
 */

// =============================================================================
// ドメインモデル
// =============================================================================

export interface User {
    id: number;
    balance: number;
  }
  
  export interface Holding {
    id: number;
    coin_id: string;
    coin_name: string;
    amount: number;
    avg_price: number;
  }
  
  export interface HoldingPnL {
    coin_id: string;
    coin_name: string;
    amount: number;
    avg_price: number;
    current_price: number;
    pnl: number;
    pnl_percent: number;
  }
  
  export interface Trade {
    id: number;
    coin_id: string;
    coin_name: string;
    type: "buy" | "sell";
    amount: number;
    price: number;
    total: number;
    created_at: string;
  }
  
  // =============================================================================
  // リクエスト型
  // =============================================================================
  
  export interface TradeRequest {
    coin_id: string;
    coin_name: string;
    amount: number;
    price: number;
  }
  
  export interface InitUserRequest {
    balance: number;
  }
  
  export interface DepositRequest {
    amount: number;
  }
  
  // =============================================================================
  // レスポンス型
  // =============================================================================
  
  export type GetHoldingsResponse = Holding[];
  export type GetHoldingsPnLResponse = HoldingPnL[];
  export type GetTradesResponse = Trade[];
  
  export interface TradeResponse {
    message: string;
    balance: number;
  }