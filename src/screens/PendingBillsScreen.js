import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { getPendingBills } from "../services/billApi";
import { fetchRoutes } from "../services/shopApi"; 

const totalOf = (b) => Number(b?.after_vat_amount ?? b?.Net_Amount ?? b?.Gross_Amount ?? 0);
const paidOf = (b) => Number(b?.Paid_Amount ?? 0);

export default function PendingBillsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeModal, setRouteModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [billData, routeData] = await Promise.all([
        getPendingBills(),
        fetchRoutes()
      ]);
      setBills(Array.isArray(billData) ? billData : []);
      setRoutes(routeData || []);
    } catch (e) {
      console.log("Error loading pending bills:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const filteredBills = useMemo(() => {
    if (!selectedRoute) return bills;
    return bills.filter(item => 
      (item.Route === selectedRoute || item.City_1 === selectedRoute)
    );
  }, [bills, selectedRoute]);

  const renderItem = ({ item }) => {
    const total = totalOf(item);
    const paid = paidOf(item);
    const due = Math.max(total - paid, 0);
    const status = paid > 0 ? "Partial" : "Pending";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("BillDetail", { invoiceNo: item.Invoice_no })}
      >
        <View style={styles.cardTop}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#ef4444" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.billNo}>INV-{item.Invoice_no || item.id}</Text>
            <Text style={styles.date}>
              {item.Invoice_Date || item.date || item.created_at || "Recent"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status === "Partial" ? "#fef3c7" : "#fee2e2" }]}>
            <Text style={[styles.statusText, { color: status === "Partial" ? "#d97706" : "#ef4444" }]}>
              {status}
            </Text>
          </View>
        </View>

        <View style={styles.shopRow}>
          <MaterialCommunityIcons name="storefront-outline" size={16} color="#94a3b8" />
          <Text style={styles.shopText} numberOfLines={1}>
            {item.Customer_Name || "Unnamed Shop"} • {item.Route || item.City_1 || "General"}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.amountRow}>
          <View>
            <Text style={styles.amtLabel}>Bill Total</Text>
            <Text style={styles.amtValue}>Rs. {total.toFixed(2)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.amtLabel}>Balance Due</Text>
            <Text style={[styles.amtValue, { color: "#ef4444" }]}>
              Rs. {due.toFixed(2)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* UPDATED ARROW ONLY */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerRow}>
            <View>
                <Text style={styles.headerTitle}>Pending Bills</Text>
                <Text style={styles.headerSub}>Bills awaiting collection</Text>
            </View>
            <TouchableOpacity style={styles.filterDropdown} onPress={() => setRouteModal(true)}>
                <Text style={styles.filterText} numberOfLines={1}>
                    {selectedRoute || "All Cities"}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="white" />
            </TouchableOpacity>
        </View>

        <View style={styles.statsBox}>
          <Text style={styles.statsLabel}>Total Pending</Text>
          <Text style={styles.statsValue}>{filteredBills.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#ff3d00" />
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          renderItem={renderItem}
          keyExtractor={(item, idx) => String(item.Invoice_no ?? idx)}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        />
      )}

      <Modal visible={routeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Route/City</Text>
            <FlatList
              data={[{ code: null }, ...routes]}
              keyExtractor={(item, index) => item.code || 'all'}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedRoute(item.code);
                    setRouteModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selectedRoute === item.code && styles.selectedText]}>
                    {item.code || "All Cities"}
                  </Text>
                  {selectedRoute === item.code && <MaterialCommunityIcons name="check" size={20} color="#ff3d00" />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setRouteModal(false)}>
               <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#ff3d00",
    padding: 25,
    paddingTop: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "bold" },
  headerSub: { color: "white", opacity: 0.9, fontSize: 13 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 5 },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: 150,
  },
  filterText: { color: 'white', fontWeight: 'bold', marginRight: 4, fontSize: 12 },
  statsBox: {
    backgroundColor: "rgba(255,255,255,0.25)",
    padding: 18,
    borderRadius: 20,
    marginTop: 20,
  },
  statsLabel: { color: "white", fontSize: 13 },
  statsValue: { color: "white", fontSize: 32, fontWeight: "bold" },
  card: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  iconCircle: { backgroundColor: "#fee2e2", padding: 10, borderRadius: 15 },
  billNo: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  date: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "bold", textTransform: 'uppercase' },
  shopRow: { flexDirection: "row", alignItems: "center", marginTop: 15 },
  shopText: { color: "#64748b", fontSize: 13, marginLeft: 8 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },
  amountRow: { flexDirection: "row", justifyContent: "space-between" },
  amtLabel: { color: "#94a3b8", fontSize: 11, textTransform: 'uppercase', fontWeight: 'bold' },
  amtValue: { fontSize: 16, fontWeight: "bold", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  modalCard: { backgroundColor: 'white', borderRadius: 25, padding: 25, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalItemText: { fontSize: 15, color: '#475569' },
  selectedText: { color: '#ff3d00', fontWeight: 'bold' },
  modalClose: { marginTop: 20, backgroundColor: '#f1f5f9', padding: 12, borderRadius: 15, alignItems: 'center' },
  closeBtnText: { fontWeight: 'bold', color: '#64748b' }
});