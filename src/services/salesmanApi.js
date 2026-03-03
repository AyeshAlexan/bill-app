import Api from "./Api";

export const fetchSalesmen = async () => {
  try {
    const res = await Api.get("/salesmen");

    // Handle both possible formats safely
    return Array.isArray(res.data) ? res.data : res.data.data || [];
    
  } catch (error) {
    console.error("API Error (fetchSalesmen):", error?.response?.data || error.message);
    return [];
  }
};