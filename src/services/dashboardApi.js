import Api from "./Api";

export const fetchDashboardStats = async () =>{
    const res = await Api.get("/dashboard/stats");
    return res.data;
};

export const fetchRecentActivity = async()=>{
    const res = await Api.get("/dashboard/recent-activity");
    return res.data;
};