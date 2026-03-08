import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState, useRef } from "react";
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
  Animated,
  Easing,
  Platform,
} from "react-native";

import { addBill } from "../services/billApi";
import { fetchItems } from "../services/itemApi";
import { fetchRoutes, fetchShopsByRoute } from "../services/shopApi";
import { fetchSalesmen } from "../services/salesmanApi";

// --- UPDATED: ANIMATED SHOP ITEM COMPONENT (With Prices) ---
const AnimatedShopItem = ({ item, index, onSelect, icon = "storefront-outline" }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 400,
      delay: index * 50,
      easing: Easing.out(Easing.back(1)),
      useNativeDriver: true,
    }).start();
  }, []);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0],
  });

  return (
    <Animated.View
      style={[
        styles.modalItem,
        {
          opacity: animatedValue,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity onPress={() => onSelect(item)} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.shopIconCircle}>
            <MaterialCommunityIcons name={icon} size={20} color="#2563eb" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalItemTitle}>{item.name || item.description}</Text>
          <Text style={styles.modalItemSub}>Code: {item.code} {item.phone ? `• ${item.phone}` : ""}</Text>
        </View>
        {/* NEW: Price Display */}
        {item.price !== undefined && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>Rs.{item.price}</Text>
          </View>
        )}
        <MaterialCommunityIcons name="chevron-right" size={20} color="#cbd5e1" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- NEW: PULSE ANIMATED BUTTON FOR PAY NOW ---
const PulsePayButton = ({ onPress, title }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ width: '48%', transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity style={styles.modernYesBtn} onPress={onPress}>
        <Text style={styles.modernYesText}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- BILL LOADING ANIMATION COMPONENT ---
const BillLoader = ({ message = "Preparing Invoice..." }) => {
  const moveAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim, { toValue: -15, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(moveAnim, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 5, duration: 400, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -5, duration: 400, useNativeDriver: true }),
        ])
    ).start();
  }, []);

  return (
    <View style={styles.center}>
      <View style={loaderStyles.container}>
        <Animated.View style={{ transform: [{ translateY: moveAnim }, { translateX: shakeAnim }] }}>
          <MaterialCommunityIcons name="file-document-edit-outline" size={70} color="#2563eb" />
        </Animated.View>
      </View>
      <Text style={loaderStyles.title}>{message}</Text>
      <Text style={loaderStyles.subTitle}>Updating inventory and invoice records</Text>
      <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 25 }} />
    </View>
  );
};

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export default function AddBillScreen({ navigation }) {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeModal, setRouteModal] = useState(false);
  const [routeSearch, setRouteSearch] = useState("");

  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopModal, setShopModal] = useState(false);
  const [shopSearch, setShopSearch] = useState("");

  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [salesmanModal, setSalesmanModal] = useState(false);
  const [salesmanSearch, setSalesmanSearch] = useState("");

  const [itemsMaster, setItemsMaster] = useState([]);
  const [itemModal, setItemModal] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [activeRowId, setActiveRowId] = useState(null);

  const [successModal, setSuccessModal] = useState(false);
  const [savedInvoiceNo, setSavedInvoiceNo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [tempInvoiceNum, setTempInvoiceNum] = useState("");

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

  const [invoiceNo, setInvoiceNo] = useState("INV-506");
  const [billDate, setBillDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isBillDiscountEnabled, setIsBillDiscountEnabled] = useState(false);
  const [billDiscountPercent, setBillDiscountPercent] = useState("0");
  const [isVatEnabled, setIsVatEnabled] = useState(true);
  const [vatPercent, setVatPercent] = useState("18");
  const [isAdditionalEnabled, setIsAdditionalEnabled] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState("0");

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

        const count = storedInv ? parseInt(storedInv) : 506;
        setInvoiceNo(`INV-${count}`);
      } catch (e) {
        console.error("Load Error:", e);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    })();
  }, []);

  const handleManualReset = async () => {
    const num = parseInt(tempInvoiceNum);
    if (!isNaN(num)) {
      await AsyncStorage.setItem("invoiceCounter", num.toString());
      setInvoiceNo(`INV-${num}`);
      setResetModalVisible(false);
      setTempInvoiceNum("");
    } else {
      Alert.alert("Error", "Please enter a valid number");
    }
  };

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
      const free = toNum(r.free_issues); 
      const unit = toNum(r.unit_price);
      const discP = toNum(r.discount_percent);
      const lineGross = qty * unit;
      const discAmt = (lineGross * discP) / 100;
      
      return {
        item_code: r.item_code,
        item_desc: r.item_desc,
        qty: qty,
        free_issues: free,
        unit_price: unit,
        discount: discAmt,
      };
    }).filter(x => x.item_code && (x.qty > 0 || x.free_issues > 0));

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
      
      const currentCount = parseInt(invoiceNo.split("-")[1]) || 506;
      await AsyncStorage.setItem("invoiceCounter", (currentCount + 1).toString());
    } catch (e) {
      Alert.alert("Error", "Failed to save bill");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || saving) {
    return <BillLoader message={saving ? "Saving Bill..." : "Loading Data..."} />;
  }

  return (
    <View style={styles.container}>
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
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.invoiceBox} onPress={() => setResetModalVisible(true)}>
            <Text style={styles.topLabel}>Invoice No (Edit)</Text>
            <Text style={styles.invoiceValue}>{invoiceNo}</Text>
          </TouchableOpacity>

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

        <TouchableOpacity style={styles.selectBtn} onPress={() => setRouteModal(true)}>
          <Text style={styles.selectLabel}>Route</Text>
          <Text style={styles.selectValue}>
            {selectedRoute?.code ? `${selectedRoute.code} - ${selectedRoute.description}` : "Select route"}
          </Text>
        </TouchableOpacity>

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

        <View style={styles.optionCard}>
          <OptionSwitch label="Bill Discount" value={isBillDiscountEnabled} onValueChange={setIsBillDiscountEnabled} />
          {isBillDiscountEnabled && <TextInput style={styles.optionInput} value={billDiscountPercent} onChangeText={setBillDiscountPercent} keyboardType="numeric" placeholder="Discount %" />}
          
          <OptionSwitch label="VAT" value={isVatEnabled} onValueChange={setIsVatEnabled} />
          {isVatEnabled && <TextInput style={styles.optionInput} value={vatPercent} onChangeText={setVatPercent} keyboardType="numeric" placeholder="VAT %" />}

          <OptionSwitch label="Additional" value={isAdditionalEnabled} onValueChange={setIsAdditionalEnabled} />
          {isAdditionalEnabled && <TextInput style={styles.optionInput} value={additionalAmount} onChangeText={setAdditionalAmount} keyboardType="numeric" placeholder="Amount" />}
        </View>

        <View style={styles.totalCard}>
          <SummaryRow label="Subtotal" value={subtotal} />
          <SummaryRow label="Bill Discount" value={billDiscountAmount} negative />
          <SummaryRow label="Additional" value={additional} />
          <SummaryRow label="VAT" value={vatAmt} />
          <View style={styles.grandTotalContainer}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>  Rs. {grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
            <Text style={styles.saveText}>Save Bill</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL: RESET INVOICE NUMBER */}
      <Modal visible={resetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                <Text style={styles.modalTitle}>Set Next Invoice No</Text>
                <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                    <MaterialCommunityIcons name="close-circle" size={24} color="#cbd5e1" />
                </TouchableOpacity>
            </View>
            <Text style={{color: '#64748b', marginBottom: 12, fontSize: 13}}>Enter the numeric part of the next invoice (e.g. 506)</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="e.g. 506" 
              keyboardType="numeric" 
              value={tempInvoiceNum}
              onChangeText={setTempInvoiceNum}
              placeholderTextColor="#94a3b8"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <TouchableOpacity 
                 style={styles.modalCancelBtn} 
                 onPress={() => setResetModalVisible(false)}
                >
                 <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                 style={styles.modalUpdateBtn} 
                 onPress={handleManualReset}
                >
                 <Text style={styles.modalUpdateText}>Update</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: SELECTIONS */}
      <SelectionModal 
        visible={routeModal} 
        title="Select Route" 
        search={routeSearch} 
        onSearch={setRouteSearch} 
        onClose={() => setRouteModal(false)} 
        data={filteredRoutes} 
        onSelect={setSelectedRoute} 
        icon="map-marker-path"
      />
      
      <SelectionModal 
        visible={shopModal} 
        title="Select Shop" 
        search={shopSearch} 
        onSearch={setShopSearch} 
        onClose={() => setShopModal(false)} 
        data={filteredShops} 
        onSelect={setSelectedShop} 
        icon="storefront-outline"
      />

      <SelectionModal 
        visible={salesmanModal} 
        title="Select Salesman" 
        search={salesmanSearch} 
        onSearch={setSalesmanSearch} 
        onClose={() => setSalesmanModal(false)} 
        data={filteredSalesmen} 
        onSelect={setSelectedSalesman} 
        icon="account-tie-outline"
      />
      
      {/* ITEMS MODAL - Updated to pass Prices */}
      <Modal visible={itemModal} transparent animationType="fade">
        <ModalBox title="Select Item" searchValue={itemSearch} onSearch={setItemSearch} onClose={() => setItemModal(false)}>
          <FlatList
            data={filteredItems}
            keyExtractor={(item, idx) => String(item.Item_code ?? idx)}
            renderItem={({ item, index }) => (
              <AnimatedShopItem 
                item={{ 
                  name: item.Item_description, 
                  code: item.Item_code,
                  price: item.saleprice // Added price
                }} 
                index={index} 
                onSelect={() => chooseItem(item)} 
                icon="package-variant-closed"
              />
            )}
          />
        </ModalBox>
      </Modal>

      {/* SUCCESS MODAL - Updated with Pulse Animation */}
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
              
              {/* Pulse Animated Payment Button */}
              <PulsePayButton 
                title="Pay Now" 
                onPress={() => { setSuccessModal(false); navigation.replace("BillDetail", { invoiceNo: savedInvoiceNo }); }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Helper Components
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

function SelectionModal({ visible, title, search, onSearch, onClose, data, onSelect, icon }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <ModalBox title={title} searchValue={search} onSearch={onSearch} onClose={onClose}>
        {data && data.length > 0 ? (
          <FlatList
            data={data}
            keyExtractor={(item, idx) => String(item.id || item.code || idx)}
            renderItem={({ item, index }) => (
              <AnimatedShopItem 
                item={item} 
                index={index} 
                onSelect={(val) => { onSelect(val); onClose(); }} 
                icon={icon}
              />
            )}
          />
        ) : (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <MaterialCommunityIcons name="database-off" size={40} color="#cbd5e1" />
            <Text style={{ color: '#64748b', marginTop: 10 }}>No results found</Text>
          </View>
        )}
      </ModalBox>
    </Modal>
  );
}

function SummaryRow({ label, value, negative }) {
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
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close-circle" size={24} color="#cbd5e1" />
            </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
            <TextInput 
                style={styles.modalSearchInput} 
                placeholder="Search..." 
                value={searchValue} 
                onChangeText={onSearch} 
                placeholderTextColor="#94a3b8"
            />
        </View>
        <View style={{ maxHeight: 450 }}>{children}</View>
      </View>
    </View>
  );
}

const loaderStyles = StyleSheet.create({
  container: { height: 100, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginTop: 20 },
  subTitle: { fontSize: 13, color: '#64748b', marginTop: 4 }
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
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
  invoiceValue: { color: "#2563eb", fontSize: 16, fontWeight: "800" },
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
  fieldInput: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", color: "#1e293b", fontWeight: '600' },
  rowActionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  smallBtn: { backgroundColor: "#eff6ff", paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10 },
  smallBtnText: { fontWeight: "700", color: "#2563eb", fontSize: 13 },
  optionCard: { backgroundColor: "white", borderRadius: 15, padding: 16, marginTop: 5, borderWidth: 1, borderColor: "#e2e8f0" },
  optionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  optionLabel: { fontWeight: "700", color: "#1e293b" },
  optionInput: { backgroundColor: "#f8fafc", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", marginTop: 5, marginBottom: 10, fontWeight: '600' },
  totalCard: { backgroundColor: "#f1f5f9", borderRadius: 20, padding: 20, marginTop: 15 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { color: "#64748b", fontWeight: "600" },
  summaryValue: { fontWeight: "700", color: "#1e293b" },
  grandTotalContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 12 },
  grandTotalLabel: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  grandTotalValue: { fontSize: 20, fontWeight: "800", color: "#2563eb" },
  saveBtn: { backgroundColor: "#2563eb", padding: 18, borderRadius: 15, alignItems: "center", marginTop: 20 },
  saveText: { color: "white", fontWeight: "800", fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  modernCard: { backgroundColor: "white", borderRadius: 30, padding: 25, width: "85%", alignItems: "center" },
  iconCircle: { width: 90, height: 90, borderRadius: 50, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center", marginBottom: 15 },
  modernTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b", textAlign: "center" },
  invoiceText: { fontSize: 13, color: "#2563eb", marginTop: 5, fontWeight: "600" },
  modernMessage: { fontSize: 14, color: "#64748b", marginTop: 10, textAlign: "center" },
  modernBtnRow: { flexDirection: "row", marginTop: 25, width: "100%", justifyContent: "space-between", alignItems: 'center' },
  modernNoBtn: { width: "48%", paddingVertical: 14, borderRadius: 14, backgroundColor: "#f1f5f9", alignItems: "center" },
  modernYesBtn: { width: "100%", paddingVertical: 14, borderRadius: 14, backgroundColor: "#2563eb", alignItems: "center", elevation: 4 },
  modernNoText: { color: "#ef4444", fontWeight: "700" },
  modernYesText: { color: "white", fontWeight: "700" },
  modalCard: { backgroundColor: "white", borderRadius: 25, padding: 20, width: "95%", maxHeight: "85%", maxWidth: 450, elevation: 20 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#1e293b" },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  modalSearchInput: { flex: 1, paddingVertical: 12, marginLeft: 8, color: "#1e293b", fontWeight: '600' },
  modalInput: { backgroundColor: '#f8fafc', paddingHorizontal: 15, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  modalCancelBtn: { backgroundColor: '#f1f5f9', paddingVertical: 14, width: '48%', borderRadius: 12, alignItems: 'center' },
  modalCancelText: { color: '#64748b', fontWeight: '700' },
  modalUpdateBtn: { backgroundColor: '#2563eb', paddingVertical: 14, width: '48%', borderRadius: 12, alignItems: 'center' },
  modalUpdateText: { color: 'white', fontWeight: '800' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  modalItemTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  modalItemSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  shopIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center", marginRight: 12 },
  // Price Badge Styles
  priceBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#dcfce7' },
  priceBadgeText: { color: '#16a34a', fontWeight: '800', fontSize: 12 }
});