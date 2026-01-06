export const shops = [
  { id: 1, name: "Kandy City Store", location: "Kandy", pendingBills: 2 },
  { id: 2, name: "Katugastota Super", location: "Katugastota", pendingBills: 1 },
];

export const bills = [
  { id: 1, shopId: 1, billNo: "B001", total: 5000, paid: 2000, status: "Partial" },
  { id: 2, shopId: 1, billNo: "B002", total: 3000, paid: 3000, status: "Paid" },
  { id: 3, shopId: 2, billNo: "B003", total: 7000, paid: 0, status: "Pending" },
];
