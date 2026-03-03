import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getPayments } from "../services/paymentApi";

export default function PaymentScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [showDropdown, setShowDropdown] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getPayments();
      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("PaymentScreen load error:", e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const citiesList = useMemo(() => {
    const extractedCities = payments
      .map((p) => p.City_1 || p.location || "N/A")
      .filter((city) => city !== "N/A");
    return ["All Cities", ...new Set(extractedCities)];
  }, [payments]);

  const filteredData = useMemo(() => {
    if (selectedCity === "All Cities") return payments;
    return payments.filter((p) => (p.City_1 || p.location) === selectedCity);
  }, [payments, selectedCity]);

  const totalAmount = useMemo(() => {
    return filteredData.reduce((sum, p) => sum + parseFloat(p.Payment_Amount || 0), 0);
  }, [filteredData]);

  const renderItem = ({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="check-decagram" size={20} color="#10b981" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.historyBill}>INV-{item.Sales_no || "—"}</Text>
          <Text style={styles.historyTime}>{item.Payment_date || "Recent"}</Text>
        </View>
        <View style={styles.cashBadge}>
          <Text style={styles.cashText}>PAID</Text>
        </View>
      </View>

      <View style={styles.shopInfo}>
        <MaterialCommunityIcons name="storefront" size={16} color="#94a3b8" />
        <Text style={styles.shopNameText}>
          {item.Customer_Name || "NIMAL SALOON"} • {item.City_1 || item.location || "N/A"}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.finalRow}>
        <Text style={styles.finalLabel}>Amount Collected</Text>
        <Text style={styles.finalAmount}>Rs.{Number(item.Payment_Amount).toLocaleString()}</Text>
      </View>

      <TouchableOpacity
        style={styles.viewBtn}
        onPress={() => navigation.navigate("ViewBill", { billId: item.Sales_no })}
      >
        <MaterialCommunityIcons name="eye-outline" size={18} color="#0061ff" />
        <Text style={styles.viewBtnText}>View Bill</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          {/* UPDATED ARROW ONLY */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cityPickerBtn} 
            onPress={() => setShowDropdown(true)}
          >
            <Text style={styles.cityPickerText}>{selectedCity}</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>Payment History</Text>
        <Text style={styles.headerSub}>All collected payments</Text>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total Collected</Text>
          <Text style={styles.totalValue}>Rs.{Number(totalAmount).toLocaleString()}</Text>
          <Text style={styles.totalSub}>{filteredData.length} payments</Text>
        </View>
      </View>

      <Modal visible={showDropdown} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownMenu}>
              <FlatList
                data={citiesList}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedCity(item);
                      setShowDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownText, 
                      selectedCity === item && { color: "#30a830", fontWeight: "bold" }
                    ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {loading ? (
        <ActivityIndicator size="large" color="#30a830" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="cash-remove" size={48} color="#cbd5e1" />
              <Text style={{ color: "#94a3b8", marginTop: 10 }}>No payments for this city</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#30a830",
    padding: 25,
    paddingTop: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "bold" },
  headerSub: { color: "white", opacity: 0.8, marginBottom: 20 },
  cityPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cityPickerText: { color: "white", fontWeight: "bold", marginRight: 5 },
  totalBox: { backgroundColor: "rgba(255,255,255,0.2)", padding: 20, borderRadius: 25 },
  totalLabel: { color: "white", fontSize: 12 },
  totalValue: { color: "white", fontSize: 32, fontWeight: "bold" },
  totalSub: { color: "white", fontSize: 12, opacity: 0.8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.1)" },
  dropdownMenu: {
    position: "absolute",
    top: 100,
    right: 25,
    backgroundColor: "white",
    borderRadius: 15,
    width: 160,
    maxHeight: 250,
    elevation: 5,
    shadowColor: "#000",
    shadowRadius: 10,
    shadowOpacity: 0.1,
  },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  dropdownText: { color: "#64748b", fontSize: 14 },
  historyCard: { backgroundColor: "white", borderRadius: 25, padding: 20, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  iconCircle: { backgroundColor: "#dcfce7", padding: 8, borderRadius: 12 },
  historyBill: { fontSize: 16, fontWeight: "bold" },
  historyTime: { color: "#94a3b8", fontSize: 11 },
  cashBadge: { backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  cashText: { color: "#0fa171", fontSize: 10, fontWeight: "bold" },
  shopInfo: { flexDirection: "row", alignItems: "center", marginTop: 15 },
  shopNameText: { color: "#64748b", fontSize: 13, marginLeft: 8 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },
  finalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  finalLabel: { color: "#94a3b8" },
  finalAmount: { color: "#10b981", fontSize: 20, fontWeight: "bold" },
  viewBtn: {
    marginTop: 15,
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  viewBtnText: { color: "#0061ff", fontWeight: "800" },
  emptyContainer: { alignItems: "center", marginTop: 50 },
});