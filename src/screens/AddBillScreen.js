import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

import { fetchShops } from "../services/shopApi";
import { addBill } from "../services/billApi";

export default function AddBillScreen({ navigation }) {
  // ✅ Shops from DB
  const [shops, setShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(true);

  const [selectedShop, setSelectedShop] = useState(null);
  const [showShopModal, setShowShopModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [itemsList, setItemsList] = useState([{ id: Date.now(), name: "", price: "" }]);

  const [isTaxEnabled, setIsTaxEnabled] = useState(false);
  const [additionalTax, setAdditionalTax] = useState("0");

  // ✅ Status select
  const [status, setStatus] = useState("Pending");

  // ✅ Save loading
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      setLoadingShops(true);
      const data = await fetchShops();
      setShops(data || []);
    } catch (e) {
      console.log("LOAD SHOPS ERROR:", e?.response?.data || e.message);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load shops",
        position: "top",
      });
    } finally {
      setLoadingShops(false);
    }
  };

  const filteredShops = useMemo(() => {
    return shops.filter((shop) =>
      (shop?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shops, searchQuery]);

  // Math Logic (unchanged)
  const baseAmount = itemsList.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  const vat = baseAmount * 0.15;
  const extraTax = isTaxEnabled ? parseFloat(additionalTax || 0) : 0;
  const total = (baseAmount + vat + extraTax).toFixed(2);

  const addNewItem = () =>
    setItemsList([...itemsList, { id: Date.now(), name: "", price: "" }]);

  const deleteItem = (id) => {
    if (itemsList.length > 1) {
      setItemsList(itemsList.filter((item) => item.id !== id));
    } else {
      Alert.alert("Notice", "A bill must have at least one item.");
    }
  };

  const updateItem = (id, field, value) => {
    setItemsList(itemsList.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  // ✅ SAVE BILL TO DB
  const saveBill = async () => {
    if (!selectedShop) {
      Toast.show({
        type: "error",
        text1: "Select Shop",
        text2: "Please select a shop to continue",
        position: "top",
      });
      return;
    }

    // Validate items
    const cleanedItems = itemsList
      .map((i) => ({
        item_name: (i.name || "").trim(),
        price: Number(i.price),
      }))
      .filter((i) => i.item_name.length > 0 && !Number.isNaN(i.price));

    if (cleanedItems.length < 1) {
      Toast.show({
        type: "error",
        text1: "Invalid Items",
        text2: "Add at least one item with a price",
        position: "top",
      });
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      // bill_date format: YYYY-MM-DD
      const billDate = new Date().toISOString().split("T")[0];

      const payload = {
        shop_id: selectedShop.id,
        bill_date: billDate,
        additional_tax: isTaxEnabled ? Number(additionalTax || 0) : 0,
        items: cleanedItems,
        status, // ✅ Pending / Paid / Partial
      };

      const res = await addBill(payload);

      Toast.show({
        type: "success",
        text1: "Bill Created ✅",
        text2: res?.message || "Saved to database",
        position: "top",
      });

      navigation.navigate("ShopList");
    } catch (e) {
      console.log("ADD BILL ERROR STATUS:", e?.response?.status);
      console.log("ADD BILL ERROR DATA:", e?.response?.data);
      console.log("ADD BILL ERROR MSG:", e?.message);

      let msg = "Bill creation failed";
      if (e?.response?.status === 422) msg = "Validation failed (check inputs)";
      if (e?.response?.data?.message) msg = e.response.data.message;
      if (e?.response?.data?.error) msg = e.response.data.error;

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
        <Text style={styles.label}>Shop Name</Text>

        <TouchableOpacity style={styles.dropdown} onPress={() => setShowShopModal(true)}>
          <Text style={selectedShop ? styles.selectedText : styles.placeholderText}>
            {selectedShop ? selectedShop.name : "Select Shop"}
          </Text>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748b" />
        </TouchableOpacity>

        {/* ✅ STATUS SELECT (NEW) */}
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

        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Items & Prices</Text>
          <TouchableOpacity onPress={addNewItem} style={styles.addBtn}>
            <MaterialCommunityIcons name="plus-circle" size={20} color="#10b981" />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {itemsList.map((item) => (
          <View key={item.id} style={styles.itemRowContainer}>
            <View style={styles.itemRow}>
              <TextInput
                style={[styles.input, { flex: 2 }]}
                placeholder="Item Name"
                value={item.name}
                onChangeText={(t) => updateItem(item.id, "name", t)}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 10 }]}
                placeholder="Price"
                keyboardType="numeric"
                value={String(item.price)}
                onChangeText={(t) => updateItem(item.id, "price", t)}
              />

              <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.summaryBox}>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcValue}>Rs. {baseAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>VAT (15%)</Text>
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

        {/* ✅ SAVE BUTTON WITH LOADING */}
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

      {/* SHOP MODAL */}
      <Modal visible={showShopModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search shops..."
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
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.shopItem}
                    onPress={() => {
                      setSelectedShop(item);
                      setShowShopModal(false);
                    }}
                  >
                    <Text>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity style={{ padding: 15, alignItems: "center" }} onPress={() => setShowShopModal(false)}>
              <Text style={{ color: "#ef4444" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: "#2563eb", padding: 25, paddingTop: 50, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 15 },
  form: { padding: 20 },

  label: { fontSize: 13, fontWeight: "bold", color: "#64748b", marginBottom: 5 },

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

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  addBtn: { flexDirection: "row", alignItems: "center" },
  addBtnText: { color: "#10b981", fontWeight: "bold", marginLeft: 5 },

  itemRowContainer: { marginBottom: 10 },
  itemRow: { flexDirection: "row", alignItems: "center" },

  input: { backgroundColor: "white", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 10 },
  deleteBtn: { marginLeft: 10, padding: 5 },

  summaryBox: { backgroundColor: "#f1f5f9", padding: 15, borderRadius: 15, marginTop: 10 },
  calcRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  calcLabel: { color: "#64748b" },
  calcValue: { fontWeight: "bold" },

  taxToggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },

  totalCard: { backgroundColor: "#2563eb", padding: 20, borderRadius: 20, alignItems: "center", marginVertical: 20 },
  totalLabel: { color: "white", opacity: 0.8 },
  totalValue: { color: "white", fontSize: 28, fontWeight: "bold" },

  submitBtn: { backgroundColor: "#10b981", padding: 18, borderRadius: 15, alignItems: "center" },
  submitText: { color: "white", fontWeight: "bold", fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "white", borderRadius: 20, padding: 20, maxHeight: "70%" },
  searchBar: { backgroundColor: "#f1f5f9", borderRadius: 10, padding: 12, marginBottom: 15 },
  shopItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },

  // ✅ Added styles for status (doesn't change your existing UI)
  statusRow: { flexDirection: "row", justifyContent: "center", marginBottom: 10 },
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
});