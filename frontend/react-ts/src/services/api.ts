import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

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
