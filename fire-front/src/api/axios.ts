import axios from "axios";

const apiClient = axios.create({
    baseURL: "/api",   // Nginx 프록시 기준
    timeout: 10000,
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token && token !== "null" && token !== "undefined") {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            delete config.headers.Authorization;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            console.error("Unauthorized");
        }
        return Promise.reject(err);
    }
);

export default apiClient;
