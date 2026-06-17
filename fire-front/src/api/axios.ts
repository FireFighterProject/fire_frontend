import axios from "axios";

const apiClient = axios.create({
    baseURL: "/api",
    timeout: 10000,
});

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
