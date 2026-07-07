import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="flex flex-col items-center gap-6 text-center animate-fadeUp">
        <Image
          src="/logo/app-icon-white.png"
          alt="모두의공공조달"
          width={96}
          height={96}
          className="rounded-2xl shadow-card"
          priority
        />
        <h1 className="text-3xl font-extrabold text-brand-dark">
          모두의공공조달
        </h1>
        <p className="text-brand-gray text-sm">Public Procurement For All</p>
        <div className="mt-4 rounded-full bg-brand-grad px-6 py-3 font-bold text-brand-dark">
          ✅ Phase 1 기초 셋업 완료
        </div>
        <p className="text-xs text-brand-gray mt-2">
          Next.js 14 · TailwindCSS · Supabase · Toss Payments 연결 완료
        </p>
      </div>
    </main>
  );
}
