import Api from "./Api";

export const login = async (name, password) => {
  const res = await Api.post("/login", { name, password });
  return res.data;
};
