import Api from "../services/Api";
import { setAuthToken } from "../services/Api";

export const login = async (username, password) => {
  // Just perform the call and return the data
  const res = await Api.post("/login", { username, password });
  
  // We set the token here so the very next API call is authorized
  if (res.data.token) {
    setAuthToken(res.data.token);
  }
  
  return res.data;
};