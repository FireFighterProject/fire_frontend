import axios from 'axios';

// Create an instance of axios
const apiClient = axios.create({
    baseURL: '/api', // Replace with your API base URL
    timeout: 10000, // Request timeout in milliseconds
});

apiClient.interceptors.request.use(
    (config) => {
        // Add authorization token or other headers if needed
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        // Handle request error
        return Promise.reject(error);
    }
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