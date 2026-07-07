import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: "#FEE500",
          gradFrom: "#FFD500",
          gradTo: "#FF9500",
          orange: "#FF6F0F",
          dark: "#191919",
          gray: "#6B7280",
          green: "#00C471",
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
        card: "0 4px 24px rgba(0,0,0,0.08)",
        cardHover: "0 8px 32px rgba(255,149,0,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
