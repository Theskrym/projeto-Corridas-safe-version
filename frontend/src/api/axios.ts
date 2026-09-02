import axios from 'axios';

// Detecta se está em produção (Netlify)
const isProduction = import.meta.env.PROD;

// URLs diferentes para cada ambiente
const getBaseURL = () => {
    if (isProduction) {
        // URL do backend quando estiver online
        return 'https://projeto-e-l-i-a-s.onrender.com/api/auth';
    }
    // URL local para desenvolvimento
    return ' http://127.0.0.1:8003/api/auth';
};

const api = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            if (!config.headers) {
                config.headers = new axios.AxiosHeaders();
            }
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
    }
);

export default api;