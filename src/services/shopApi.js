import Api from "./Api";

export const fetchShops = async (location = null) => {
  const res = await Api.get("/shops", {
    params: location ? { location } : {},
  });
  return res.data.shops;
};

export const fetchShopLocations = async () => {
  try {
    const res = await Api.get("/shops/locations");
    return res.data.locations;
  } catch (e) {
    // Fallback: If /shops/locations endpoint doesn't exist, extract unique locations from shops
    if (e?.response?.status === 404) {
      console.log(
        "⚠️ /shops/locations endpoint not found, extracting from shops data",
      );
      const shops = await fetchShops();
      const locations = [
        ...new Set((shops || []).map((s) => s?.location).filter(Boolean)),
      ];
      return locations;
    }
    throw e;
  }
};

// ✅ ADD THIS FUNCTION - It was missing!
export const addShop = async (shopData) => {
  const res = await Api.post("/shops", shopData);
  return res.data;
};
