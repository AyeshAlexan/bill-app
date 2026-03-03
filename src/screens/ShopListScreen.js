import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { fetchRoutes, fetchShopsByRoute } from "../services/shopApi";
import { getBills } from "../services/billApi";

const billTotal = (b) =>
  Number(b?.after_vat_amount ?? b?.Net_Amount ?? b?.Gross_Amount ?? 0);

const billPaid = (b) => Number(b?.Paid_Amount ?? 0);

export default function ShopListScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [routeModal, setRouteModal] = useState(false);
  const [routeSearch, setRouteSearch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(null); 

  const [shops, setShops] = useState([]);
  const [bills, setBills] = useState([]);

  const filteredRoutes = useMemo(() => {
    const q = routeSearch.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        String(r.code || "").toLowerCase().includes(q) ||
        String(r.description || "").toLowerCase().includes(q),
    );
  }, [routes, routeSearch]);

  const load = async (routeCode) => {
    try {
      setLoading(true);
      const [rts, allBills] = await Promise.all([fetchRoutes(), getBills()]);
      setRoutes(rts || []);
      setBills(Array.isArray(allBills) ? allBills : []);

      const sh = await fetchShopsByRoute(routeCode);
      setShops(sh || []);
    } catch (e) {
      console.log("Load Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load(selectedRoute?.code || null);
    }, [selectedRoute?.code]),
  );

  const shopsWithSummary = useMemo(() => {
    const byCustomer = new Map();
    for (const b of bills || []) {
      const code = b?.Customer_NIC;
      if (!code) continue;
      const total = billTotal(b);
      const paid = billPaid(b);
      const due = Math.max(total - paid, 0);

      if (!byCustomer.has(code)) byCustomer.set(code, { pendingCount: 0, due: 0 });
      if (due > 0) {
        const cur = byCustomer.get(code);
        cur.pendingCount += 1;
        cur.due += due;
      }
    }
    return (shops || []).map((s) => {
      const sum = byCustomer.get(s.code) || { pendingCount: 0, due: 0 };
      return { ...s, pendingCount: sum.pendingCount, dueTotal: sum.due };
    });
  }, [shops, bills]);

  return (
    <View style={styles.container}>
      {/* PROFESSIONAL GREEN HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 10 }}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Shops ({shops.length})</Text>
          <Text style={styles.headerSub}>
            {selectedRoute ? `City: ${selectedRoute.code}` : "Showing All Cities"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.routeBtn}
          onPress={() => setRouteModal(true)}
        >
          <MaterialCommunityIcons name="map-marker-radius" size={18} color="white" />
          <Text style={styles.routeBtnText}>
            {selectedRoute?.code ? selectedRoute.code : "Cities"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#30a830" />
        </View>
      ) : (
        <FlatList
          data={shopsWithSummary}
          keyExtractor={(item, idx) => item.code?.toString() || idx.toString()}
          contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.shopCard}
              onPress={() =>
                navigation.navigate("BillList", {
                  shopCode: item.code,
                  shopName: item.name,
                  routeCode: item.route,
                })
              }
            >
              <View style={styles.shopTop}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name="storefront-outline" size={24} color="#30a830" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.shopName}>{item.name || "—"}</Text>
                  <Text style={styles.shopMeta}>
                    ID: {item.code || "—"} {item.phone ? `• ${item.phone}` : ""}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <View style={styles.summaryChip}>
                  <Text style={styles.summaryLabel}>Pending</Text>
                  <Text style={[styles.summaryValue, { fontWeight: 800, color: item.pendingCount > 0 ? '#dc2626' : '#30a830' }]}>
                    {item.pendingCount || 0} Bills
                  </Text>
                </View>
                <View style={[styles.summaryChip, { backgroundColor: '#f8fafc' }]}>
                  <Text style={styles.summaryLabel}>Outstanding</Text>
                  <Text style={styles.summaryValue}>
                    Rs. {Number(item.dueTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="store-off-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No shops found</Text>
              <Text style={styles.emptySub}>Try selecting a different city route</Text>
            </View>
          }
        />
      )}

      {/* Route Modal */}
      <Modal visible={routeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Route City</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Search by name or code..."
              placeholderTextColor="#94a3b8"
              value={routeSearch}
              onChangeText={setRouteSearch}
            />
            
            <FlatList
              data={[{ code: null, description: "All Cities" }, ...filteredRoutes]}
              keyExtractor={(item, idx) => item.code || "all"}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem, 
                    ((!item.code && !selectedRoute) || (item.code === selectedRoute?.code)) && { backgroundColor: '#f0fdf4' }
                  ]}
                  onPress={() => {
                    setSelectedRoute(item.code ? item : null);
                    setRouteModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, !item.code && { color: "#30a830" }]}>
                      {item.code || "SHOW ALL CITIES"}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setRouteModal(false)}
            >
              <Text style={styles.modalCloseText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  header: {
    backgroundColor: "#30a830",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 35,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  routeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  routeBtnText: { color: "white", fontWeight: "700", marginLeft: 6, fontSize: 12 },
  shopCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 18,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  shopTop: { flexDirection: "row", alignItems: "center" },
  iconBox: { backgroundColor: "#f0fdf4", padding: 10, borderRadius: 14 },
  shopName: { fontWeight: "700", fontSize: 17, color: "#1e293b" },
  shopMeta: { color: "#64748b", fontSize: 12, marginTop: 3 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryChip: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  summaryLabel: { color: "#94a3b8", fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  summaryValue: { color: "#1e293b", fontWeight: "800", marginTop: 4, fontSize: 14 },
  emptyBox: { alignItems: "center", marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontWeight: "800", fontSize: 18, marginTop: 15, color: "#1e293b" },
  emptySub: { color: "#64748b", marginTop: 8, textAlign: "center", lineHeight: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b", marginBottom: 20 },
  modalInput: {
    backgroundColor: "#f1f5f9",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#1e293b'
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 5,
  },
  modalItemText: { fontWeight: "700", fontSize: 15, color: "#334155" },
  modalClose: {
    marginTop: 15,
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f1f5f9",
    borderRadius: 18,
    marginBottom: 10
  },
  modalCloseText: { fontWeight: "800", color: "#64748b", fontSize: 15 }
});