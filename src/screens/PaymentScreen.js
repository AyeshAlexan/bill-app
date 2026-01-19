import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PaymentScreen({ navigation }) {
  const history = [
    {
      id: "1",
      billNo: "INV-2025-098",
      shop: "Kandy City Store",
      location: "Kandy",
      amount: "4,500",
      date: "2026-01-05",
      time: "10:30 AM",
    },
  ];

  const validateCard = (cardNumber) => {
    const regex = /^(\d{4}-){3}\d{4}$/;
    return regex.test(cardNumber);
  };

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
          <Text style={styles.totalValue}>Rs.4,500</Text>
          <Text style={styles.totalSub}>1 payments</Text>
        </View>
      </View>

      <FlatList
        data={history}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name="check"
                  size={20}
                  color="#10b981"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.historyBill}>Bill #{item.billNo}</Text>
                <Text style={styles.historyTime}>
                  {item.date} • {item.time}
                </Text>
              </View>
              <View style={styles.cashBadge}>
                <Text style={styles.cashText}>Cash</Text>
              </View>
            </View>
            <View style={styles.shopInfo}>
              <MaterialCommunityIcons
                name="storefront"
                size={16}
                color="#94a3b8"
              />
              <Text style={styles.shopNameText}>
                {item.shop} • {item.location}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.finalRow}>
              <Text style={styles.finalLabel}>Amount Collected</Text>
              <Text style={styles.finalAmount}>Rs.{item.amount}</Text>
            </View>
          </View>
        )}
      />
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
