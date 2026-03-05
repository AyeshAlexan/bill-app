import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getBillById, addPayment } from "../services/billApi";

// Helper to determine the total bill value
const totalOf = (b) =>
  Number(b?.total_amount ?? b?.after_vat_amount ?? b?.Net_Amount ?? b?.Gross_Amount ?? 0);

const paidOf = (b) => Number(b?.Paid_Amount ?? b?.paid_amount ?? 0);

export default function BillDetailScreen({ route, navigation }) {
  const { invoiceNo } = route.params;

  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [method, setMethod] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ---------------- SUMMARY CALCULATIONS ----------------

  const subtotal = useMemo(() => 
    Number(bill?.subtotal ?? bill?.Gross_Amount ?? bill?.gross_amount ?? bill?.Sub_Total ?? 0), 
  [bill]);

  const vatAmount = useMemo(() => 
    Number(bill?.vat_amount ?? bill?.Vat_Amount ?? bill?.Vat ?? 0), 
  [bill]);

  const additionalAmount = useMemo(() => 
    Number(bill?.additional_amount ?? bill?.Additional_Amount ?? bill?.Other_Charges ?? 0), 
  [bill]);

  const total = useMemo(() => totalOf(bill), [bill]);
  const paid = useMemo(() => paidOf(bill), [bill]);
  const due = useMemo(() => Math.max(total - paid, 0), [total, paid]);

  // ---------------- ITEM DISCOUNT TOTAL (New Logic) ----------------

  const itemDiscountTotal = useMemo(() => {
    return items.reduce((sum, it) => {
      return sum + Number(it.Discount ?? it.discount ?? it.disc_amount ?? it.Discount_Amount ?? 0);
    }, 0);
  }, [items]);

  // ---------------- BILL DISCOUNT FIX (New Logic) ----------------

  const discountAmount = useMemo(() => {
    const combined = Number(bill?.bill_discount ?? bill?.Discount_Amount ?? bill?.discount_amount ?? bill?.Discount ?? 0);
    // If backend stores combined, subtract item level to avoid double counting
    return Math.max(combined - itemDiscountTotal, 0);
  }, [bill, itemDiscountTotal]);

  // ---------------- LOAD DATA ----------------

  const load = async () => {
    try {
      setLoading(true);
      const data = await getBillById(invoiceNo);
      const currentBill = data?.bill || data || null;
      setBill(currentBill);
      setItems(data?.items || []);

      const currentDue = totalOf(currentBill) - paidOf(currentBill);
      setAmount(currentDue > 0 ? String(currentDue.toFixed(2)) : "0.00");
    } catch (e) {
      Alert.alert("Error", "Cannot load bill details");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [invoiceNo]));

  const submitPayment = async () => {
    const amt = Number(amount || 0);
    if (due <= 0.5) { Alert.alert("Notice", "This bill is already fully paid."); return; }
    if (!amt || amt <= 0) { Alert.alert("Input", "Please enter a valid amount."); return; }

    try {
      setSubmitting(true);
      await addPayment({
        invoice_no: invoiceNo,
        amount: amt,
        method,
        note,
      });
      setShowSuccess(true);
      setNote("");
      await load();
    } catch (e) {
      Alert.alert("Error", "Payment processing failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#30a830" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 10 }}>
          <MaterialCommunityIcons name="chevron-left" size={30} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Detail</Text>
        <Text style={styles.headerSub}>Transaction ID: {invoiceNo}</Text>
        <Text style={styles.headerSub1}>
          Salesman: {bill?.Salesmen || bill?.salesman || "—"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* SUMMARY CARD */}
        <View style={styles.card}>
          <View style={styles.billTop}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color="#334155" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.billNo}>Invoice: {bill?.Invoice_no || bill?.invoice_no}</Text>
              <Text style={styles.date}>{bill?.Invoice_date || bill?.date || "—"}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: due <= 0.5 ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={[styles.badgeText, { color: due <= 0.5 ? '#166534' : '#991b1b' }]}>
                {due <= 0.5 ? 'PAID' : 'PENDING'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gross Subtotal</Text>
            <Text style={styles.totalValue}>Rs. {subtotal.toFixed(2)}</Text>
          </View>

          {itemDiscountTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Item Discount</Text>
              <Text style={[styles.totalValue, { color: "#be123c" }]}>- {itemDiscountTotal.toFixed(2)}</Text>
            </View>
          )}

          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Bill Discount</Text>
              <Text style={[styles.totalValue, { color: "#be123c" }]}>- {discountAmount.toFixed(2)}</Text>
            </View>
          )}

          {additionalAmount !== 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Additional</Text>
              <Text style={styles.totalValue}>+ {additionalAmount.toFixed(2)}</Text>
            </View>
          )}

          {vatAmount !== 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT ({bill?.vat_percent || 18}%)</Text>
              <Text style={styles.totalValue}>+ {vatAmount.toFixed(2)}</Text>
            </View>
          )}

          <View style={[styles.divider, { marginVertical: 10 }]} />

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: "#0f172a", fontWeight: '700' }]}>Net Amount</Text>
            <Text style={[styles.totalValue, { fontSize: 18, color: "#0f172a" }]}>
              Rs. {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Paid Amount</Text>
            <Text style={[styles.totalValue, { color: '#059669' }]}>
              Rs. {paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: '#e11d48', fontWeight: '700' }]}>Balance Due</Text>
            <Text style={[styles.totalValue, { color: due <= 0.5 ? "#059669" : "#e11d48", fontSize: 20 }]}>
              Rs. {due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* PAYMENT FORM (Restored UI) */}
        {due > 0.5 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Record Payment</Text>
            <View style={styles.methodRow}>
              {["Cash", "Card", "Cheque", "Bank"].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodBtn, method === m && styles.methodBtnActive]}
                  onPress={() => setMethod(m)}
                >
                  <Text style={[styles.methodText, method === m && { color: "white" }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
            />

            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Reference Note (Optional)"
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { backgroundColor: "#94a3b8" }]}
              onPress={submitPayment}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>CONFIRM PAYMENT</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* INVENTORY ITEMS (Updated logic) */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Inventory Items</Text>
          {items.length > 0 ? items.map((it, idx) => {
            const itemDisc = Number(it.Discount ?? it.discount ?? it.disc_amount ?? it.Discount_Amount ?? 0);
            return (
              <View key={idx} style={styles.itemCard}>
                <View style={styles.itemHeaderRow}>
                  <Text style={styles.itemName} numberOfLines={1}>{it.Item_description || it.item_desc || "Item"}</Text>
                  <Text style={styles.itemPrice}>Rs. {Number(it.Net_value || it.total || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.itemMetaRow}>
                  <View style={styles.badge}><Text style={styles.badgeText}>Qty: {it.QTY || it.qty}</Text></View>
                  {(it.Free_Issues > 0 || it.free_issues > 0) && (
                    <View style={[styles.badge, { backgroundColor: '#f0f9ff' }]}>
                      <Text style={[styles.badgeText, { color: '#0369a1' }]}>Free: {it.Free_Issues ?? it.free_issues ?? 0}</Text>
                    </View>
                  )}
                  {itemDisc > 0 && (
                    <View style={[styles.badge, { backgroundColor: '#fff1f2' }]}>
                      <Text style={[styles.badgeText, { color: '#be123c' }]}>Disc: {itemDisc.toFixed(2)}</Text>
                    </View>
                  )}
                  <Text style={styles.metaPrice}>@ {Number(it.Unit_price || it.unit_price || 0).toFixed(2)}</Text>
                </View>
              </View>
            );
          }) : <Text style={{textAlign: 'center', color: '#64748b'}}>No items found</Text>}
        </View>
      </ScrollView>

      {/* SUCCESS MODAL (Restored Full Version) */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modernCard}>
            <MaterialCommunityIcons name="check-decagram" size={70} color="#059669" />
            <Text style={styles.modernTitle}>Payment Success</Text>
            <Text style={styles.modernMessage}>The payment for invoice #{invoiceNo} has been recorded and the balance updated.</Text>
            <TouchableOpacity style={styles.modernDoneBtn} onPress={() => setShowSuccess(false)}>
              <Text style={styles.modernDoneText}>Continue</Text>
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
    paddingHorizontal: 25, 
    paddingTop: 60, 
    paddingBottom: 30,
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30 
  },
  headerTitle: { color: "white", fontSize: 25.5, fontWeight: "700" },
  headerSub: { color: "white", fontSize: 13, marginTop: 4 , fontWeight: "700"},
  headerSub1: { color: "white", fontSize: 12.5, marginTop: 4 , fontWeight: "500"},
  content: { padding: 15 },
  card: { 
    backgroundColor: "white", 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 15, 
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  billTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  iconBox: { backgroundColor: "#f8fafc", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  billNo: { fontSize: 15, fontWeight: "700", color: "#334155" },
  date: { color: "#64748b", fontSize: 12, marginTop: 2 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemCard: { 
    backgroundColor: "#ffffff", 
    borderRadius: 12, 
    paddingVertical: 12, 
    marginBottom: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: "#f1f5f9" 
  },
  itemHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center' },
  itemName: { fontWeight: "600", color: "#1e293b", fontSize: 14, flex: 1, marginRight: 10 },
  itemPrice: { fontWeight: "700", color: "#1e293b", fontSize: 14 },
  itemMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  badge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  metaPrice: { color: "#94a3b8", fontSize: 12, marginLeft: 'auto' },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  totalLabel: { color: "#64748b", fontSize: 14, fontWeight: '500' },
  totalValue: { fontWeight: "700", fontSize: 15, color: "#334155" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 15 },
  input: { 
    backgroundColor: "#f8fafc", 
    padding: 14, 
    borderRadius: 12, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    color: '#1e293b',
    fontSize: 15
  },
  methodRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  methodBtn: { 
    flex: 1, 
    paddingVertical: 10, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: "#e2e8f0", 
    alignItems: "center", 
    marginHorizontal: 3,
    backgroundColor: 'white'
  },
  methodBtnActive: { backgroundColor: "#30a830", borderColor: "#30a830" },
  methodText: { fontWeight: "600", fontSize: 12, color: "#475569" },
  submitBtn: { 
    backgroundColor: "#30a830", 
    padding: 16, 
    borderRadius: 12, 
    alignItems: "center", 
    marginTop: 5 
  },
  submitText: { color: "white", fontWeight: "700", letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.8)", justifyContent: "center", alignItems: "center" },
  modernCard: { backgroundColor: "white", borderRadius: 24, padding: 35, alignItems: "center", width: '85%' },
  modernTitle: { fontSize: 20, fontWeight: "700", color: "#1e293b", marginTop: 15 },
  modernMessage: { color: "#64748b", marginVertical: 15, textAlign: "center", lineHeight: 20 },
  modernDoneBtn: { backgroundColor: "#1e293b", paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  modernDoneText: { color: "white", fontWeight: "700" }
});