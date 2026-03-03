import api from "./Api";

/**
 * Fetches all payment records from the server.
 * Maps database fields to the frontend.
 */
export const getPayments = async () => {
  try {
    const response = await api.get("/payments"); // Adjust endpoint if your route is different
    
    // Ensure we return an array
    const data = response.data?.payments || response.data || [];
    
    return data;
  } catch (error) {
    console.error("Error in getPayments API:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Fetches payments filtered by a specific Invoice/Sales number.
 */
export const getPaymentsByInvoice = async (invoiceNo) => {
  try {
    const response = await api.get(`/payments/invoice/${invoiceNo}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching invoice payments:", error.message);
    throw error;
  }
};