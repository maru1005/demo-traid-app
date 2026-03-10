import { API_BASE_URL } from "@/lib/config";
import {
  buildApiUrl,
  type ApiErrorResponse,
  type GetAnalyzeParams,
  type GetAnalyzeResponse,
  type GetCoinsResponse,
  type GetHistoryParams,
  type GetHistoryResponse,
} from "@/types/api";

// フロント側のAPIミドルウェア的な役割をするクライアント
export const apiUrls = buildApiUrl(API_BASE_URL);

function withDefaultHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set("X-Requested-With", "crypto-ai-frontend");
  return { ...init, headers };
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, withDefaultHeaders(init));
  const text = await res.text();

  if (!res.ok) {
    try {
      const data = JSON.parse(text) as ApiErrorResponse;
      throw new Error(data.error || `API error ${res.status}`);
    } catch {
      throw new Error(`API error ${res.status}`);
    }
  }

  // レスポンスボディが空のケースはほぼないが、安全のため。
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export const apiClient = {
  getCoins(): Promise<GetCoinsResponse> {
    return fetchJson<GetCoinsResponse>(apiUrls.coins());
  },
  getHistory(params: GetHistoryParams): Promise<GetHistoryResponse> {
    return fetchJson<GetHistoryResponse>(apiUrls.history(params));
  },
  analyze(params: GetAnalyzeParams): Promise<GetAnalyzeResponse> {
    return fetchJson<GetAnalyzeResponse>(apiUrls.analyze(params));
  },
};

