import Api from "../services/Api";

// ==============================
// 📌 PAYMENT VOUCHERS
// ==============================

// ✅ Get all vouchers (paginated)
export const getVouchers = (page = 1) => {
  return Api.get(`/payment-vouchers?page=${page}`);
};

// ✅ Get single voucher
export const getVoucherById = (id) => {
  return Api.get(`/payment-vouchers/${id}`);
};

// ✅ Create voucher
export const createVoucher = (data) => {
  return Api.post("/payment-vouchers", data);
};

// ✅ Update voucher
export const updateVoucher = (id, data) => {
  return Api.put(`/payment-vouchers/${id}`, data);
};

// ✅ Delete voucher
export const deleteVoucher = (id) => {
  return Api.delete(`/payment-vouchers/${id}`);
};


// ==============================
// 📌 INVOICES (Dropdown)
// ==============================

export const getInvoices = () => {
  return Api.get("/payment-vouchers/invoices");
};


// ==============================
// 📌 CHART OF ACCOUNTS (Dropdown)
// ==============================

export const getAccounts = () => {
  return Api.get("/chart-of-accounts");
};

// Optional: get single account by code
export const getAccountByCode = (code) => {
  return Api.get(`/chart-of-accounts/${code}`);
};