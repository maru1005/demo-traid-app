/**
 * API定義
 * バックエンドのエンドポイントとリクエスト/レスポンスの型を一元管理します。
 */

import type { Coin, PriceHistoryPoint } from "./coin";

// =============================================================================
// エンドポイントパス
// =============================================================================

/** APIのベースパス（/api） */
export const API_BASE_PATH = "/api" as const;

/** コイン一覧取得 */
export const API_PATHS = {
  /** GET コイン一覧 */
  coins: `${API_BASE_PATH}/coins`,
  /** GET AI分析（クエリ: name, price, change） */
  analyze: `${API_BASE_PATH}/analyze`,
  /** GET 価格履歴（クエリ: id） */
  history: `${API_BASE_PATH}/history`,
} as const;

// =============================================================================
// リクエストパラメータ
// =============================================================================

/** GET /api/coins - パラメータなし */
export type GetCoinsParams = Record<string, never>;

/** GET /api/analyze のクエリパラメータ */
export interface GetAnalyzeParams {
  name: string;
  price: number;
  change: number;
}

/** 価格履歴の取得期間（days） */
export type HistoryDays = 1 | 7 | 365;

/** GET /api/history のクエリパラメータ */
export interface GetHistoryParams {
  id: string;
  /** 1=24時間, 7=7日間, 365=1年間。省略時は365 */
  days?: HistoryDays;
}

// =============================================================================
// レスポンス型
// =============================================================================

/** GET /api/coins のレスポンス */
export type GetCoinsResponse = Coin[];

/** GET /api/analyze のレスポンス */
export interface GetAnalyzeResponse {
  analysis: string;
}

/** GET /api/history のレスポンス */
export type GetHistoryResponse = PriceHistoryPoint[];

/** エラーレスポンス（各エンドポイント共通） */
export interface ApiErrorResponse {
  error: string;
}

// =============================================================================
// URLビルダー
// =============================================================================

/** ベースURLを引数に取り、エンドポイントごとのURLを返すヘルパー */
export function buildApiUrl(baseUrl: string) {
  return {
    coins: () => `${baseUrl}${API_PATHS.coins}`,
    analyze: (params: GetAnalyzeParams) =>
      `${baseUrl}${API_PATHS.analyze}?name=${encodeURIComponent(params.name)}&price=${params.price}&change=${params.change}`,
    history: (params: GetHistoryParams) => {
      const days = params.days ?? 365;
      return `${baseUrl}${API_PATHS.history}?id=${encodeURIComponent(params.id)}&days=${days}`;
    },
  };
}
