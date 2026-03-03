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

const totalOf = (b) =>
  Number(b?.after_vat_amount ?? b?.Net_Amount ?? b?.Gross_Amount ?? 0);

const paidOf = (b) => Number(b?.Paid_Amount ?? 0);

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

  // --- MAPPING ---
  const subtotal = useMemo(() => 
    Number(bill?.Gross_Amount ?? bill?.gross_amount ?? bill?.Sub_Total ?? 0), [bill]);
  
  const vatAmount = useMemo(() => 
    Number(bill?.Vat_Amount ?? bill?.vat_amount ?? bill?.Vat ?? 0), [bill]);
  
  const discountAmount = useMemo(() => 
    Number(bill?.Discount_Amount ?? bill?.discount_amount ?? bill?.Discount ?? 0), [bill]);
  
  const additionalAmount = useMemo(() => 
    Number(bill?.Additional_Amount ?? bill?.additional_amount ?? bill?.Other_Charges ?? 0), [bill]);
  
  const total = useMemo(() => totalOf(bill), [bill]);
  const paid = useMemo(() => paidOf(bill), [bill]);
  const due = useMemo(() => Math.max(total - paid, 0), [total, paid]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getBillById(invoiceNo);
      const currentBill = data?.bill || null;
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
    if (due <= 0.5) { Alert.alert("Notice", "Fully paid."); return; }
    if (!amt || amt <= 0) { Alert.alert("Input", "Enter a valid amount."); return; }
    
    try {
      setSubmitting(true);
      await addPayment({ invoice_no: invoiceNo, amount: amt, method, note });
      setShowSuccess(true);
      setNote(""); 
      await load(); 
    } catch (e) {
      Alert.alert("Error", "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#0f172a" />
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
        <Text style={styles.headerSub}>
            Transaction ID: INV- {invoiceNo}
        </Text>
        <Text style={styles.headerSub1}>
            Salesman: {bill?.Salesmen || bill?.salesmen || "—"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.billTop}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color="#334155" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.billNo}>Invoice No: {bill?.Invoice_no || bill?.invoice_no}</Text>
              <Text style={styles.date}>{bill?.Invoice_date || bill?.date || "—"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>Rs. {subtotal.toFixed(2)}</Text>
          </View>

          {vatAmount !== 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT</Text>
              <Text style={styles.totalValue}>+ {vatAmount.toFixed(2)}</Text>
            </View>
          )}

          {discountAmount !== 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, { color: '#be123c' }]}>- {discountAmount.toFixed(2)}</Text>
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
            <Text style={styles.totalLabel}>Received</Text>
            <Text style={[styles.totalValue, { color: '#059669' }]}>
                Rs. {paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: '#e11d48', fontWeight: '700' }]}>Outstanding</Text>
            <Text style={[styles.totalValue, { color: due <= 0.5 ? "#059669" : "#e11d48", fontSize: 20 }]}>
              Rs. {due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Collect Payment Section */}
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
            placeholder="Reference Note"
            placeholderTextColor="#94a3b8"
          />

          <TouchableOpacity
            style={[styles.submitBtn, (due <= 0.5 || submitting) && { backgroundColor: "#94a3b8" }]}
            onPress={submitPayment}
            disabled={due <= 0.5 || submitting}
          >
            {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>CONFIRM PAYMENT</Text>}
          </TouchableOpacity>
        </View>

        {/* Line Items with Free Issues restore */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Inventory Items</Text>
          {items.map((it, idx) => (
            <View key={idx} style={styles.itemCard}>
              <View style={styles.itemHeaderRow}>
                <Text style={styles.itemName} numberOfLines={1}>{it.Item_description || it.item_name || "Item"}</Text>
                <Text style={styles.itemPrice}>Rs. {Number(it.Net_value || it.total || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.itemMetaRow}>
                <View style={styles.badge}><Text style={styles.badgeText}>Qty: {it.QTY || it.qty}</Text></View>
                {/* RESTORED FREE ISSUES BELOW */}
                <View style={[styles.badge, { backgroundColor: '#f0f9ff' }]}>
                    <Text style={[styles.badgeText, { color: '#0369a1' }]}>Free: {it.Free_Issues ?? it.free_issues ?? it.Free ?? 0}</Text>
                </View>
                <Text style={styles.metaPrice}>@ {Number(it.Unit_price || it.price || 0).toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modernCard}>
            <MaterialCommunityIcons name="check-decagram" size={70} color="#059669" />
            <Text style={styles.modernTitle}>Payment Processed</Text>
            <Text style={styles.modernMessage}>The transaction for invoice #{invoiceNo} has been successfully updated.</Text>
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
   backgroundColor: "#30a830", // Professional Slate/Navy
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
  methodBtnActive: { backgroundColor: "#30a830", borderColor: "#30a830" 
},
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