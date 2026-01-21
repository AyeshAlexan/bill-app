import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getBills } from "../services/billApi";

export default function PaymentScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCollected, setTotalCollected] = useState(0);

  const fetchPaymentHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBills();
      // Filter bills with status "Paid" or due_amount === 0 (fully paid)
      const paidBills = data.filter(
        (bill) =>
          bill.status === "Paid" ||
          (parseFloat(bill.due_amount || 0) === 0 &&
            parseFloat(bill.total_amount || 0) > 0),
      );
      setHistory(paidBills);
      console.log("Payment history:", paidBills);

      // Calculate total collected from all paid bills
      const total = paidBills.reduce(
        (sum, bill) => sum + parseFloat(bill.total_amount || 0),
        0,
      );
      setTotalCollected(total);
      console.log("Total collected:", total);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching payment history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchPaymentHistory();
    }, [fetchPaymentHistory]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <Text style={styles.headerSub}>All collected payments</Text>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total Collected</Text>
          <Text style={styles.totalValue}>
            Rs.{totalCollected.toLocaleString()}
          </Text>
          <Text style={styles.totalSub}>{history.length} payments</Text>
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#00b894" />
        </View>
      ) : error ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#ef4444", fontSize: 16 }}>Error: {error}</Text>
        </View>
      ) : history.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#94a3b8", fontSize: 16 }}>
            No payments yet
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        >
          {history.map((item) => (
            <View key={item.id.toString()} style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color="#10b981"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.historyBill}>
                    Bill #{item.bill_number || item.billNo}
                  </Text>
                  <Text style={styles.historyTime}>
                    {item.bill_date || "2026-01-05"} • {item.time || "N/A"}
                  </Text>
                </View>
                <View style={styles.cashBadge}>
                  <Text style={styles.cashText}>
                    {item.payment_method || "Cash"}
                  </Text>
                </View>
              </View>
              <View style={styles.shopInfo}>
                <MaterialCommunityIcons
                  name="storefront"
                  size={16}
                  color="#94a3b8"
                />
                <Text style={styles.shopNameText}>
                  {item.shop?.name || item.shop_name || "N/A"} •{" "}
                  {item.shop?.location || item.location || "N/A"}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.finalRow}>
                <Text style={styles.finalLabel}>Amount Collected</Text>
                <Text style={styles.finalAmount}>
                  Rs.{item.total_amount || item.amount}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#00b894",
    padding: 25,
    paddingTop: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "bold" },
  headerSub: { color: "white", opacity: 0.8, marginBottom: 20 },
  totalBox: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 20,
    borderRadius: 25,
  },
  totalLabel: { color: "white", fontSize: 12 },
  totalValue: { color: "white", fontSize: 32, fontWeight: "bold" },
  totalSub: { color: "white", fontSize: 12, opacity: 0.8 },
  historyCard: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  iconCircle: { backgroundColor: "#dcfce7", padding: 8, borderRadius: 12 },
  historyBill: { fontSize: 16, fontWeight: "bold" },
  historyTime: { color: "#94a3b8", fontSize: 11 },
  cashBadge: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cashText: { color: "#10b981", fontSize: 10, fontWeight: "bold" },
  shopInfo: { flexDirection: "row", alignItems: "center", marginTop: 15 },
  shopNameText: { color: "#64748b", fontSize: 13, marginLeft: 8 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },
  finalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  finalLabel: { color: "#94a3b8" },
  finalAmount: { color: "#10b981", fontSize: 20, fontWeight: "bold" },
});
