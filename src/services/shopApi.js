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

// Add this to your existing shopApi.js
export const recordShopVisit = async (visitData) => {
  try {
    // This sends: customer_id, lat, lng (or latitude/longitude) to your Laravel route
    const res = await Api.post("/shop-visits", visitData);
    return res.data; 
  } catch (error) {
    console.error("Visit API Error:", error.response?.data || error.message);
    throw error;
  }
};