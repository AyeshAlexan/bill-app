import axios from "axios";

const API_URL ="https://127.0.0.1:8000/api";

export const fetchShops = async () => {
    const response = await axios.get(`${API_URL}/shops`);
    return response.data.shops;
};