// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 画像最適化を許可する外部ドメインのリスト
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        port: '', // ポートは空（デフォルト）でOK
        pathname: '/coins/images/**', // /coins/images/ 以下のパスだけを許可（よりセキュア！）
      },
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
        port: '',
        pathname: '/coins/images/**',
      },
    ],
  },
};

export default nextConfig;