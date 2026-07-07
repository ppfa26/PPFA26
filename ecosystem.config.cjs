module.exports = {
  apps: [
    {
      name: "webapp",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 0.0.0.0",
      cwd: "/home/user/webapp",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_BASE_URL:
          process.env.OPENAI_BASE_URL ||
          "https://www.genspark.ai/api/llm_proxy/v1",
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
