import Api from "./Api";
import { setAuthToken } from "./Api";

export const login = async (username, password) => {
  const res = await Api.post("/login", { username, password });
  return res.data;
  
const data = await login(username, password);
setAuthToken(data.token); // 🔥 IMPORTANT

};






// export const addBill = async (payload) => {
 //const res = await Api.post("/bills", payload);
  //return res.data;
//}; 
