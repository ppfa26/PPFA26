import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 최근 크롤링된 공고 조회
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json({ announcements: [], note: "DB 미설정" });
    }
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("crawled_announcements")
      .select("site_name, title, detail_url, crawled_at")
      .order("crawled_at", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ announcements: [], note: error.message });
    }
    return NextResponse.json({ announcements: data || [] });
  } catch (e: any) {
    return NextResponse.json({ announcements: [], note: "조회 실패" });
  }
}
