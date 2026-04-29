import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getBills } from "../services/billApi";
import {
  fetchRoutes,
  fetchShopsByRoute,
  recordShopVisit,
  updateShop,
} from "../services/shopApi";

// --- ANIMATED SHOP CARD COMPONENT ---
const AnimatedShopCard = ({ item, index, onPress, type }) => {
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

  const getStatusColor = () => {
    if (type === "completed") return "#30a830";
    if (type === "extra") return "#6366f1";
    if (type === "remaining") return "#f59e0b";
    return "#30a830";
  };

  return (
    <Animated.View
      style={{
        opacity: animatedValue,
        transform: [
          {
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [25, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity style={styles.shopCard} onPress={() => onPress(item)}>
        <View style={styles.shopTop}>
          <View
            style={[
              styles.iconBox,
              (type === "completed" || type === "extra") && {
                backgroundColor: "#f0fdf4",
              },
            ]}
          >
            <MaterialCommunityIcons
              name={
                type === "completed"
                  ? "check-decagram"
                  : type === "extra"
                    ? "star-plus"
                    : "storefront-outline"
              }
              size={24}
              color={getStatusColor()}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.shopName}>{item.name || "—"}</Text>
            <Text style={styles.shopMeta}>ID: {item.code || "—"}</Text>
          </View>
          <TouchableOpacity onPress={() => onPress(item, "edit")}>
            <MaterialCommunityIcons
              name="pencil-outline"
              size={20}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={styles.summaryValue}>
              Rs. {Number(item.dueTotal || 0).toLocaleString()}
            </Text>
          </View>
          <View
            style={[
              styles.summaryChip,
              {
                borderLeftWidth: 3,
                borderLeftColor: item.pendingCount > 0 ? "#dc2626" : "#30a830",
              },
            ]}
          >
            <Text style={styles.summaryLabel}>Bills</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: item.pendingCount > 0 ? "#dc2626" : "#30a830" },
              ]}
            >
              {item.pendingCount || 0} Pending
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- BOUNCING LOADER ---
const ShopLoader = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
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
      ]),
    ).start();
  }, []);

  return (
    <View style={loaderStyles.container}>
      <View style={loaderStyles.animationBox}>
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
          <MaterialCommunityIcons name="map-marker" size={30} color="#30a830" />
        </Animated.View>
        <Animated.View
          style={[loaderStyles.shopIcon, { transform: [{ scale: scaleAnim }] }]}
        >
          <MaterialCommunityIcons name="storefront" size={50} color="#30a830" />
        </Animated.View>
        <View style={loaderStyles.shadow} />
      </View>
      <Text style={loaderStyles.loaderText}>Searching for Shops...</Text>
      <Text style={loaderStyles.loaderSubText}>
        Fetching routes and city data
      </Text>
    </View>
  );
};

// --- COLLAPSIBLE SECTION HEADER ---
const Section = ({ title, count, icon, color, isOpen, onToggle }) => (
  <TouchableOpacity
    style={styles.sectionHeader}
    onPress={onToggle}
    activeOpacity={0.7}
  >
    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={[styles.sectionTitle, { color }]}>
        {title} ({count})
      </Text>
    </View>
    <MaterialCommunityIcons
      name={isOpen ? "chevron-down" : "chevron-right"}
      size={24}
      color={color}
    />
  </TouchableOpacity>
);

export default function ShopListScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [routes, setRoutes] = useState([]);
  const [routeModal, setRouteModal] = useState(false);
  const [routeSearch, setRouteSearch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [activeRouteCode, setActiveRouteCode] = useState(null);
  const [shops, setShops] = useState([]);
  const [bills, setBills] = useState([]);
  const [actionModal, setActionModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({
    First_name: "",
    Address_1: "",
    Contact_1: "",
    latitude: "",
    longitude: "",
  });

  const [showRemaining, setShowRemaining] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [shopSearch, setShopSearch] = useState("");

  const filteredRoutes = useMemo(() => {
    const q = routeSearch.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        String(r.code || "")
          .toLowerCase()
          .includes(q) ||
        String(r.description || "")
          .toLowerCase()
          .includes(q),
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
      setActiveRouteCode(routeCode);
    } catch (e) {
      console.log("Load Error:", e);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load(selectedRoute?.code || null);
    }, [selectedRoute?.code]),
  );

  useEffect(() => {
    if (selectedShop) {
      setForm({
        First_name: selectedShop.name || "",
        Address_1: selectedShop.address || "",
        Contact_1: selectedShop.phone || "",
        latitude: selectedShop.latitude || "",
        longitude: selectedShop.longitude || "",
      });
    }
  }, [selectedShop]);

  const shopsWithSummary = useMemo(() => {
    const byCustomer = new Map();

    for (const b of bills || []) {
      const code = b?.Customer_code || b?.customer_code || b?.Customer_NIC;

      if (!code) continue;

      const due = Math.max(
        Number(b?.after_vat_amount ?? b?.Net_Amount ?? 0) -
          Number(b?.Paid_Amount ?? b?.paid_amount ?? 0),
        0,
      );

      if (!byCustomer.has(code))
        byCustomer.set(code, { pendingCount: 0, due: 0 });

      if (due > 0.5) {
        const cur = byCustomer.get(code);
        cur.pendingCount += 1;
        cur.due += due;
      }
    }

    // Filter and Map the shops
    return (shops || [])
      .filter((s) => {
        const query = shopSearch.toLowerCase();
        return (
          s.name?.toLowerCase().includes(query) ||
          s.code?.toLowerCase().includes(query)
        );
      })
      .map((s) => ({
        ...s,
        pendingCount: byCustomer.get(s.code)?.pendingCount || 0,
        dueTotal: byCustomer.get(s.code)?.due || 0,
        isVisited: Number(s.visit_count) > 0,
        isAssigned: s.is_assigned == 1,
      }));
  }, [shops, bills, shopSearch]);

  const visitData = useMemo(() => {
    const remaining = shopsWithSummary.filter(
      (s) => !s.isVisited && s.isAssigned,
    );
    const completed = shopsWithSummary.filter(
      (s) => s.isVisited && s.isAssigned,
    );
    const extra = shopsWithSummary.filter((s) => s.isVisited && !s.isAssigned);
    return {
      remaining,
      completed,
      extra,
      totalAssigned: remaining.length + completed.length,
    };
  }, [shopsWithSummary]);

  const handleVisit = async () => {
    setIsSubmitting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted")
        return Alert.alert("Error", "Location permission is required.");

      const loc = await Location.getCurrentPositionAsync({});
      const res = await recordShopVisit({
        customer_id: selectedShop.id,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        remarks: "Logged via Mobile App",
      });

      Alert.alert(res.is_verified ? "Success" : "Out of Range", res.message);
      setActionModal(false);
      load(selectedRoute?.code || null);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Check-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setIsSubmitting(true);
      await updateShop(selectedShop.id, form);
      Alert.alert("Success", "Shop updated!");
      setEditModal(false);
      load(selectedRoute?.code || null);
    } catch (e) {
      Alert.alert("Error", "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <React.Fragment>
      <SafeAreaView
        style={{ flex: 0, backgroundColor: "#30a830" }}
        edges={["top"]}
      />
      <StatusBar barStyle="light-content" backgroundColor="#30a830" />

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={32}
                color="white"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.routeBtn}
              onPress={() => setRouteModal(true)}
            >
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={18}
                color="white"
              />
              <Text style={styles.routeBtnText}>
                {selectedRoute?.code || "Cities"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>
            {activeTab === "list"
              ? `Shop List`
              : `My Visits (${visitData.completed.length}/${visitData.totalAssigned})`}
          </Text>
          <Text style={styles.headerSub}>
            {selectedRoute?.code
              ? `Route: ${selectedRoute.code}`
              : "All Available Routes"}
          </Text>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "list" && styles.tabActive]}
              onPress={() => setActiveTab("list")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "list" && styles.tabTextActive,
                ]}
              >
                Shop List
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "visits" && styles.tabActive]}
              onPress={() => setActiveTab("visits")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "visits" && styles.tabTextActive,
                ]}
              >
                My Visits
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          {loading ? (
            <ShopLoader />
          ) : activeTab === "list" ? (
            <>
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <MaterialCommunityIcons
                    name="magnify"
                    size={20}
                    color="#94a3b8"
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search shop name or ID..."
                    placeholderTextColor="#94a3b8"
                    value={shopSearch}
                    onChangeText={setShopSearch}
                  />
                  {shopSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setShopSearch("")}>
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={18}
                        color="#94a3b8"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <FlatList
                data={shopsWithSummary}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index }) => (
                  <AnimatedShopCard
                    item={item}
                    index={index}
                    onPress={(shop, type) => {
                      setSelectedShop(shop);
                      if (type === "edit") {
                        setEditModal(true);
                      } else {
                        setActionModal(true);
                      }
                    }}
                  />
                )}
              />
            </>
          ) : (
            <ScrollView contentContainerStyle={styles.listContent}>
              <Section
                title="Remaining to Visit"
                count={visitData.remaining.length}
                icon="clock-outline"
                color="#f59e0b"
                isOpen={showRemaining}
                onToggle={() => setShowRemaining(!showRemaining)}
              />
              {showRemaining &&
                visitData.remaining.map((item, i) => (
                  <AnimatedShopCard
                    key={item.id}
                    item={item}
                    index={i}
                    type="remaining"
                    onPress={(shop, type) => {
                      setSelectedShop(shop);
                      if (type === "edit") {
                        setEditModal(true);
                      } else {
                        setActionModal(true);
                      }
                    }}
                  />
                ))}

              <Section
                title="Completed Visits"
                count={visitData.completed.length}
                icon="check-circle"
                color="#30a830"
                isOpen={showCompleted}
                onToggle={() => setShowCompleted(!showCompleted)}
              />
              {showCompleted &&
                visitData.completed.map((item, i) => (
                  <AnimatedShopCard
                    key={item.id}
                    item={item}
                    index={i}
                    type="completed"
                    onPress={(shop, type) => {
                      setSelectedShop(shop);
                      if (type === "edit") {
                        setEditModal(true);
                      } else {
                        setActionModal(true);
                      }
                    }}
                  />
                ))}

              <Section
                title="Extra Shop Visits"
                count={visitData.extra.length}
                icon="star-plus"
                color="#6366f1"
                isOpen={showExtra}
                onToggle={() => setShowExtra(!showExtra)}
              />
              {showExtra &&
                visitData.extra.map((item, i) => (
                  <AnimatedShopCard
                    key={item.id}
                    item={item}
                    index={i}
                    type="extra"
                    onPress={(shop, type) => {
                      setSelectedShop(shop);
                      if (type === "edit") {
                        setEditModal(true);
                      } else {
                        setActionModal(true);
                      }
                    }}
                  />
                ))}
            </ScrollView>
          )}

          {/* --- FAB (Ensured Visibility) --- */}
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("AddShop")}
          >
            <MaterialCommunityIcons name="plus" size={32} color="white" />
          </TouchableOpacity>
        </View>

        {/* MODALS */}
        <Modal visible={actionModal} transparent animationType="slide">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setActionModal(false)}
          >
            <View style={styles.actionCard}>
              <View style={styles.indicator} />
              <Text style={styles.actionTitle}>{selectedShop?.name}</Text>

              {/* 1. Record Physical Visit */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleVisit}
                disabled={isSubmitting}
              >
                <View
                  style={[styles.actionIcon, { backgroundColor: "#f0fdf4" }]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#30a830" />
                  ) : (
                    <MaterialCommunityIcons
                      name="map-marker-check"
                      size={26}
                      color="#30a830"
                    />
                  )}
                </View>
                <View>
                  <Text style={styles.actionBtnText}>
                    Record Physical Visit
                  </Text>
                  <Text style={styles.actionBtnSub}>
                    Check-in at this location
                  </Text>
                </View>
              </TouchableOpacity>

              {/* 2. View & Collect Bills (THE FIX) */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setActionModal(false);
                  navigation.navigate("BillList", {
                    shopCode: selectedShop?.code,
                    shopName: selectedShop?.name,
                  });
                }}
              >
                <View
                  style={[styles.actionIcon, { backgroundColor: "#fff7ed" }]}
                >
                  <MaterialCommunityIcons
                    name="file-document-outline"
                    size={26}
                    color="#f59e0b"
                  />
                </View>
                <View>
                  <Text style={styles.actionBtnText}>View & Collect Bills</Text>
                  <Text style={styles.actionBtnSub}>
                    Check outstanding invoices
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={routeModal} transparent animationType="fade">
          <View style={styles.modalOverlayAlt}>
            <View style={styles.routeModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Route / City</Text>
                <TouchableOpacity onPress={() => setRouteModal(false)}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="Search city..."
                placeholderTextColor="#94a3b8"
                value={routeSearch}
                onChangeText={setRouteSearch}
              />
              <FlatList
                data={[
                  { code: null, description: "All Cities" },
                  ...filteredRoutes,
                ]}
                keyExtractor={(item, idx) => item.code || idx.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      ((!item.code && !selectedRoute) ||
                        item.code === selectedRoute?.code) && {
                        backgroundColor: "#f0fdf4",
                      },
                    ]}
                    onPress={() => {
                      setSelectedRoute(item.code ? item : null);
                      setRouteModal(false);
                      setRouteSearch("");
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        !item.code && { color: "#30a830" },
                      ]}
                    >
                      {item.code || "SHOW ALL CITIES"}
                    </Text>
                    {((!item.code && !selectedRoute) ||
                      item.code === selectedRoute?.code) && (
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color="#30a830"
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        <Modal visible={editModal} transparent animationType="slide">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setEditModal(false)}
          >
            <View style={styles.editCard}>
              <View style={styles.editHeader}>
                <View>
                  <Text style={styles.editTitle}>Edit Shop</Text>
                  <Text style={styles.editSubtitle}>
                    Update shop information
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setEditModal(false)}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={36}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Shop Name</Text>
                  <TextInput
                    style={styles.inputModern}
                    value={form.First_name}
                    onChangeText={(t) => setForm({ ...form, First_name: t })}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Address</Text>
                  <TextInput
                    style={styles.inputModern}
                    value={form.Address_1}
                    onChangeText={(t) => setForm({ ...form, Address_1: t })}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Contact Number</Text>
                  <TextInput
                    style={styles.inputModern}
                    value={form.Contact_1}
                    keyboardType="phone-pad"
                    onChangeText={(t) => setForm({ ...form, Contact_1: t })}
                  />
                </View>

                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={styles.saveBtnModern}
                    onPress={handleUpdate}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelBtnModern}
                    onPress={() => setEditModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
      <SafeAreaView
        style={{ flex: 0, backgroundColor: "#000" }}
        edges={["bottom"]}
      />
    </React.Fragment>
  );
}

const loaderStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  animationBox: { alignItems: "center", justifyContent: "center", height: 120 },
  shopIcon: { marginTop: 5 },
  shadow: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 10,
    marginTop: 4,
  },
  loaderText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 20,
  },
  loaderSubText: { fontSize: 13, color: "#64748b", marginTop: 5 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  header: {
    backgroundColor: "#30a830",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
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
  routeBtnText: {
    color: "white",
    fontWeight: "700",
    marginLeft: 6,
    fontSize: 12,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.1)",
    padding: 5,
    borderRadius: 16,
    marginTop: 20,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 12 },
  tabActive: { backgroundColor: "white" },
  tabText: { color: "white", fontWeight: "700", fontSize: 14 },
  tabTextActive: { color: "#30a830" },
  listContent: { padding: 20, paddingBottom: 100 },
  shopCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  shopTop: { flexDirection: "row", alignItems: "center" },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  shopName: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  shopMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryChip: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "white",
    borderRadius: 16,
    elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", marginLeft: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalOverlayAlt: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 20,
  },
  actionCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
  },
  indicator: {
    width: 40,
    height: 5,
    backgroundColor: "#e2e8f0",
    alignSelf: "center",
    borderRadius: 10,
    marginBottom: 20,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 20,
    textAlign: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    marginBottom: 12,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  actionBtnText: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  actionBtnSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#30a830",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  routeModalContent: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  modalInput: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    color: "#1e293b",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalItemText: { fontSize: 15, fontWeight: "600", color: "#475569" },
  editCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
    height: "90%",
  },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  editTitle: { fontSize: 24, fontWeight: "800", color: "#1e293b" },
  editSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputModern: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  buttonGroup: { marginTop: 10, gap: 10 },
  saveBtnModern: {
    backgroundColor: "#30a830",
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  saveBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  cancelBtnModern: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  cancelBtnText: { color: "#64748b", fontSize: 15, fontWeight: "700" },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },
});
