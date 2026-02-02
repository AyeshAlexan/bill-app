import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  fetchDashboardStats,
  fetchRecentActivity,
} from "../services/dashboardApi";

export default function DashboardScreen({ navigation }) {
  const [activeStat, setActiveStat] = useState("shops");
  const [userName, setUserName] = useState("");

  const [stats, setStats] = useState({
    shops: 0,
    pending: 0,
    collected: 0,
    paid: 0,
  });

  const [recent, setRecent] = useState({
    shops: [],
    bills: [],
    payments: [],
  });

  const [loading, setLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch user name from storage
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || "User");
      }

      const [statsData, recentData] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentActivity(),
      ]);

      setStats({
        shops: Number(statsData?.shops || 0),
        pending: Number(statsData?.pending_bills || 0),
        paid: Number(statsData?.paid_bills || 0),
        collected: Number(statsData?.collected_amount || 0),
      });

      setRecent({
        shops: recentData?.shops || [],
        bills: recentData?.bills || [],
        payments: recentData?.payments || [],
      });
    } catch (err) {
      console.error(
        "Dashboard load error:",
        err?.response?.data || err.message,
      );
      console.error("Full error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const recentList = useMemo(() => {
    // We will map your card selection to the best recent list.
    if (activeStat === "shops") return { type: "shops", data: recent.shops };
    if (activeStat === "pending") return { type: "bills", data: recent.bills };
    if (activeStat === "paid") return { type: "bills", data: recent.bills };
    if (activeStat === "collected")
      return { type: "payments", data: recent.payments };
    return { type: "shops", data: recent.shops };
  }, [activeStat, recent]);

  const formatMoney = (n) => `Rs.${Number(n || 0).toFixed(2)}`;

  // ✅ Sri Lanka time in Dashboard (fix your timezone issue here too)
  const formatSLTime = (dt) => {
    if (!dt) return "—";
    const d = new Date(String(dt).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return dt;
    return d.toLocaleString("en-LK", { timeZone: "Asia/Colombo" });
  };

  const renderRecentActivity = () => {
    if (loading) {
      return (
        <View style={{ paddingVertical: 14 }}>
          <ActivityIndicator color="#2563eb" />
        </View>
      );
    }

    if (!recentList.data || recentList.data.length === 0) {
      return <Text style={styles.activityItem}>No recent activity found.</Text>;
    }

    // ✅ SHOPS recent
    if (recentList.type === "shops") {
      return recentList.data.map((s) => (
        <Text key={`shop-${s.id}`} style={styles.activityItem}>
          🏪 New Shop: {s.name} {s.location ? `• ${s.location}` : ""} {"\n"}
          <Text style={styles.activityTime}>{formatSLTime(s.created_at)}</Text>
        </Text>
      ));
    }

    // ✅ BILLS recent (filter by pending/paid depending on activeStat)
    if (recentList.type === "bills") {
      const filtered =
        activeStat === "pending"
          ? recentList.data.filter(
              (b) =>
                String(b.status) !== "Paid" && Number(b.due_amount || 0) > 0,
            )
          : activeStat === "paid"
            ? recentList.data.filter(
                (b) =>
                  String(b.status) === "Paid" ||
                  Number(b.due_amount || 0) === 0,
              )
            : recentList.data;

      const rows = filtered.length ? filtered : recentList.data;

      return rows.map((b) => (
        <TouchableOpacity
          key={`bill-${b.id}`}
          onPress={() => navigation.navigate("ViewBill", { billId: b.id })}
          activeOpacity={0.85}
          style={styles.activityTap}
        >
          <Text style={styles.activityItem}>
            🧾 {b.bill_number} • {b?.shop?.name || "Shop"}
            {"\n"}
            <Text style={styles.activitySub}>
              Total: {formatMoney(b.total_amount)} • Due:{" "}
              {formatMoney(b.due_amount)} • {b.status}
            </Text>
            {"\n"}
            <Text style={styles.activityTime}>
              {formatSLTime(b.created_at)}
            </Text>
          </Text>
        </TouchableOpacity>
      ));
    }

    // ✅ PAYMENTS recent (collected)
    if (recentList.type === "payments") {
      return recentList.data.map((p) => (
        <Text key={`pay-${p.id}`} style={styles.activityItem}>
          💰 {formatMoney(p.amount)} • {p.method || "Cash"}
          {"\n"}
          <Text style={styles.activitySub}>
            {p?.bill?.bill_number || "Bill"} • {p?.bill?.shop?.name || "Shop"} •{" "}
            {p?.user?.name || "—"}
          </Text>
          {"\n"}
          <Text style={styles.activityTime}>
            {formatSLTime(p.paid_at || p.created_at)}
          </Text>
        </Text>
      ));
    }

    return null;
  };

  return (
    <ScrollView
      style={styles.container}
      scrollEnabled={true}
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSub}>Hello, {userName}!</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => navigation.replace("Login")}
        >
          <MaterialCommunityIcons name="logout" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* STAT CARDS */}
      <View style={styles.statGrid}>
        <StatCard
          color="#10b981"
          icon="store"
          label="Shops"
          value={stats.shops.toString()}
          active={activeStat === "shops"}
          onPress={() => setActiveStat("shops")}
        />

        <StatCard
          color="#ef4444"
          icon="clock-outline"
          label="Pending Bills"
          value={stats.pending.toString()}
          active={activeStat === "pending"}
          onPress={() => setActiveStat("pending")}
        />

        <StatCard
          color="#f97316"
          icon="trending-up"
          label="Collected"
          value={`Rs. ${Number(stats.collected || 0).toLocaleString()}`}
          active={activeStat === "collected"}
          onPress={() => setActiveStat("collected")}
        />

        <StatCard
          color="#3b82f6"
          icon="check-all"
          label="Paid Bills"
          value={stats.paid.toString()}
          active={activeStat === "paid"}
          onPress={() => setActiveStat("paid")}
        />
      </View>

      {/* QUICK ACTIONS */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionRow}>
        <ActionBtn
          isCustomImage
          imageSource={require("../assets/shop.jpg")}
          label="Shops"
          onPress={() => navigation.navigate("ShopList")}
        />

        <ActionBtn
          isCustomImage
          imageSource={require("../assets/pending.png")}
          label="Pending Bills"
          onPress={() => navigation.navigate("PendingBills")}
        />

        <ActionBtn
          isCustomImage
          imageSource={require("../assets/payment-icon.png")}
          label="Payments"
          onPress={() => navigation.navigate("Payment")}
        />
      </View>

      {/* RECENT ACTIVITY */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.activityBox}>{renderRecentActivity()}</View>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddBill")}
      >
        <MaterialCommunityIcons name="plus" size={32} color="white" />
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ================= COMPONENTS ================= */

const StatCard = ({ color, icon, label, value, onPress, active }) => (
  <TouchableOpacity
    style={[
      styles.statCard,
      {
        backgroundColor: color,
        borderWidth: active ? 3 : 0,
        borderColor: "#111827",
      },
    ]}
    onPress={onPress}
  >
    <MaterialCommunityIcons name={icon} size={26} color="white" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const ActionBtn = ({ label, onPress, isCustomImage, imageSource }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
    {isCustomImage && <Image source={imageSource} style={styles.customIcon} />}
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  header: {
    backgroundColor: "#2563eb",
    padding: 40,
    paddingTop: 60,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  headerTitle: { color: "white", fontSize: 26, fontWeight: "bold" },
  headerSub: { color: "#bfdbfe", fontSize: 16 },

  logoutBtn: {
    position: "absolute",
    right: 25,
    top: 65,
  },

  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    justifyContent: "space-between",
  },

  statCard: {
    width: "47%",
    padding: 20,
    borderRadius: 20,
    margin: 5,
    height: 150,
    justifyContent: "space-between",
  },

  statValue: { color: "white", fontSize: 22, fontWeight: "bold" },
  statLabel: { color: "white", opacity: 0.9 },

  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 20,
    fontSize: 18,
    fontWeight: "bold",
  },

  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 15,
    justifyContent: "space-around",
    marginTop: 15,
  },

  actionBtn: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    width: "30%",
    alignItems: "center",
    elevation: 2,
  },

  actionLabel: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: "bold",
  },

  customIcon: { width: 28, height: 28, resizeMode: "contain" },

  activityBox: {
    backgroundColor: "white",
    margin: 20,
    padding: 15,
    borderRadius: 15,
    elevation: 2,
  },

  activityItem: {
    fontSize: 14,
    marginBottom: 10,
    color: "#374151",
  },

  activitySub: {
    color: "#64748b",
    fontSize: 12,
  },

  activityTime: {
    color: "#94a3b8",
    fontSize: 11,
  },

  activityTap: {
    paddingVertical: 6,
  },

  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    right: 20,
    bottom: 20,
    backgroundColor: "#2563eb",
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
