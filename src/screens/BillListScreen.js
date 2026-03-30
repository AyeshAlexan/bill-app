import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBills } from "../services/billApi";

const totalOf = (b) => Number(b?.after_vat_amount ?? b?.Net_Amount ?? b?.Gross_Amount ?? 0);
const paidOf = (b) => Number(b?.Paid_Amount ?? 0);

export default function BillListScreen({ route, navigation }) {
  const { shopCode, shopName, routeCode } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bills, setBills] = useState([]);
  const [filter, setFilter] = useState("Pending");

  const load = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const data = await getBills();
      
      const shopBills = (Array.isArray(data) ? data : []).filter(
        (b) => String(b?.Customer_NIC) === String(shopCode)
      );
      setBills(shopBills);
    } catch (e) {
      console.log("Load error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [shopCode])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const summary = useMemo(() => {
    const total = bills.length;
    const pending = bills.filter((b) => totalOf(b) - paidOf(b) > 0.5).length;
    const paid = bills.filter((b) => totalOf(b) - paidOf(b) <= 0.5).length;
    return { total, pending, paid };
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const isPending = totalOf(b) - paidOf(b) > 0.5;
      return filter === "Pending" ? isPending : !isPending;
    });
  }, [bills, filter]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#30a830" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      {/* HEADER UPDATED TO #30a830 GREEN */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
        </TouchableOpacity>

        <Text style={styles.shopNameText}>{shopName || "Shop Details"}</Text>

        <View style={styles.locRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={16} color="white" />
          <Text style={styles.shopLoc}>
            Route: {routeCode || "Not Assigned"}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Total</Text>
            <Text style={styles.miniValue}>{summary.total}</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Pending</Text>
            <Text style={styles.miniValue}>{summary.pending}</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Paid</Text>
            <Text style={styles.miniValue}>{summary.paid}</Text>
          </View>
        </View>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, filter === "Pending" && styles.activeBtn]}
          onPress={() => setFilter("Pending")}
        >
          <Text style={filter === "Pending" ? styles.activeText : styles.inactiveText}>
            Pending ({summary.pending})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, filter === "Paid" && styles.activeBtnPaid]}
          onPress={() => setFilter("Paid")}
        >
          <Text style={filter === "Paid" ? styles.activeText : styles.inactiveText}>
            Paid ({summary.paid})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredBills}
        keyExtractor={(item) => String(item.Invoice_no)}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="file-remove-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No {filter.toLowerCase()} bills found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const total = totalOf(item);
          const paid = paidOf(item);
          const due = Math.max(total - paid, 0);
          const status = due > 0.5 ? "Pending" : "Paid";

          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate("BillDetail", { invoiceNo: item.Invoice_no })}
            >
              <View style={styles.billCard}>
                <View style={styles.billHeader}>
                  <View style={[styles.iconCircle, status === "Paid" && { backgroundColor: "#f0fdf4" }]}>
                    <MaterialCommunityIcons
                      name={status === "Paid" ? "check-circle" : "clock-outline"}
                      size={24}
                      color={status === "Paid" ? "#30a830" : "#ef4444"}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.billNo}>INV-{item.Invoice_no}</Text>
                    <Text style={styles.billDate}>{item.Invoice_date}</Text>
                  </View>

                  <View style={[styles.statusBadge, status === "Paid" && { backgroundColor: "#f0fdf4" }]}>
                    <Text style={[styles.statusText, status === "Paid" && { color: "#30a830" }]}>
                      {status}
                    </Text>
                  </View>
                </View>

                <View style={styles.billDivider} />

                <View style={styles.amountRow}>
                  <View>
                    <Text style={styles.amountLabel}>Bill Total</Text>
                    <Text style={styles.amountVal}>Rs. {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</Text>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.amountLabel}>Balance Due</Text>
                    <Text style={[styles.amountVal, { color: due > 0.5 ? "#ef4444" : "#30a830" }]}>
                      Rs. {due.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#1D63DC", 
    padding: 25,
    paddingTop: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 5,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 5 },
  shopNameText: { color: "white", fontSize: 22, fontWeight: "bold", marginTop: 5 },
  locRow: { flexDirection: "row", alignItems: "center", marginTop: 4, opacity: 0.9 },
  shopLoc: { color: "white", fontSize: 14, marginLeft: 5, fontWeight: '500' },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  miniCard: { backgroundColor: "rgba(255,255,255,0.15)", padding: 12, borderRadius: 16, width: "31%" },
  miniLabel: { color: "white", fontSize: 10, textTransform: "uppercase", opacity: 0.8 },
  miniValue: { color: "white", fontSize: 18, fontWeight: "bold", marginTop: 2 },
  toggleRow: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 20, justifyContent: "space-between" },
  toggleBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "white",
    marginHorizontal: 5,
    elevation: 1,
  },
  activeBtn: { backgroundColor: "#ef4444" }, // Keeping red for Pending alerts
  activeBtnPaid: { backgroundColor: "#30a830" }, // Your green for Paid
  activeText: { color: "white", fontWeight: "bold" },
  inactiveText: { color: "#94a3b8", fontWeight: "bold" },
  billCard: { backgroundColor: "white", borderRadius: 25, padding: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  billHeader: { flexDirection: "row", alignItems: "center" },
  iconCircle: { backgroundColor: "#fef2f2", padding: 10, borderRadius: 15 },
  billNo: { fontSize: 16, fontWeight: "bold", color: '#1e293b' },
  billDate: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  statusBadge: { backgroundColor: "#fef2f2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: "#ef4444", fontSize: 11, fontWeight: "bold" },
  billDivider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },
  amountRow: { flexDirection: "row", justifyContent: "space-between" },
  amountLabel: { color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  amountVal: { fontSize: 16, fontWeight: "bold", marginTop: 4, color: '#0f172a' },
  emptyBox: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94a3b8', marginTop: 10, fontSize: 16 }
});