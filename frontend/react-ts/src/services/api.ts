import axios from "axios";

const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "");

const baseURL = envBase || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

if (!baseURL) {
  throw new Error("VITE_API_BASE_URL is required in production build.");
}
export const api = axios.create({
    baseURL,
    timeout: 10000,
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
