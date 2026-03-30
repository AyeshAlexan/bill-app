import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Easing,
  Platform,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchRoutes, fetchShopsByRoute } from "../services/shopApi";
import { getBills } from "../services/billApi";

// --- ANIMATED SHOP CARD COMPONENT ---
const AnimatedShopCard = ({ item, index, onPress }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 400,
      delay: (index % 15) * 60, 
      easing: Easing.out(Easing.back(1)),
      useNativeDriver: true,
    }).start();
  }, [item.code]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [25, 0],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity style={styles.shopCard} onPress={onPress}>
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
            <Text
              style={[
                styles.summaryValue,
                { fontWeight: "800", color: item.pendingCount > 0 ? "#dc2626" : "#30a830" },
              ]}
            >
              {item.pendingCount || 0} Bills
            </Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: "#f8fafc" }]}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={styles.summaryValue}>
              Rs. {Number(item.dueTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- MODERN SHOP LOADING ANIMATION ---
const ShopLoader = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -15,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={loaderStyles.container}>
      <View style={loaderStyles.animationBox}>
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
          <MaterialCommunityIcons name="map-marker" size={30} color="#30a830" />
        </Animated.View>
        <Animated.View style={[loaderStyles.shopIcon, { transform: [{ scale: scaleAnim }] }]}>
          <MaterialCommunityIcons name="storefront" size={50} color="#30a830" />
        </Animated.View>
        <View style={loaderStyles.shadow} />
      </View>
      <Text style={loaderStyles.loaderText}>Searching for Shops...</Text>
      <Text style={loaderStyles.loaderSubText}>Fetching routes and city data</Text>
    </View>
  );
};

const billTotal = (b) => Number(b?.after_vat_amount ?? b?.Net_Amount ?? b?.Gross_Amount ?? 0);
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
        String(r.description || "").toLowerCase().includes(q)
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
      setTimeout(() => setLoading(false), 800);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load(selectedRoute?.code || null);
    }, [selectedRoute?.code])
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
      if (due > 0.5) {
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

  const renderItem = useCallback(({ item, index }) => (
    <AnimatedShopCard
      item={item}
      index={index}
      onPress={() =>
        navigation.navigate("BillList", {
          shopCode: item.code,
          shopName: item.name,
          routeCode: item.route,
        })
      }
    />
  ), [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#30a830" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.routeBtn} onPress={() => setRouteModal(true)}>
              <MaterialCommunityIcons name="map-marker-radius" size={18} color="white" />
              <Text style={styles.routeBtnText}>{selectedRoute?.code ? selectedRoute.code : "Cities"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Shops ({shops.length})</Text>
          <Text style={styles.headerSub}>
            {selectedRoute ? `Route City: ${selectedRoute.code}` : "Showing All Available Cities"}
          </Text>
        </View>

        {loading ? (
          <ShopLoader />
        ) : (
          <FlatList
            data={shopsWithSummary}
            keyExtractor={(item, idx) => item.code?.toString() || idx.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
            getItemLayout={(data, index) => ({ length: 175, offset: 175 * index, index })}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="store-off-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No shops found</Text>
                <Text style={styles.emptySub}>Try selecting a different city route from the selector.</Text>
              </View>
            }
          />
        )}

        {/* Route Selection Modal */}
        <Modal visible={routeModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Route City</Text>
                <TouchableOpacity onPress={() => setRouteModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
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
                      ((!item.code && !selectedRoute) || item.code === selectedRoute?.code) && {
                        backgroundColor: "#f0fdf4",
                      },
                    ]}
                    onPress={() => {
                      setSelectedRoute(item.code ? item : null);
                      setRouteModal(false);
                      setRouteSearch("");
                    }}
                  >
                    <Text style={[styles.modalItemText, !item.code && { color: "#30a830" }]}>
                      {item.code || "SHOW ALL CITIES"}
                    </Text>
                    {((!item.code && !selectedRoute) || item.code === selectedRoute?.code) && (
                       <MaterialCommunityIcons name="check" size={20} color="#30a830" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const loaderStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },
  animationBox: { alignItems: "center", justifyContent: "center", height: 120 },
  shopIcon: { marginTop: 5 },
  shadow: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 10,
    marginTop: 4,
  },
  loaderText: { fontSize: 18, fontWeight: "800", color: "#1e293b", marginTop: 20 },
  loaderSubText: { fontSize: 13, color: "#64748b", marginTop: 5 },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000000" },
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  header: {
    backgroundColor: "#30a830",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 35,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
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
  listContent: { padding: 15, paddingBottom: 40 },
  shopCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 18,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    height: 160, 
    justifyContent: 'center'
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
    borderColor: "#f1f5f9",
  },
  summaryLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  summaryValue: { color: "#1e293b", fontWeight: "800", marginTop: 4, fontSize: 14 },
  emptyBox: { alignItems: "center", marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontWeight: "800", fontSize: 18, marginTop: 15, color: "#1e293b" },
  emptySub: { color: "#64748b", marginTop: 8, textAlign: "center", lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
    maxHeight: "85%",
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b" },
  modalInput: {
    backgroundColor: "#f1f5f9",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: "#1e293b",
  },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 15, borderRadius: 12, marginBottom: 5 },
  modalItemText: { fontWeight: "700", fontSize: 15, color: "#334155" },
});