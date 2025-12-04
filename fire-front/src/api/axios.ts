import axios from 'axios';

// Create an instance of axios
const apiClient = axios.create({
    baseURL: '/api', // Replace with your API base URL
    timeout: 10000, // Request timeout in milliseconds
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token && token !== "null" && token !== "undefined") {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            // 토큰이 없으면 Authorization 헤더 자체 제거
            delete config.headers.Authorization;
        }

        return config;
    },
    (error) => Promise.reject(error)
);


// Response interceptor
apiClient.interceptors.response.use(
    (response) => {
        // Handle successful response
        return response;
    },
    (error) => {
        // Handle response error
        if (error.response && error.response.status === 401) {
            // Handle unauthorized error (e.g., redirect to login)
            console.error('Unauthorized, redirecting to login...');
        }
        return Promise.reject(error);
    }
);

export default apiClient;