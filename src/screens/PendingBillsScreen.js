import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getBills } from "../services/billApi";

export default function PendingBillsScreen({ navigation }) {
  const [pendingBills, setPendingBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPendingBills = async () => {
      try {
        setLoading(true);
        const data = await getBills();
        // Filter bills with status "Pending" or "Partial"
        const filtered = data.filter(
          (bill) =>
            bill.status === "Pending" ||
            bill.status === "Partial" ||
            bill.due_amount > 0,
        );
        setPendingBills(filtered);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching pending bills:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingBills();
  }, []);

  return (
    <View style={styles.container}>
      {/* Orange-Red Header - Matches Image 7 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Bills</Text>
        <Text style={styles.headerSub}>Bills awaiting collection</Text>

        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>Total Pending</Text>
          <Text style={styles.statsValue}>{pendingBills.length}</Text>
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#ff3d00" />
        </View>
      ) : error ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#ef4444", fontSize: 16 }}>Error: {error}</Text>
        </View>
      ) : pendingBills.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#94a3b8", fontSize: 16 }}>
            No pending bills
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingBills}
          contentContainerStyle={{ padding: 20 }}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            /* Clicking this card takes the user to BillDetails */
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate("BillDetails", { billId: item.id })
              }
            >
              <View style={styles.cardTop}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={24}
                    color="#ef4444"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.billNo}>
                    Bill #{item.bill_number || item.billNo}
                  </Text>
                  <Text style={styles.date}>
                    {item.bill_date || "2026-01-05"}
                  </Text>
                </View>
                {/* Status Badge colors change based on status */}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        item.status === "Partial" ? "#fef3c7" : "#fee2e2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          item.status === "Partial" ? "#d97706" : "#ef4444",
                      },
                    ]}
                  >
                    {item.status || "Pending"}
                  </Text>
                </View>
              </View>

              <View style={styles.shopRow}>
                <MaterialCommunityIcons
                  name="storefront-outline"
                  size={16}
                  color="#94a3b8"
                />
                <Text style={styles.shopText}>
                  {item.shop?.name || item.shop_name || "N/A"} •{" "}
                  {item.shop?.location || item.location || "N/A"}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.amountRow}>
                <View>
                  <Text style={styles.amtLabel}>Total Amount</Text>
                  <Text style={styles.amtValue}>
                    Rs.{item.total_amount || item.total || 0}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.amtLabel}>Due Amount</Text>
                  <Text style={[styles.amtValue, { color: "#ef4444" }]}>
                    Rs.{item.due_amount || item.due || 0}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#ff3d00", // Vibrant orange-red from Image 7
    padding: 25,
    paddingTop: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: { marginBottom: 10 },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "bold" },
  headerSub: { color: "white", opacity: 0.9, marginBottom: 20 },
  statsBox: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 15,
    borderRadius: 20,
  },
  statsLabel: { color: "white", fontSize: 12 },
  statsValue: { color: "white", fontSize: 28, fontWeight: "bold" },
  card: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  iconCircle: { backgroundColor: "#fee2e2", padding: 10, borderRadius: 15 },
  billNo: { fontSize: 16, fontWeight: "bold" },
  date: { color: "#94a3b8", fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "bold" },
  shopRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  shopText: { color: "#64748b", fontSize: 13, marginLeft: 8 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },
  amountRow: { flexDirection: "row", justifyContent: "space-between" },
  amtLabel: { color: "#94a3b8", fontSize: 11, textTransform: "uppercase" },
  amtValue: { fontSize: 16, fontWeight: "bold", marginTop: 2 },
});
