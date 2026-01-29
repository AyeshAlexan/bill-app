import Api from "./Api";

export const fetchItems = async () => {
  const res = await Api.get("/items");
  // expected: array OR { items: [] }
  return res.data?.items || res.data || [];
};
