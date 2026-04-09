import Api from "./Api";

// GET ROUTES (Now returning m_route list)
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

/**
 * ============================
 * PENDING SHOP SYSTEM
 * ============================
 */

// ✅ GET UNIQUE CITIES (Used for the dropdown in AddShopScreen)
export const fetchCities = async () => {
  try {
    const res = await Api.get("/cities");
    // Matches Laravel: return response()->json(['cities' => $cities]);
    return res.data.cities || [];
  } catch (error) {
    console.error("Fetch Cities Error:", error.response?.data || error.message);
    return [];
  }
};

// ✅ ADD NEW SHOP (Submits data to pending_shops table)
export const addShop = async (shopData) => {
  try {
    const res = await Api.post("/pending-shops", shopData);
    return res.data;
  } catch (error) {
    console.error("Add Shop Error:", error.response?.data || error.message);
    throw error;
  }
};

// ✅ GET SHOPS BY STATUS 
// Note: Consolidated to use the ?status= query parameter as defined in your Controller
export const fetchPendingShops = async (status = 'pending') => {
  try {
    const res = await Api.get("/pending-shops", {
      params: { status: status }
    });
    // Your controller returns the array directly: return response()->json($shops);
    return res.data || [];
  } catch (error) {
    console.error(`${status} Shops Error:`, error.response?.data || error.message);
    return [];
  }
};

// Helper aliases for the UI
export const fetchApprovedShops = () => fetchPendingShops('approved');
export const fetchRejectedShops = () => fetchPendingShops('rejected');


// ✅ APPROVE SHOP (Admin Action)
// Moves record from pending_shops to customers table
export const approveShop = async (id) => {
  try {
    const res = await Api.post(`/pending-shops/${id}/approve`);
    return res.data;
  } catch (error) {
    console.error("Approve Error:", error.response?.data || error.message);
    throw error;
  }
};

// ✅ REJECT SHOP (Admin Action)
export const rejectShop = async (id) => {
  try {
    const res = await Api.post(`/pending-shops/${id}/reject`);
    return res.data;
  } catch (error) {
    console.error("Reject Error:", error.response?.data || error.message);
    throw error;
  }
};