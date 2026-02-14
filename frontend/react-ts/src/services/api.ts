import axios from "axios";

const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "");

// 优先使用环境变量，这主要是为render-vercel那一套服务准备的
// 若未配置：本地/生产统一走同域
// 阿里云环境用nginx做反向代理
// 本地开发依赖 vite.config.ts 的 proxy 将 /api 转发到 http://127.0.0.1:8000
const baseURL = envBase || "";

export const api = axios.create({
  baseURL,
  timeout: 30 * 1000,
});

api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    // 统一错误包装：尽量把后端返回的 detail/msg 提出来
    const msg =
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      "请求失败";
    return Promise.reject(new Error(msg));
  }
);
