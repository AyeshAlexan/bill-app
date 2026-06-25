import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setAuthToken } from "../services/Api";
import {
  fetchDashboardStats,
  fetchRecentActivity,
} from "../services/dashboardApi";

const { width } = Dimensions.get("window");

export default function DashboardScreen({ navigation }) {
  const [activeStat, setActiveStat] = useState("pending");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);

  // Navigation Hook for deep linking through the Progress Bar
  const navigationHook = useNavigation();

  const [stats, setStats] = useState({
    shops: 0,
    pending: 0,
    collected: 0,
    paid: 0,
    target: {
      target_amount: 0,
      monthly_collected: 0,
      needs_to_collect: 0,
      progress_percentage: 0,
      month_label: "",
    },
  });

  const [recent, setRecent] = useState({
    shops: [],
    pending_bills: [],
    paid_bills: [],
    payments: [],
  });

  const ensureToken = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (token) setAuthToken(token);
    return token;
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const token = await ensureToken();
      if (!token) {
        navigation.replace("Login");
        return;
      }

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
        shops: Number(statsData?.shops_count || 0),
        pending: Number(statsData?.pending_bills || 0),
        paid: Number(statsData?.paid_bills || 0),
        collected: Number(statsData?.total_collected || 0),
        target: statsData?.sales_target || {
          target_amount: 0,
          monthly_collected: 0,
          needs_to_collect: 0,
          progress_percentage: 0,
          month_label: "",
        },
      });

      setRecent({
        shops: recentData?.shops || [],
        pending_bills: recentData?.pending_bills || [],
        paid_bills: recentData?.paid_bills || [],
        payments: recentData?.payments || [],
      });
    } catch (err) {
      console.error("Dashboard error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [ensureToken, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const formatMoney = (n) =>
    `Rs.${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const TargetProgressBar = () => {
    const target = stats.target;
    const noTarget = !target.target_amount || target.target_amount === 0;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigationHook.navigate("Summary", { tab: "targets" })}
      >
        <View style={styles.targetWrapper}>
          <View style={styles.targetHeader}>
            <Text style={styles.targetTitle}>
              {target.month_label || "This Month"} Target
            </Text>

            {!noTarget && (
              <Text style={styles.targetPercent}>
                {target.progress_percentage >= 100
                  ? "100%"
                  : `${target.progress_percentage}%`}
              </Text>
            )}
          </View>

          {/* ✅ NO TARGET UI */}
          {noTarget ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={30}
                color="#f59e0b"
              />
              <Text style={{ marginTop: 10, color: "#64748b" }}>
                No target set yet
              </Text>
              <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Tap to view summary
              </Text>
            </View>
          ) : (
            <>
              {/* ✅ PROGRESS BAR */}
              <View style={styles.barBackground}>
                <LinearGradient
                  colors={["#22c55e", "#4ade80"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.barFill,
                    { width: `${Math.min(target.progress_percentage, 100)}%` },
                  ]}
                />
              </View>

              {target.progress_percentage >= 100 && (
                <Text
                  style={{
                    color: "#16a34a",
                    fontWeight: "bold",
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  🎉 You have reached your target!
                </Text>
              )}

              {/* ✅ FOOTER */}
              <View style={styles.targetFooter}>
                <View>
                  <Text style={styles.footerLabel}>Collected</Text>
                  <Text style={styles.footerValue}>
                    {formatMoney(target.monthly_collected)}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.footerLabel, { color: "#ef4444" }]}>
                    Remaining
                  </Text>
                  <Text style={[styles.footerValue, { color: "#ef4444" }]}>
                    {formatMoney(target.needs_to_collect)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderBillItem = (b, idx) => {
    const total = b.after_vat_amount || b.Net_Amount || 0;
    const paid = b.Paid_Amount || 0;
    const due = Math.max(total - paid, 0);

    return (
      <TouchableOpacity
        key={`bill-${idx}`}
        onPress={() =>
          navigation.navigate("BillDetail", { invoiceNo: b.Invoice_no })
        }
        style={styles.activityTap}
      >
        <View style={styles.activityRow}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={24}
            color="#1e293b"
          />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.activityItem}>
              INV-{b.Invoice_no} • {b.Customer_Name}
            </Text>
            <Text style={styles.activitySub}>
              Total: {formatMoney(total)} • Due:{" "}
              <Text style={{ color: due > 0 ? "#ef4444" : "#22c55e" }}>
                {formatMoney(due)}
              </Text>
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRecentActivity = () => {
    if (loading)
      return <ActivityIndicator color="#2563eb" style={{ padding: 20 }} />;

    if (activeStat === "shops") {
      return recent.shops.length > 0 ? (
        recent.shops.slice(0, 3).map((s, idx) => (
          <View key={`shop-${idx}`} style={styles.activityTap}>
            <View style={styles.activityRow}>
              <MaterialCommunityIcons
                name="storefront-outline"
                size={24}
                color="#1e293b"
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.activityItem}>
                  {s.Name || s.name || "Unknown Shop"}
                </Text>
                <Text style={styles.activitySub}>
                  {s.City_1 || "Location verified"}
                </Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No recent visits.</Text>
      );
    }

    if (activeStat === "pending")
      return recent.pending_bills.length > 0 ? (
        recent.pending_bills.slice(0, 3).map((b, idx) => renderBillItem(b, idx))
      ) : (
        <Text style={styles.emptyText}>No pending bills.</Text>
      );
    if (activeStat === "paid")
      return recent.paid_bills.length > 0 ? (
        recent.paid_bills.slice(0, 3).map((b, idx) => renderBillItem(b, idx))
      ) : (
        <Text style={styles.emptyText}>No paid bills.</Text>
      );

    if (activeStat === "collected") {
      return recent.payments.length > 0 ? (
        recent.payments.slice(0, 3).map((p, idx) => (
          <View key={`pay-${idx}`} style={styles.activityTap}>
            <View style={styles.activityRow}>
              <MaterialCommunityIcons
                name="cash-check"
                size={24}
                color="#1e293b"
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.activityItem}>
                  {formatMoney(p.Payment_Amount)}
                </Text>
                <Text style={styles.activitySub}>{p.Customer_Name}</Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No recent payments.</Text>
      );
    }

    return <Text style={styles.emptyText}>No recent activity found.</Text>;
  };

  return (
    <SafeAreaView style={styles.safeAreaWrapper} edges={["bottom"]}>
      <View style={{ flex: 1, backgroundColor: "#f0fdf4" }}>
        <LinearGradient
          colors={["#86efadd0", "#f0fdf4", "#86edacd0", "#ffffff99"]}
          style={styles.screenWrapper}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={["#275ddb", "#5bc9ed"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.5, y: 0 }}
              style={styles.header}
            >
              <View>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <Text style={styles.headerSub}>Hello, {userName}!</Text>
              </View>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={async () => {
                  await AsyncStorage.clear();
                  navigation.replace("Login");
                }}
              >
                <MaterialCommunityIcons name="logout" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.statGrid}>
              <StatCard
                color="#3cbf00"
                icon="store"
                label="Shops"
                value={stats.shops.toString()}
                active={activeStat === "shops"}
                onPress={() => setActiveStat("shops")}
              />
              <StatCard
                color="#ef4444"
                icon="clock-outline"
                label="Pending"
                value={stats.pending.toString()}
                active={activeStat === "pending"}
                onPress={() => setActiveStat("pending")}
              />
              <StatCard
                color="#f97316"
                icon="trending-up"
                label="Collected"
                value={formatMoney(stats.collected)}
                active={activeStat === "collected"}
                onPress={() => setActiveStat("collected")}
              />
              <StatCard
                color="#3b82f6"
                icon="check-all"
                label="Paid"
                value={stats.paid.toString()}
                active={activeStat === "paid"}
                onPress={() => setActiveStat("paid")}
              />
            </View>

            <TargetProgressBar />

            {/* --- QUICK ACTIONS --- */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            {/* 3x2 Grid Layout */}
            <View style={styles.actionGrid}>
              <View style={styles.actionGridRow}>
                <ActionBtn
                  imageSource={require("../assets/shop.jpg")}
                  label="Shops"
                  onPress={() => navigation.navigate("ShopList")}
                />
                <ActionBtn
                  imageSource={require("../assets/pending.png")}
                  label="Pending"
                  onPress={() => navigation.navigate("PendingBills")}
                />
                <ActionBtn
                  imageSource={require("../assets/payment-icon.png")}
                  label="Payments"
                  onPress={() => navigation.navigate("Payment")}
                />
              </View>



              <View
                style={[styles.actionGridRow, { justifyContent: "flex-start" }]}
              >
                <ActionBtn
                  imageSource={require("../assets/voucher.png")}
                  label="Voucher"
                  onPress={() => navigation.navigate("PaymentVoucher")}
                />
                <ActionBtn
                  imageSource={require("../assets/Report.png")}
                  label="Reports"
                  onPress={() => navigation.navigate("DailyReport")}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Recent {activeStat}</Text>
            <View style={styles.activityBox}>{renderRecentActivity()}</View>

            <View style={{ height: 120 }} />
          </ScrollView>

          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("AddBill")}
          >
            <MaterialCommunityIcons name="plus" size={35} color="white" />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}


const StatCard = ({ color, icon, label, value, onPress, active }) => (
  <TouchableOpacity
    style={[
      styles.statCard,
      {
        backgroundColor: color,
        borderWidth: active ? 3 : 0,
        borderColor: "#1e293b",
      },
    ]}
    onPress={onPress}
  >
    <MaterialCommunityIcons name={icon} size={26} color="white" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const ActionBtn = ({ label, onPress, imageSource, icon, useIcon }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
    <View style={styles.iconContainer}>
      {useIcon ? (
        <MaterialCommunityIcons name={icon} size={28} color="#2563eb" />
      ) : (
        <Image source={imageSource} style={styles.customIcon} />
      )}
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeAreaWrapper: { flex: 1, backgroundColor: "#131313" },
  screenWrapper: { flex: 1 },
  container: { flex: 1 },
  header: {
    padding: 40,
    paddingTop: Platform.OS === "ios" ? 70 : 60,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  headerTitle: { color: "white", fontSize: 26, fontWeight: "bold" },
  headerSub: { color: "#bfdbfe", fontSize: 16 },
  targetWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    margin: 15,
    padding: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    marginTop: 10,
  },
  
  targetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    alignItems: "center",
  },
  targetTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  targetPercent: { fontSize: 18, fontWeight: "bold", color: "#16a34a" },
  barBackground: {
    height: 10,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 15,
  },
  barFill: { height: "100%", borderRadius: 5 },
  targetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 5,
  },
  footerLabel: {
    fontSize: 10,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  footerValue: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
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
    height: 130,
    justifyContent: "space-between",
    elevation: 4,
  },
  statValue: { color: "white", fontSize: 14, fontWeight: "bold" },
  statLabel: { color: "white", opacity: 0.9, fontSize: 12 },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 10,
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  actionGrid: {
    paddingHorizontal: 15,
    marginTop: 15,
    gap: 12,
  },
  actionGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    marginTop: 15,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  iconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    padding: 10,
    borderRadius: 12,
  },
  actionLabel: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: "bold",
    color: "#1e293b",
  },
  customIcon: { width: 32, height: 32, resizeMode: "contain" },
  activityBox: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    margin: 20,
    padding: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  activityItem: { fontSize: 14, color: "#1e293b", fontWeight: "700" },
  activitySub: { color: "#475569", fontSize: 12, marginTop: 2 },
  activityTap: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  activityRow: { flexDirection: "row", alignItems: "center" },
  emptyText: { textAlign: "center", color: "#64748b", padding: 20 },
  fab: {
    position: "absolute",
    bottom: 40,
    right: 25,
    width: 70,
    height: 70,
    backgroundColor: "#2563eb",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    elevation: 12,
    zIndex: 999,
  },
});
