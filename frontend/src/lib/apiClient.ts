import { API_BASE_URL } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import {
  buildApiUrl,
  type ApiErrorResponse,
  type GetAnalyzeParams,
  type GetAnalyzeResponse,
  type GetCoinsResponse,
  type GetHistoryParams,
  type GetHistoryResponse,
  type GetHoldingsResponse,
  type GetHoldingsPnLResponse,
  type GetTradesResponse,
  type PostTargetPnLRequest,
  type PostTargetPnLResponse,
  type TradeRequest,
  type TradeResponse,
  type InitUserRequest,
  type DepositRequest,
  type User,
} from "@/types";

// フロント側のAPIミドルウェア的な役割をするクライアント
export const apiUrls = buildApiUrl(API_BASE_URL);

// Supabaseのアクセストークンを取得
async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  
   const token = data.session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function withDefaultHeaders(init?: RequestInit, auth = false): Promise<RequestInit> {
  const headers = new Headers(init?.headers);
  headers.set("X-Requested-With", "crypto-ai-frontend");
  if (auth) {
    const authHeaders = await getAuthHeader();
    Object.entries(authHeaders).forEach(([k, v]) => headers.set(k, v));
  }
  return { ...init, headers };
}

async function fetchJson<T>(input: string, init?: RequestInit, auth = false): Promise<T> {
  const res = await fetch(input, await withDefaultHeaders(init, auth));
  const text = await res.text();

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const data = JSON.parse(text) as ApiErrorResponse;
      if (data.error) message = data.error;
    } catch {
      // JSONパース失敗は無視
    }
    throw new Error(message);
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export const apiClient = {
  // 認証不要
  getCoins(): Promise<GetCoinsResponse> {
    return fetchJson<GetCoinsResponse>(apiUrls.coins());
  },
  getHistory(params: GetHistoryParams): Promise<GetHistoryResponse> {
    return fetchJson<GetHistoryResponse>(apiUrls.history(params));
  },
  analyze(params: GetAnalyzeParams): Promise<GetAnalyzeResponse> {
    return fetchJson<GetAnalyzeResponse>(apiUrls.analyze(params));
  },

  // 認証必要
  async getUser(): Promise<User | null> {
    try {
      return await fetchJson<User>(`${API_BASE_URL}/api/user`, {}, true);
    } catch {
      return null;
    }
  },
  initUser(req: InitUserRequest): Promise<User> {
    return fetchJson<User>(`${API_BASE_URL}/api/user/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }, true);
  },
  deposit(req: DepositRequest): Promise<User> {
    return fetchJson<User>(`${API_BASE_URL}/api/user/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }, true);
  },
  buy(req: TradeRequest): Promise<TradeResponse> {
    return fetchJson<TradeResponse>(`${API_BASE_URL}/api/trade/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }, true);
  },
  sell(req: TradeRequest): Promise<TradeResponse> {
    return fetchJson<TradeResponse>(`${API_BASE_URL}/api/trade/sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }, true);
  },
  getHoldings(): Promise<GetHoldingsResponse> {
    return fetchJson<GetHoldingsResponse>(`${API_BASE_URL}/api/holdings`, {}, true);
  },
  async getHoldingsPnL(): Promise<GetHoldingsPnLResponse> {
    try {
      return await fetchJson<GetHoldingsPnLResponse>(`${API_BASE_URL}/api/holdings/pnl`, {}, true);
    } catch {
      return [];
    }
  },
  getTrades(): Promise<GetTradesResponse> {
    return fetchJson<GetTradesResponse>(`${API_BASE_URL}/api/trades`, {}, true);
  },
  postTargetPnL(req: PostTargetPnLRequest): Promise<PostTargetPnLResponse> {
    return fetchJson<PostTargetPnLResponse>(`${API_BASE_URL}/api/trade/target-pnl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }, true);
  },
  startSession(req: { initial_balance: number; target_pnl: number }): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`${API_BASE_URL}/api/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }, true);
  },
  resetSession(req: { initial_balance: number; target_pnl: number }): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`${API_BASE_URL}/api/session/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }, true);
  },
  updateTarget(req: { target_pnl: number }): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`${API_BASE_URL}/api/session/target`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }, true);
  },
};