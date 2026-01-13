import Api from "./Api";

export const addBill = async (data) => {
  const res = await Api.post("/bills", data);
  return res.data;
};
export const getBills = async () => {
  const res = await Api.get("/bills");
  return res.data;
};