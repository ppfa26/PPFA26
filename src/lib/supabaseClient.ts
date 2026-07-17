"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// 브라우저용 Supabase 클라이언트 (싱글턴)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // ★ 소셜 로그인(카카오/구글) 콜백 안정화 (대표님 요청 — 가입 이탈 방지) ★
    //   OAuth 로 돌아올 때 URL(?code=... / #access_token=...)을 자동 감지해 세션 저장.
    //   (기본값 true 이지만, 소셜 로그인 완료가 확실히 반영되도록 명시)
    detectSessionInUrl: true,
  },
});
