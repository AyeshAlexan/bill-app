import axios from "axios";

const Api = axios.create({
  // ✅ ADDED /api to the end of the URL
  baseURL: "http://127.0.0.1:8000/api", 
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
    // ✅ ADDED THIS: This skips the ngrok "warning" page that blocks your app
    "ngrok-skip-browser-warning": "true", 
  },
});

export const setAuthToken = (token) => {
  if (token) {
    Api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete Api.defaults.headers.common.Authorization;
  }
};

// Response Interceptor
Api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Helpful for debugging in the console
    console.log("--- API ERROR DETAILS ---");
    console.log("Status:", err?.response?.status);
    console.log("Data:", err?.response?.data || err.message);
    return Promise.reject(err);
  },
);

// Request Interceptor
Api.interceptors.request.use((config) => {
  // Logs the full URL to ensure it looks like .../api/login
  console.log("FULL REQUEST URL:", config.baseURL + config.url);
  return config;
});

export default Api;
