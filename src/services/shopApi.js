import Api from "./Api";

// GET ROUTES (Now returning City_1 list)
export const fetchRoutes = async () => {
  const res = await Api.get("/routes");
  return res.data.routes || [];
};

// GET SHOPS (Filtering by City_1)
export const fetchShopsByRoute = async (routeCode) => {
  const res = await Api.get("/shops", {
    params: { route: routeCode },
  });
  return res.data.shops || [];
};