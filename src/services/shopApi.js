import Api from "./Api";

//Get the shop
export const fetchShops = async () => {
  const res = await Api.get("/shops");
  return res.data.shops;
};

//Add the Shop
export const addShop = async (data) => {
  const res = await Api.post("/shops", data);
  return res.data; // { message, shop }
};
