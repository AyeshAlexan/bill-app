import Api from "./Api";

// Fetch all bills
export const getBills = async (route = null, shopCode = null) => {
  let url = "/bills";

  const params = [];

  if (route) params.push(`route=${encodeURIComponent(route)}`);
  if (shopCode) params.push(`shop_code=${encodeURIComponent(shopCode)}`);

  if (params.length > 0) {
    url += `?${params.join("&")}`;
  }

  const res = await Api.get(url);
  return res.data;
};

// Fetch a single bill with its items
// Note: Ensure your backend controller accepts the Invoice String if passing invoiceNo
export const getBillById = async (idOrInvoice) => {
  const res = await Api.get(`/bills/${idOrInvoice}`);
  return res.data;
};

// Create a new bill
export const addBill = async (data) => {
  try {
    const res = await Api.post("/bills", data);
    return res.data;
  } catch (error) {
    console.error("Add Bill API Error:", error.response?.data || error.message);
    throw error; // Re-throw so the UI (AddBillScreen) can show the Alert
  }
};

// Fetch only pending bills
export const getPendingBills = async () => {
  const res = await Api.get("/bills/pending");
  return res.data;
};

/**
 * Submit a payment for a specific bill
 */
export const addPayment = async (paymentData) => {
  try {
    // paymentData: { invoice_no, amount, method, note }
    const res = await Api.post("/payments", paymentData);
    return res.data;
  } catch (error) {
    console.error("Payment API Error:", error.response?.data || error.message);
    throw error;
  }
};

export const processReturn = async (returnData) => {
  // returnData: { invoice_no, items: [{item_code, qty, unit_price, reason}] }
  const res = await Api.post("/bills/return", returnData);
  return res.data;
};
