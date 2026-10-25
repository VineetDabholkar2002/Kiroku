import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Attach JWT token dynamically per request without global state pollution
api.interceptors.request.use(
  (config) => {
    const isInternal = !config.url?.startsWith("http://") && !config.url?.startsWith("https://");
    const token = localStorage.getItem("authToken");
    if (isInternal && token && !config.headers["Authorization"]) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If token expired or invalid, clear local auth
      const currentToken = localStorage.getItem("authToken");
      if (currentToken) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("username");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
