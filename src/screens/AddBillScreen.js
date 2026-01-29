// src/screens/AddBillScreen.js
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { addBill } from "../services/billApi";
import { fetchItems } from "../services/itemApi";
import { fetchShopLocations, fetchShops } from "../services/shopApi";

export default function AddBillScreen({ navigation }) {
  const [shops, setShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(true);

  // ✅ Routes (locations)
  const [routes, setRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeSearch, setRouteSearch] = useState("");

  const [selectedShop, setSelectedShop] = useState(null);
  const [showShopModal, setShowShopModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ Items master
  const [itemsMaster, setItemsMaster] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [activeRowId, setActiveRowId] = useState(null);

  /**
   * ✅ itemsList format
   * item_id, item_name, unit_price, stock_qty, qty, free_qty, discount_percent
   */
  const [itemsList, setItemsList] = useState([
    {
      id: Date.now(),
      item_id: null,
      item_name: "",
      unit_price: 0,
      stock_qty: 0,
      qty: "1",
      free_qty: "0",
      discount_percent: "0",
    },
  ]);

  // ✅ NEW: Bill-level discount (optional)
  const [isBillDiscountEnabled, setIsBillDiscountEnabled] = useState(false);
  const [billDiscountPercent, setBillDiscountPercent] = useState("0");

  // ✅ VAT toggle
  const [isVatEnabled, setIsVatEnabled] = useState(true);

  const [isTaxEnabled, setIsTaxEnabled] = useState(false);
  const [additionalTax, setAdditionalTax] = useState("0");

  const [status, setStatus] = useState("Pending");
  const [saving, setSaving] = useState(false);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [pendingBillId, setPendingBillId] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoadingShops(true);
      setLoadingRoutes(true);
      setLoadingItems(true);

      const [shopData, locations, itemsData] = await Promise.all([
        fetchShops(),
        fetchShopLocations(),
        fetchItems(),
      ]);

      setShops(shopData || []);

      const cleanedRoutes = (locations || [])
        .map((x) => (x || "").trim())
        .filter((x) => x.length > 0);
      setRoutes(cleanedRoutes);

      setItemsMaster(itemsData || []);
    } catch (e) {
      console.log("❌ LOAD ALL ERROR:", e?.response?.data || e?.message);

      Toast.show({
        type: "error",
        text1: "Error",
        text2: e?.message || "Failed to load routes/shops/items",
        position: "top",
      });
    } finally {
      setLoadingShops(false);
      setLoadingRoutes(false);
      setLoadingItems(false);
    }
  };

  const filteredRoutes = useMemo(() => {
    const q = routeSearch.toLowerCase();
    return routes.filter((r) => r.toLowerCase().includes(q));
  }, [routes, routeSearch]);

  const filteredShops = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return shops.filter((shop) => {
      const nameOk = (shop?.name || "").toLowerCase().includes(q);
      const routeOk =
        !selectedRoute ||
        (shop?.location || "").trim().toLowerCase() ===
          selectedRoute.trim().toLowerCase();
      return nameOk && routeOk;
    });
  }, [shops, searchQuery, selectedRoute]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.toLowerCase();
    return itemsMaster.filter((it) =>
      (it?.name || "").toLowerCase().includes(q),
    );
  }, [itemsMaster, itemSearch]);

  const addNewItem = () =>
    setItemsList((prev) => [
      ...prev,
      {
        id: Date.now(),
        item_id: null,
        item_name: "",
        unit_price: 0,
        stock_qty: 0,
        qty: "1",
        free_qty: "0",
        discount_percent: "0",
      },
    ]);

  const deleteItem = (id) => {
    if (itemsList.length > 1) {
      setItemsList(itemsList.filter((item) => item.id !== id));
    } else {
      Alert.alert("Notice", "A bill must have at least one item.");
    }
  };

  const updateRow = (id, patch) => {
    setItemsList((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const toNum = (v) => {
    const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const clampPercent = (v) => Math.min(Math.max(toNum(v), 0), 100);

  const lineTotal = (row) => {
    const qty = Math.max(parseInt(row.qty || "0", 10) || 0, 0);
    const unit = toNum(row.unit_price);
    const gross = qty * unit;
    const disc = clampPercent(row.discount_percent);
    const discountAmount = gross * (disc / 100);
    return Math.max(gross - discountAmount, 0);
  };

  // ✅ subtotal is sum of line totals AFTER item discounts
  const subtotal = useMemo(() => {
    return itemsList.reduce((sum, row) => sum + lineTotal(row), 0);
  }, [itemsList]);

  // ✅ NEW bill discount amount (applied after item discounts)
  const billDiscPercent = isBillDiscountEnabled ? clampPercent(billDiscountPercent) : 0;
  const billDiscAmount = useMemo(() => subtotal * (billDiscPercent / 100), [subtotal, billDiscPercent]);
  const discountedSubtotal = useMemo(() => Math.max(subtotal - billDiscAmount, 0), [subtotal, billDiscAmount]);

  // ✅ VAT calculated on discounted subtotal (same as backend)
  const vat = isVatEnabled ? discountedSubtotal * 0.18 : 0;

  const extraTax = isTaxEnabled ? toNum(additionalTax) : 0;

  const total = (discountedSubtotal + vat + extraTax).toFixed(2);

  const validateBeforeSave = () => {
    if (!selectedRoute) return "Please select a route/location first";
    if (!selectedShop) return "Please select a shop";

    for (const row of itemsList) {
      if (!row.item_id) return "Please select an item for each row";

      const qty = parseInt(row.qty || "0", 10) || 0;
      const free = parseInt(row.free_qty || "0", 10) || 0;

      if (qty <= 0) return "Qty must be at least 1";

      // ✅ stock check on frontend (backend will also check)
      const totalOut = qty + free;
      if (totalOut > (row.stock_qty || 0)) {
        return `Not enough stock for ${row.item_name}. Available: ${row.stock_qty}`;
      }

      const disc = toNum(row.discount_percent);
      if (disc < 0 || disc > 100) return "Item discount must be between 0 and 100";
    }

    if (isBillDiscountEnabled) {
      const d = toNum(billDiscountPercent);
      if (d < 0 || d > 100) return "Bill discount must be between 0 and 100";
    }

    return null;
  };

  const saveBill = async () => {
    const err = validateBeforeSave();
    if (err) {
      Toast.show({
        type: "error",
        text1: "Validation",
        text2: err,
        position: "top",
      });
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      const billDate = new Date().toISOString().split("T")[0];

      const payload = {
        shop_id: selectedShop.id,
        bill_date: billDate,
        vat_enabled: isVatEnabled,
        additional_tax: isTaxEnabled ? toNum(additionalTax) : 0,

        // ✅ NEW: bill-level discount (optional)
        bill_discount_percent: isBillDiscountEnabled ? clampPercent(billDiscountPercent) : 0,

        status,
        items: itemsList.map((row) => ({
          item_id: row.item_id,
          qty: parseInt(row.qty || "0", 10) || 0,
          free_qty: parseInt(row.free_qty || "0", 10) || 0,
          discount_percent: clampPercent(row.discount_percent),
        })),
      };

      const res = await addBill(payload);

      Toast.show({
        type: "success",
        text1: "Bill Created ✅",
        text2: res?.message || "Saved to database",
        position: "top",
      });

      const newBillId = res?.bill?.id;
      setPendingBillId(newBillId);
      setShowPaymentPrompt(true);
    } catch (e) {
      console.log("ADD BILL ERROR:", e?.response?.data || e.message);

      let msg = "Bill creation failed";
      if (e?.response?.data?.message) msg = e.response.data.message;
      if (e?.response?.status === 422 && !msg) msg = "Validation failed";

      Toast.show({
        type: "error",
        text1: "Error",
        text2: msg,
        position: "top",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Bill</Text>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ROUTE */}
        <Text style={styles.label}>Route (Location)</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowRouteModal(true)}>
          <Text style={selectedRoute ? styles.selectedText : styles.placeholderText}>
            {selectedRoute ? selectedRoute : "Select Route"}
          </Text>
          <MaterialCommunityIcons name="map-marker" size={20} color="#64748b" />
        </TouchableOpacity>

        {/* SHOP */}
        <Text style={styles.label}>Shop Name</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowShopModal(true)}>
          <Text style={selectedShop ? styles.selectedText : styles.placeholderText}>
            {selectedShop ? selectedShop.name : "Select Shop"}
          </Text>
          <MaterialCommunityIcons name="store" size={20} color="#64748b" />
        </TouchableOpacity>

        {/* STATUS */}
        <Text style={styles.label}>Bill Status</Text>
        <View style={styles.statusRow}>
          {["Pending", "Paid", "Partial"].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusChip, status === s && styles.statusChipActive]}
              onPress={() => setStatus(s)}
              activeOpacity={0.85}
            >
              <Text style={[styles.statusText, status === s && styles.statusTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ITEMS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Items</Text>
          <TouchableOpacity onPress={addNewItem} style={styles.addBtn}>
            <MaterialCommunityIcons name="plus-circle" size={20} color="#10b981" />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {itemsList.map((row) => (
          <View key={row.id} style={styles.itemCard}>
            <View style={styles.itemTopRow}>
              <TouchableOpacity
                style={[styles.input, { flex: 1 }]}
                onPress={() => {
                  setActiveRowId(row.id);
                  setItemSearch("");
                  setShowItemModal(true);
                }}
                activeOpacity={0.85}
              >
                <Text style={row.item_id ? styles.selectedText : styles.placeholderText}>
                  {row.item_id ? row.item_name : "Select Item"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => deleteItem(row.id)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* STOCK + UNIT PRICE */}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                Stock: <Text style={{ fontWeight: "800" }}>{row.stock_qty ?? 0}</Text>
              </Text>
              <Text style={styles.metaText}>
                Unit Price:{" "}
                <Text style={{ fontWeight: "800" }}>Rs.{toNum(row.unit_price).toFixed(2)}</Text>
              </Text>
            </View>

            {/* INPUTS: QTY / FREE / DISCOUNT */}
            <View style={styles.gridRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Qty</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(row.qty)}
                  onChangeText={(t) => updateRow(row.id, { qty: t.replace(/[^0-9]/g, "") })}
                  placeholder="1"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Free Qty</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(row.free_qty)}
                  onChangeText={(t) => updateRow(row.id, { free_qty: t.replace(/[^0-9]/g, "") })}
                  placeholder="0"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Discount %</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(row.discount_percent)}
                  onChangeText={(t) =>
                    updateRow(row.id, { discount_percent: t.replace(/[^0-9.]/g, "") })
                  }
                  placeholder="0"
                />
              </View>
            </View>

            <View style={styles.lineTotalRow}>
              <Text style={styles.calcLabel}>Line Total</Text>
              <Text style={styles.calcValue}>Rs. {lineTotal(row).toFixed(2)}</Text>
            </View>
          </View>
        ))}

        {/* SUMMARY */}
        <View style={styles.summaryBox}>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcValue}>Rs. {subtotal.toFixed(2)}</Text>
          </View>

          {/* ✅ NEW: Bill-level Discount (optional) */}
          <View style={styles.taxToggleRow}>
            <Text style={styles.label}>Bill Discount?</Text>
            <Switch
              value={isBillDiscountEnabled}
              onValueChange={(v) => {
                setIsBillDiscountEnabled(v);
                if (!v) setBillDiscountPercent("0");
              }}
              trackColor={{ true: "#2563eb" }}
            />
          </View>

          {isBillDiscountEnabled && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.inputLabel}>Bill Discount %</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={billDiscountPercent}
                onChangeText={(t) => setBillDiscountPercent(t.replace(/[^0-9.]/g, ""))}
              />
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Bill Discount Amount</Text>
                <Text style={styles.calcValue}>- Rs. {billDiscAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Subtotal After Discount</Text>
                <Text style={styles.calcValue}>Rs. {discountedSubtotal.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <View style={styles.taxToggleRow}>
            <Text style={styles.label}>Apply VAT (18%)?</Text>
            <Switch value={isVatEnabled} onValueChange={setIsVatEnabled} trackColor={{ true: "#2563eb" }} />
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>VAT (18%)</Text>
            <Text style={styles.calcValue}>Rs. {vat.toFixed(2)}</Text>
          </View>

          <View style={styles.taxToggleRow}>
            <Text style={styles.label}>Extra Tax?</Text>
            <Switch value={isTaxEnabled} onValueChange={setIsTaxEnabled} trackColor={{ true: "#2563eb" }} />
          </View>

          {isTaxEnabled && (
            <TextInput
              style={styles.input}
              placeholder="Tax Amount"
              keyboardType="numeric"
              value={additionalTax}
              onChangeText={setAdditionalTax}
            />
          )}
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Grand Total</Text>
          <Text style={styles.totalValue}>Rs. {total}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!selectedShop || saving) && { backgroundColor: "#cbd5e1" },
          ]}
          disabled={!selectedShop || saving}
          onPress={saveBill}
          activeOpacity={0.85}
        >
          {saving ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator size="small" color="white" />
              <Text style={[styles.submitText, { marginLeft: 10 }]}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.submitText}>Save & Create Bill</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ROUTE MODAL */}
      <Modal visible={showRouteModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search routes..."
              value={routeSearch}
              onChangeText={setRouteSearch}
            />

            {loadingRoutes ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : (
              <FlatList
                data={filteredRoutes}
                keyExtractor={(item, idx) => `${item}-${idx}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.shopItem}
                    onPress={() => {
                      setSelectedRoute(item);
                      setSelectedShop(null);
                      setSearchQuery("");
                      setShowRouteModal(false);
                    }}
                  >
                    <Text>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={{ padding: 15, alignItems: "center" }}
              onPress={() => setShowRouteModal(false)}
            >
              <Text style={{ color: "#ef4444" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SHOP MODAL */}
      <Modal visible={showShopModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchBar}
              placeholder={selectedRoute ? `Search shops in ${selectedRoute}...` : "Search shops..."}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {loadingShops ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : (
              <FlatList
                data={filteredShops}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={
                  <View style={{ padding: 18 }}>
                    <Text style={{ color: "#64748b" }}>
                      No shops found {selectedRoute ? `in ${selectedRoute}` : ""}.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.shopItem}
                    onPress={() => {
                      setSelectedShop(item);
                      setShowShopModal(false);
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>{item.name}</Text>
                    <Text style={{ color: "#94a3b8", marginTop: 2 }}>{item.location ?? "—"}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={{ padding: 15, alignItems: "center" }}
              onPress={() => setShowShopModal(false)}
            >
              <Text style={{ color: "#ef4444" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ITEM MODAL */}
      <Modal visible={showItemModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search items..."
              value={itemSearch}
              onChangeText={setItemSearch}
            />

            {loadingItems ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={
                  <View style={{ padding: 18 }}>
                    <Text style={{ color: "#64748b" }}>No items found.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.shopItem}
                    onPress={() => {
                      updateRow(activeRowId, {
                        item_id: item.id,
                        item_name: item.name,
                        unit_price: item.unit_price,
                        stock_qty: item.stock_qty,
                        qty: "1",
                        free_qty: "0",
                        discount_percent: "0",
                      });
                      setShowItemModal(false);
                    }}
                  >
                    <Text style={{ fontWeight: "800" }}>{item.name}</Text>
                    <Text style={{ color: "#94a3b8", marginTop: 2 }}>
                      Stock: {item.stock_qty} • Unit: Rs.{Number(item.unit_price).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={{ padding: 15, alignItems: "center" }}
              onPress={() => setShowItemModal(false)}
            >
              <Text style={{ color: "#ef4444" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PAYMENT CONFIRMATION MODAL */}
      <Modal visible={showPaymentPrompt} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <MaterialCommunityIcons name="file-document-check" size={36} color="white" />
            </View>
            <Text style={styles.confirmTitle}>Bill Saved Successfully!</Text>
            <Text style={styles.confirmMsg}>Do you want to pay the bill now?</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#94a3b8" }]}
                onPress={() => {
                  setShowPaymentPrompt(false);
                  navigation.navigate("Dashboard");
                }}
              >
                <Text style={styles.confirmBtnText}>No, Later</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#10b981" }]}
                onPress={() => {
                  setShowPaymentPrompt(false);
                  if (pendingBillId) {
                    navigation.replace("BillDetails", { billId: pendingBillId });
                  }
                }}
              >
                <Text style={styles.confirmBtnText}>Yes, Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#2563eb",
    padding: 25,
    paddingTop: 50,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 15,
  },
  form: { padding: 20 },

  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 5,
  },

  dropdown: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  selectedText: { color: "#1e293b", fontWeight: "500" },
  placeholderText: { color: "#94a3b8" },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 8,
  },
  addBtn: { flexDirection: "row", alignItems: "center" },
  addBtnText: { color: "#10b981", fontWeight: "bold", marginLeft: 5 },

  itemCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },

  itemTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 6,
  },
  metaText: { color: "#64748b", fontSize: 12 },

  gridRow: { flexDirection: "row", gap: 10, marginTop: 6 },

  inputLabel: { fontSize: 12, color: "#64748b", marginBottom: 6 },

  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
  },

  deleteBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#fff5f5",
    justifyContent: "center",
    alignItems: "center",
  },

  lineTotalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  summaryBox: {
    backgroundColor: "#f1f5f9",
    padding: 15,
    borderRadius: 15,
    marginTop: 10,
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  calcLabel: { color: "#64748b" },
  calcValue: { fontWeight: "bold" },

  taxToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  totalCard: {
    backgroundColor: "#2563eb",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginVertical: 20,
  },
  totalLabel: { color: "white", opacity: 0.8 },
  totalValue: { color: "white", fontSize: 28, fontWeight: "bold" },

  submitBtn: {
    backgroundColor: "#10b981",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  submitText: { color: "white", fontWeight: "bold", fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  searchBar: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  shopItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },

  statusRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 6,
    backgroundColor: "white",
  },
  statusChipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  statusText: { color: "#64748b", fontWeight: "500" },
  statusTextActive: { color: "white", fontWeight: "700" },

  confirmCard: {
    backgroundColor: "white",
    borderRadius: 22,
    padding: 25,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  confirmIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  confirmMsg: {
    textAlign: "center",
    color: "#475569",
    marginBottom: 20,
    lineHeight: 18,
  },
  buttonRow: { flexDirection: "row", gap: 12, width: "100%" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
});
