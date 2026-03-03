import Api from "./Api";

// Fetch all bills
export const getBills = async () => {
  const res = await Api.get("/bills");
  return res.data;
};

// Fetch a single bill with its items
export const getBillById = async (id) => {
  const res = await Api.get(`/bills/${id}`);
  return res.data;
};

// Create a new bill
export const addBill = async (data) => {
  const res = await Api.post("/bills", data);
  return res.data;
};

// Fetch only pending bills
export const getPendingBills = async () => {
  const res = await Api.get("/bills/pending");
  console.log("PENDING:", res.data);
  return res.data;
};

/**
 * ADDED: Submit a payment for a specific bill
 * This matches the call in BillDetailScreen.js
 */
export const addPayment = async (paymentData) => {
  // paymentData contains: invoice_no, amount, method, note
  const res = await Api.post("/payments", paymentData);
  return res.data;
};