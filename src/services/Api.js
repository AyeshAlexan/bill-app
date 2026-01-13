import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

export const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getBills = async () => {
  try {
    const response = await axios.get(`${API_URL}/bills`);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
