import Api from "./Api";

export const login = async (email, password) => {
  const res = await Api.post("/login", { email, password });
  return res.data; // { token, user, message }
};
