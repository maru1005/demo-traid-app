// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        router.push("/");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error("メールアドレスまたはパスワードが正しくありません");
      } else {
        router.push("/");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="flex flex-col md:flex-row items-center gap-8 w-full max-w-3xl">
        {/* 左カラム（猫エリア） */}
        <div className="flex-shrink-0">
          <Image
            src="/cats/cat_blink.gif"
            alt="cat"
            width={512}
            height={768}
            className="w-40 md:w-56 object-contain"
            unoptimized
          />
        </div>

        {/* 右カラム（フォームエリア） */}
        <div className="w-full max-w-sm space-y-6">
          {/* フォーム */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? "処理中..." : isSignUp ? "アカウント作成" : "ログイン"}
            </button>
          </div>

          {/* 切り替え */}
          <p className="text-center text-sm text-gray-500">
            {isSignUp
              ? "すでにアカウントをお持ちの方は"
              : "アカウントをお持ちでない方は"}
            <button
              onClick={() => {
                setIsSignUp((v) => !v);
              }}
              className="ml-1 font-bold text-indigo-600 hover:underline"
            >
              {isSignUp ? "ログイン" : "新規登録"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
