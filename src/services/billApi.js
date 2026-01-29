// src/services/billApi.js
import Api from "./Api";

export const getBills = async () => {
  const res = await Api.get("/bills");
  return res.data;
};

export const getBillById = async (id) => {
  const res = await Api.get(`/bills/${id}`);
  return res.data;
};

export const addBill = async (data) => {
  const res = await Api.post("/bills", data);
  return res.data;
};
