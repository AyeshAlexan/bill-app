import Api from "./Api";

export const login = async (name, password) => {
  const res = await Api.post("/login", { name, password });
  return res.data;
};

export const addBill = async (payload) => {
  const res = await Api.post("/bills", payload);
  return res.data;
};
