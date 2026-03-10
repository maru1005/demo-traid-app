/**
 * 環境変数からAPIベースURLを取得します。
 * NEXT_PUBLIC_ プレフィックスが必要（クライアントで参照するため）
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
