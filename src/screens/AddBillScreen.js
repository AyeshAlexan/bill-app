import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
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

import { addBill } from "../services/billApi";
import { fetchItems } from "../services/itemApi";
import { fetchRoutes, fetchShopsByRoute } from "../services/shopApi";
import { fetchSalesmen } from "../services/salesmanApi"; 

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export default function AddBillScreen({ navigation }) {
  // Routes & Shops
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeModal, setRouteModal] = useState(false);
  const [routeSearch, setRouteSearch] = useState("");

  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopModal, setShopModal] = useState(false);
  const [shopSearch, setShopSearch] = useState("");

  // Salesman State
  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [salesmanModal, setSalesmanModal] = useState(false);
  const [salesmanSearch, setSalesmanSearch] = useState("");

  // Items Master
  const [itemsMaster, setItemsMaster] = useState([]);
  const [itemModal, setItemModal] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [activeRowId, setActiveRowId] = useState(null);

  // Bill Status
  const [successModal, setSuccessModal] = useState(false);
  const [savedInvoiceNo, setSavedInvoiceNo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Bill rows
  const [rows, setRows] = useState([
    {
      id: Date.now(),
      item_code: "",
      item_desc: "",
      unit_price: "0",
      qty: "1",
      free_issues: "0",
      discount_percent: "0",
    },
  ]);

  // Invoice and Date
  const [invoiceNo, setInvoiceNo] = useState("INV-499");
  const [billDate, setBillDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Bill Options
  const [isBillDiscountEnabled, setIsBillDiscountEnabled] = useState(false);
  const [billDiscountPercent, setBillDiscountPercent] = useState("0");
  const [isVatEnabled, setIsVatEnabled] = useState(true);
  const [vatPercent, setVatPercent] = useState("18");
  const [isAdditionalEnabled, setIsAdditionalEnabled] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState("0");

  // Initial Data Fetch
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [rts, itms, sales, storedInv] = await Promise.all([
          fetchRoutes(),
          fetchItems(),
          fetchSalesmen(),
          AsyncStorage.getItem("invoiceCounter")
        ]);

        setRoutes(rts || []);
        setItemsMaster(itms || []);
        setSalesmen(sales || []);

        const count = storedInv ? parseInt(storedInv) : 499;
        setInvoiceNo(`INV-${count}`);
      } catch (e) {
        Alert.alert("Error", "Cannot load master data");
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch Shops when Route changes
  useEffect(() => {
    (async () => {
      if (!selectedRoute?.code) return;
      try {
        const sh = await fetchShopsByRoute(selectedRoute.code);
        setShops(sh || []);
        setSelectedShop(null);
      } catch (e) {
        console.log("shopsByRoute error:", e.message);
      }
    })();
  }, [selectedRoute?.code]);

  // Memoized Filters
  const filteredRoutes = useMemo(() => {
    const q = routeSearch.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(r => 
      String(r.code || "").toLowerCase().includes(q) || 
      String(r.description || "").toLowerCase().includes(q)
    );
  }, [routes, routeSearch]);

  const filteredShops = useMemo(() => {
    const q = shopSearch.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter(s => 
      String(s.code || "").toLowerCase().includes(q) || 
      String(s.name || "").toLowerCase().includes(q)
    );
  }, [shops, shopSearch]);

  const filteredSalesmen = useMemo(() => {
    const q = salesmanSearch.trim().toLowerCase();
    if (!q) return salesmen;
    return salesmen.filter(s => 
      String(s.name || "").toLowerCase().includes(q) || 
      String(s.code || "").toLowerCase().includes(q)
    );
  }, [salesmen, salesmanSearch]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return itemsMaster.slice(0, 100);
    return itemsMaster.filter(it => 
      String(it.Item_code || "").toLowerCase().includes(q) || 
      String(it.Item_description || "").toLowerCase().includes(q)
    ).slice(0, 100);
  }, [itemsMaster, itemSearch]);

  // Calculations
  const subtotal = useMemo(() => {
    return rows.reduce((sum, r) => {
      const qty = toNum(r.qty);
      const unit = toNum(r.unit_price);
      const discP = toNum(r.discount_percent);
      const lineGross = qty * unit;
      const discAmt = (lineGross * discP) / 100;
      return sum + Math.max(lineGross - discAmt, 0);
    }, 0);
  }, [rows]);

  const billDiscountAmount = useMemo(() => {
    if (!isBillDiscountEnabled) return 0;
    return (subtotal * toNum(billDiscountPercent)) / 100;
  }, [subtotal, isBillDiscountEnabled, billDiscountPercent]);

  const afterBillDisc = useMemo(() => Math.max(subtotal - billDiscountAmount, 0), [subtotal, billDiscountAmount]);
  const additional = useMemo(() => (isAdditionalEnabled ? toNum(additionalAmount) : 0), [isAdditionalEnabled, additionalAmount]);
  const baseForVat = useMemo(() => afterBillDisc + additional, [afterBillDisc, additional]);
  const vatAmt = useMemo(() => (isVatEnabled ? (baseForVat * toNum(vatPercent)) / 100 : 0), [baseForVat, isVatEnabled, vatPercent]);
  const grandTotal = useMemo(() => baseForVat + vatAmt, [baseForVat, vatAmt]);

  // Row Management
  const addRow = () => {
    setRows(prev => [...prev, {
      id: Date.now() + Math.random(),
      item_code: "",
      item_desc: "",
      unit_price: "0",
      qty: "1",
      free_issues: "0",
      discount_percent: "0",
    }]);
  };

  const removeRow = (id) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter(x => x.id !== id));
  };

  const updateRow = (id, key, value) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const chooseItem = (item) => {
    if (activeRowId === null) return;
    updateRow(activeRowId, "item_code", item.Item_code || "");
    updateRow(activeRowId, "item_desc", item.Item_description || "");
    updateRow(activeRowId, "unit_price", String(item.saleprice ?? 0));
    setItemModal(false);
    setItemSearch("");
    setActiveRowId(null);
  };

  const onSave = async () => {
    if (!selectedRoute?.code) return Alert.alert("Validation", "Select route");
    if (!selectedShop?.code) return Alert.alert("Validation", "Select shop");
    if (!selectedSalesman?.code) return Alert.alert("Validation", "Select Salesman");

    const cleanedItems = rows.map(r => {
      const qty = toNum(r.qty);
      const unit = toNum(r.unit_price);
      const discP = toNum(r.discount_percent);
      const lineGross = qty * unit;
      const discAmt = (lineGross * discP) / 100;
      return {
        item_code: r.item_code,
        item_desc: r.item_desc,
        qty,
        free_issues: String(r.free_issues || "0"),
        unit_price: unit,
        discount: discAmt,
      };
    }).filter(x => x.item_code && x.qty > 0);

    if (cleanedItems.length === 0) return Alert.alert("Validation", "Add at least 1 item");

    const payload = {
      invoice_no: invoiceNo,
      date: billDate.toISOString().split("T")[0],
      route: selectedRoute.code,
      shop_code: selectedShop.code,
      shop_name: selectedShop.name,
      shop_phone: selectedShop.phone || null,
      salesman: selectedSalesman.name,
      bill_discount: billDiscountAmount,
      vat_enabled: isVatEnabled,
      vat_percent: toNum(vatPercent),
      additional_amount: additional,
      items: cleanedItems,
      total_amount: grandTotal
    };

    try {
      setSaving(true);
      const res = await addBill(payload);
      setSavedInvoiceNo(res.invoice_no);
      setSuccessModal(true);
      
      const currentCount = parseInt(invoiceNo.split("-")[1]) || 499;
      await AsyncStorage.setItem("invoiceCounter", (currentCount + 1).toString());
    } catch (e) {
      Alert.alert("Error", "Failed to save bill");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={26} color="white" />
          </TouchableOpacity>
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.headerTitle}>Add Bill</Text>
            <Text style={styles.headerSub}>Create a new invoice</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
        {/* Invoice and Date Section */}
        <View style={styles.topRow}>
          <View style={styles.invoiceBox}>
            <Text style={styles.topLabel}>Invoice No</Text>
            <Text style={styles.invoiceValue}>{invoiceNo}</Text>
          </View>

          <TouchableOpacity style={styles.dateBox} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.topLabel}>Date</Text>
            <Text style={styles.dateValue}>{billDate.toISOString().split("T")[0]}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={billDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setBillDate(selectedDate);
            }}
          />
        )}

        {/* Route Select */}
        <TouchableOpacity style={styles.selectBtn} onPress={() => setRouteModal(true)}>
          <Text style={styles.selectLabel}>Route</Text>
          <Text style={styles.selectValue}>
            {selectedRoute?.code ? `${selectedRoute.code} - ${selectedRoute.description}` : "Select route"}
          </Text>
        </TouchableOpacity>

        {/* Shop Select */}
        <TouchableOpacity 
          style={[styles.selectBtn, !selectedRoute?.code && { opacity: 0.6 }]} 
          onPress={() => selectedRoute?.code && setShopModal(true)}
          disabled={!selectedRoute?.code}
        >
          <Text style={styles.selectLabel}>Shop</Text>
          <Text style={styles.selectValue}>
            {selectedShop?.name ? `${selectedShop.name} (${selectedShop.code})` : "Select shop"}
          </Text>
        </TouchableOpacity>

        {/* Salesman Select */}
        <TouchableOpacity style={styles.selectBtn} onPress={() => setSalesmanModal(true)}>
          <Text style={styles.selectLabel}>Salesman</Text>
          <Text style={styles.selectValue}>
            {selectedSalesman?.name ? `${selectedSalesman.name} (${selectedSalesman.code})` : "Select Salesman"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Items</Text>

        {rows.map((r) => (
          <View key={r.id} style={styles.rowCard}>
            <TouchableOpacity 
              style={styles.itemPick} 
              onPress={() => { setActiveRowId(r.id); setItemModal(true); }}
            >
              <Text style={styles.itemPickText}>{r.item_desc ? r.item_desc : "Select Item"}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>

            <View style={styles.rowGrid}>
              <InputField label="Qty" value={r.qty} onChange={(v) => updateRow(r.id, "qty", v)} />
              <InputField label="Free" value={r.free_issues} onChange={(v) => updateRow(r.id, "free_issues", v)} />
              <InputField label="Unit" value={r.unit_price} onChange={(v) => updateRow(r.id, "unit_price", v)} />
              <InputField label="Disc %" value={r.discount_percent} onChange={(v) => updateRow(r.id, "discount_percent", v)} />
            </View>

            <View style={styles.rowActionRow}>
              <TouchableOpacity style={styles.smallBtn} onPress={addRow}>
                <Text style={styles.smallBtnText}>+ Add Row</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: "#fee2e2" }]} onPress={() => removeRow(r.id)}>
                <Text style={[styles.smallBtnText, { color: "#ef4444" }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Tax & Discount Options */}
        <View style={styles.optionCard}>
          <OptionSwitch label="Bill Discount" value={isBillDiscountEnabled} onValueChange={setIsBillDiscountEnabled} />
          {isBillDiscountEnabled && <TextInput style={styles.optionInput} value={billDiscountPercent} onChangeText={setBillDiscountPercent} keyboardType="numeric" placeholder="Discount %" />}
          
          <OptionSwitch label="VAT" value={isVatEnabled} onValueChange={setIsVatEnabled} />
          {isVatEnabled && <TextInput style={styles.optionInput} value={vatPercent} onChangeText={setVatPercent} keyboardType="numeric" placeholder="VAT %" />}

          <OptionSwitch label="Additional" value={isAdditionalEnabled} onValueChange={setIsAdditionalEnabled} />
          {isAdditionalEnabled && <TextInput style={styles.optionInput} value={additionalAmount} onChangeText={setAdditionalAmount} keyboardType="numeric" placeholder="Amount" />}
        </View>

        {/* Totals Summary */}
        <View style={styles.totalCard}>
          <Row label="Subtotal" value={subtotal} />
          <Row label="Bill Discount" value={billDiscountAmount} negative />
          <Row label="Additional" value={additional} />
          <Row label="VAT" value={vatAmt} />
          <View style={styles.grandTotalContainer}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>Rs. {grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={onSave} disabled={saving}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save Bill</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <SelectionModal visible={routeModal} title="Select Route" search={routeSearch} onSearch={setRouteSearch} onClose={() => setRouteModal(false)} data={filteredRoutes} onSelect={setSelectedRoute} />
      <SelectionModal visible={shopModal} title="Select Shop" search={shopSearch} onSearch={setShopSearch} onClose={() => setShopModal(false)} data={filteredShops} onSelect={setSelectedShop} />
      <SelectionModal visible={salesmanModal} title="Select Salesman" search={salesmanSearch} onSearch={setSalesmanSearch} onClose={() => setSalesmanModal(false)} data={filteredSalesmen} onSelect={setSelectedSalesman} />
      
      {/* Item Modal */}
      <Modal visible={itemModal} transparent animationType="fade">
        <ModalBox title="Select Item" searchValue={itemSearch} onSearch={setItemSearch} onClose={() => setItemModal(false)}>
          <FlatList
            data={filteredItems}
            keyExtractor={(item, idx) => String(item.Item_code ?? idx)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => chooseItem(item)}>
                <Text style={styles.modalItemTitle}>{item.Item_description}</Text>
                <Text style={styles.modalItemSub}>{item.Item_code} • Rs.{Number(item.saleprice || 0).toFixed(2)}</Text>
              </TouchableOpacity>
            )}
          />
        </ModalBox>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modernCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="file-document-check-outline" size={50} color="#2563eb" />
            </View>
            <Text style={styles.modernTitle}>Bill Created Successfully</Text>
            <Text style={styles.invoiceText}>Invoice No: #{savedInvoiceNo}</Text>
            <Text style={styles.modernMessage}>Do you want to proceed with payment?</Text>
            <View style={styles.modernBtnRow}>
              <TouchableOpacity style={styles.modernNoBtn} onPress={() => { setSuccessModal(false); navigation.replace("Dashboard"); }}>
                <Text style={styles.modernNoText}>Later</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modernYesBtn} onPress={() => { setSuccessModal(false); navigation.replace("BillDetail", { invoiceNo: savedInvoiceNo }); }}>
                <Text style={styles.modernYesText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Internal UI Components
function InputField({ label, value, onChange }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.fieldInput} value={value} onChangeText={onChange} keyboardType="numeric" />
    </View>
  );
}

function OptionSwitch({ label, value, onValueChange }) {
  return (
    <View style={styles.optionRow}>
      <Text style={styles.optionLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: "#2563eb" }} />
    </View>
  );
}

function SelectionModal({ visible, title, search, onSearch, onClose, data, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <ModalBox title={title} searchValue={search} onSearch={onSearch} onClose={onClose}>
        {data && data.length > 0 ? (
          <FlatList
            data={data}
            keyExtractor={(item, idx) => String(item.id || idx)}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.modalItem} 
                onPress={() => { onSelect(item); onClose(); }}
              >
                {/* Logic to handle different data types (Route vs Shop vs Salesman) */}
                <Text style={styles.modalItemTitle}>
                  {item.name || item.description || "No Title"}
                </Text>
                <Text style={styles.modalItemSub}>
                  {item.code ? `Code: ${item.code}` : ""}
                </Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#64748b' }}>No data found</Text>
          </View>
        )}
      </ModalBox>
    </Modal>
  );
}

function Row({ label, value, negative }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, negative && { color: "#ef4444" }]}>
        Rs. {Number(value || 0).toFixed(2)}
      </Text>
    </View>
  );
}

function ModalBox({ title, searchValue, onSearch, onClose, children }) {
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <TextInput style={styles.modalInput} placeholder="Search..." value={searchValue} onChangeText={onSearch} />
        <View style={{ maxHeight: 400 }}>{children}</View>
        <TouchableOpacity style={styles.modalClose} onPress={onClose}>
          <Text style={styles.modalCloseText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#2563eb",
    padding: 25,
    paddingTop: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "bold" },
  headerSub: { color: "white", opacity: 0.8, fontSize: 13 },
  topRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  invoiceBox: { flex: 1, backgroundColor: "white", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  dateBox: { flex: 1, backgroundColor: "white", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  topLabel: { color: "#64748b", fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  invoiceValue: { color: "#1e293b", fontSize: 16, fontWeight: "800" },
  dateValue: { color: "#1e293b", fontSize: 15, fontWeight: "700" },
  selectBtn: { backgroundColor: "white", borderRadius: 15, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  selectLabel: { color: "#64748b", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  selectValue: { marginTop: 4, fontWeight: "700", color: "#1e293b", fontSize: 15 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1e293b", marginTop: 10, marginBottom: 10 },
  rowCard: { backgroundColor: "white", borderRadius: 18, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: "#e2e8f0" },
  itemPick: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f1f5f9", padding: 14, borderRadius: 12, alignItems: "center" },
  itemPickText: { fontWeight: "700", color: "#1e293b", flex: 1 },
  rowGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 15 },
  field: { width: "47%" },
  fieldLabel: { color: "#64748b", fontSize: 11, fontWeight: "700", marginBottom: 5 },
  fieldInput: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", color: "#1e293b" },
  rowActionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  smallBtn: { backgroundColor: "#f1f5f9", paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10 },
  smallBtnText: { fontWeight: "700", color: "#2563eb", fontSize: 13 },
  optionCard: { backgroundColor: "white", borderRadius: 15, padding: 16, marginTop: 5, borderWidth: 1, borderColor: "#e2e8f0" },
  optionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  optionLabel: { fontWeight: "700", color: "#1e293b" },
  optionInput: { backgroundColor: "#f8fafc", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", marginTop: 5, marginBottom: 10 },
  totalCard: { backgroundColor: "#f1f5f9", borderRadius: 20, padding: 20, marginTop: 15 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { color: "#64748b", fontWeight: "600" },
  summaryValue: { fontWeight: "700", color: "#1e293b" },
  grandTotalContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12 },
  grandTotalLabel: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  grandTotalValue: { fontSize: 20, fontWeight: "800", color: "#2563eb" },
  saveBtn: { backgroundColor: "#2563eb", padding: 18, borderRadius: 15, alignItems: "center", marginTop: 20 },
  saveText: { color: "white", fontWeight: "800", fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modernCard: { backgroundColor: "white", borderRadius: 30, padding: 25, width: "85%", alignItems: "center" },
  iconCircle: { width: 90, height: 90, borderRadius: 50, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center", marginBottom: 15 },
  modernTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b", textAlign: "center" },
  invoiceText: { fontSize: 13, color: "#2563eb", marginTop: 5, fontWeight: "600" },
  modernMessage: { fontSize: 14, color: "#64748b", marginTop: 10, textAlign: "center" },
  modernBtnRow: { flexDirection: "row", marginTop: 25, width: "100%", justifyContent: "space-between" },
  modernNoBtn: { width: "48%", paddingVertical: 14, borderRadius: 14, backgroundColor: "#f1f5f9", alignItems: "center" },
  modernYesBtn: { width: "48%", paddingVertical: 14, borderRadius: 14, backgroundColor: "#2563eb", alignItems: "center" },
  modernNoText: { color: "#ef4444", fontWeight: "700" },
  modernYesText: { color: "white", fontWeight: "700" },
  modalCard: { backgroundColor: "white", borderRadius: 25, padding: 20, width: "90%", maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 15, color: "#1e293b" },
  modalInput: { backgroundColor: "#f1f5f9", borderRadius: 12, padding: 14, marginBottom: 15, borderWidth: 1, borderColor: "#e2e8f0" },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  modalItemTitle: { fontWeight: "700", color: "#1e293b", fontSize: 15 },
  modalItemSub: { color: "#64748b", fontSize: 13 },
  modalClose: { marginTop: 15, alignItems: "center", padding: 15, backgroundColor: "#f1f5f9", borderRadius: 12 },
  modalCloseText: { fontWeight: "700", color: "#ef4444" },
});