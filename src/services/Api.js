import axios from "axios";

const Api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const setAuthToken = (token) => {
  if (token) {
    Api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete Api.defaults.headers.common.Authorization;
  }
};

Api.interceptors.response.use(
  res => res,
  err => {
    console.log("API ERROR:", err?.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default Api;
