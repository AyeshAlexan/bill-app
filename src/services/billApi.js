import Api from "./Api";

// Fetch all bills
export const getBills = async () => {
  const res = await Api.get("/bills");
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