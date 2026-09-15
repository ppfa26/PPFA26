import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "400px", // 초소형 모바일 대응 breakpoint
      },
      colors: {
        brand: {
          yellow: "#FEE500",
          gradFrom: "#FFD500",
          gradTo: "#FF9500",
          orange: "#FF6F0F",
          dark: "#191919",
          gray: "#6B7280",
          green: "#00C471",
          blue: "#2563EB",
          navy: "#141A28",
          red: "#FF3B30",
          bgLight: "#FFFFFF",
          bgDark: "#0A0A0A",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "Noto Sans KR", "system-ui", "sans-serif"],
        pretendard: ["Pretendard", "sans-serif"],
        noto: ["Noto Sans KR", "sans-serif"],
        nanumgothic: ["Nanum Gothic", "sans-serif"],
        nanummyeongjo: ["Nanum Myeongjo", "serif"],
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(135deg, #FFD500 0%, #FF9500 100%)",
      },
      boxShadow: {
        // (B-2 대표님 요청) 다층 그림자로 더 부드럽고 고급스럽게.
        //   가까운 그림자(윤곽) + 넓은 그림자(부양감)를 겹쳐 종이가 살짝 떠 있는 느낌.
        card: "0 1px 2px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.07)",
        cardHover: "0 4px 12px rgba(0,0,0,0.06), 0 12px 36px rgba(255,149,0,0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
