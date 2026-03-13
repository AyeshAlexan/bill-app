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
  Platform
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getBillById, addPayment } from "../services/billApi";

// --- PRINTING IMPORTS ---
import * as Print from "expo-print";
import { Asset } from "expo-asset";
import logo from "../assets/bill-logo.png";

const escapeHtml = (str) => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

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
  const [printing, setPrinting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 1️⃣ ADDED STATES FOR CHANGE CALCULATION
  const [paidAmount, setPaidAmount] = useState("");
  const [changeAmount, setChangeAmount] = useState(0);

  // NEW: States to preserve values for the success modal
  const [lastPaid, setLastPaid] = useState(0);
  const [lastChange, setLastChange] = useState(0);

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

  const itemDiscountTotal = useMemo(() => {
    return items.reduce((sum, it) => {
      return sum + Number(it.Discount ?? it.discount ?? it.disc_amount ?? it.Discount_Amount ?? 0);
    }, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    const combined = Number(bill?.bill_discount ?? bill?.Discount_Amount ?? bill?.discount_amount ?? bill?.Discount ?? 0);
    return Math.max(combined - itemDiscountTotal, 0);
  }, [bill, itemDiscountTotal]);

  // 1️⃣ AUTO CALCULATE CHANGE MONEY LOGIC
  const handlePaidAmountChange = (value) => {
    setPaidAmount(value);

    const paidVal = parseFloat(value || 0);
    const billTotal = parseFloat(due || 0); 

    if (paidVal > billTotal) {
      setChangeAmount((paidVal - billTotal).toFixed(2));
    } else {
      setChangeAmount(0);
    }

    setAmount(value); 
  };

  // ---------------- LOAD DATA ----------------

  const load = async () => {
    try {
      setLoading(true);
      const data = await getBillById(invoiceNo);
      const currentBill = data?.bill || data || null;
      setBill(currentBill);
      setItems(data?.items || []);

      const currentDue = totalOf(currentBill) - paidOf(currentBill);
      const defaultAmt = currentDue > 0 ? String(currentDue.toFixed(2)) : "0.00";
      
      setAmount(defaultAmt);
      setPaidAmount(defaultAmt); 
      setChangeAmount(0);
    } catch (e) {
      Alert.alert("Error", "Cannot load bill details");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [invoiceNo]));

  // ---------------- PRINT LOGIC ----------------

  const buildThermalHtml = (logoUri) => {
    const customerDisplayName = bill?.Customer_Name || bill?.Customer_name || bill?.shop_name || "Valued Customer";

    const itemsHtml = items.map(it => {
      const freeQty = it.Free_Issues ?? it.free_issues ?? 0;
      const itmDisc = Number(it.Discount ?? it.discount ?? it.disc_amount ?? it.Discount_Amount ?? 0);
      return `
        <div style="margin-bottom:8px; font-size: 12px;">
          <div style="font-weight:bold; text-transform: uppercase;">${escapeHtml(it.Item_description || it.item_desc)}</div>
          <div style="display:flex; justify-content:space-between;">
            <span>${it.QTY || it.qty} x ${Number(it.Unit_price || it.unit_price).toFixed(2)}</span>
            <span>${Number(it.Net_value || it.total).toFixed(2)}</span>
          </div>
          ${freeQty > 0 ? `<div style="font-size: 11px; color: #444;">(Free Issues: ${freeQty})</div>` : ''}
          ${itmDisc > 0 ? `<div style="font-size: 11px; color: #444;">(Item Disc: -${itmDisc.toFixed(2)})</div>` : ''}
        </div>`;
    }).join("");

    return `
    <html>
      <body style="font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 10px; color: #000;">
        <div style="text-align: center;">
          ${logoUri ? `<img src="${logoUri}" style="width: 80px; margin-bottom: 5px;" />` : ''}
          <div style="font-size: 18px; font-weight: bold;">BUDDIKA DISTRIBUTORS</div>
          <div style="font-size: 12px;">Tel: 0772957067</div>
          <div style="border: 1.5px solid #000; display: inline-block; padding: 4px 12px; margin: 10px 0; font-weight: bold;">BILL RECEIPT</div>
        </div>
        <div style="font-size: 11px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between;"><span>Date: ${bill?.Invoice_date || bill?.date}</span><span>Inv: ${invoiceNo}</span></div>
          <div>Customer: ${escapeHtml(customerDisplayName)}</div>
          <div>S.man: ${escapeHtml(bill?.Salesmen || bill?.salesman || "N/A")}</div>
        </div>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div>${itemsHtml}</div>
        <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
        <div style="font-size: 12px;">
            <div style="display: flex; justify-content: space-between;"><span>Sub Total</span><span>${subtotal.toFixed(2)}</span></div>
            ${itemDiscountTotal > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Item Discount</span><span>-${itemDiscountTotal.toFixed(2)}</span></div>` : ''}
            ${discountAmount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Bill Discount</span><span>-${discountAmount.toFixed(2)}</span></div>` : ''}
            ${vatAmount !== 0 ? `<div style="display: flex; justify-content: space-between;"><span>VAT</span><span>${vatAmount.toFixed(2)}</span></div>` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; border-top: 1px solid #000; margin-top: 5px; padding-top: 5px;">
                <span>NET TOTAL</span><span>Rs.${total.toFixed(2)}</span>
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px;">Thank You!</div>
      </body>
    </html>`;
  };

  const handlePrint = async () => {
  try {
    setPrinting(true);
    const asset = Asset.fromModule(logo);
    await asset.downloadAsync();
    const logoUri = asset.localUri || asset.uri;
    const finalHtml = buildThermalHtml(logoUri);

    // --- UPDATE THIS LINE BELOW ---
    const jobName = `BUDDIKA DISTRIBUTORS - Invoice (${invoiceNo})`; 
    // ------------------------------

    if (Platform.OS === "web") {
      const w = window.open(""); 
      w.document.write(finalHtml); 
      w.document.close(); 
      // Note: On web, the filename is usually handled by the browser's print dialog
      w.print();
    } else {
      await Print.printAsync({ html: finalHtml, jobName: jobName });
    }
  } catch (e) { 
    Alert.alert("Print Error", "Could not generate print."); 
  } finally { 
    setPrinting(false); 
  }
};

  const submitPayment = async () => {
    const amt = Number(amount || 0);
    if (due <= 0.5) { Alert.alert("Notice", "This bill is already fully paid."); return; }
    if (!amt || amt <= 0) { Alert.alert("Input", "Please enter a valid amount."); return; }

    try {
      setSubmitting(true);
      
      // Store current payment data for the success modal display
      setLastPaid(amt);
      setLastChange(Number(changeAmount || 0));

      await addPayment({
        invoice_no: invoiceNo,
        amount: amt,
        change_amount: Number(changeAmount || 0), 
        method,
        note,
      });

      setShowSuccess(true);
      setNote("");
      setPaidAmount(""); 
      setChangeAmount(0);
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
        <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.headerPrintBtn} 
                onPress={handlePrint} 
                disabled={printing}
            >
                {printing ? (
                    <ActivityIndicator size="small" color="#30a830" />
                ) : (
                    <MaterialCommunityIcons name="printer" size={22} color="#30a830" />
                )}
            </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Invoice Detail</Text>
        <Text style={styles.headerSub}>Transaction ID: {invoiceNo}</Text>
        <Text style={styles.headerSub1}>
          Salesman: {bill?.Salesmen || bill?.salesman || "—"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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

          {/* NET AMOUNT */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: "#0f172a", fontWeight: '700' }]}>Net Amount</Text>
            <Text style={[styles.totalValue, { fontSize: 18, color: "#0f172a" }]}>
              Rs. {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>

          {/* 1️⃣ INTEGRATED: AMOUNT PAID & CHANGE RETURNED (Only when Paid) */}
          {due <= 0.5 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Amount Paid</Text>
                <Text style={styles.totalValue}>
                  Rs. {paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Change</Text>
                <Text style={[styles.totalValue, { color: "#059669" }]}>
                  Rs. {(lastChange > 0 ? lastChange : 0).toFixed(2)}
                </Text>
              </View>
              <View style={[styles.divider, { marginVertical: 5 }]} />
            </>
          )}

          {/* BALANCE DUE */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: due <= 0.5 ? "#059669" : '#e11d48', fontWeight: '700' }]}>
              Balance Due
            </Text>
            <Text style={[styles.totalValue, { color: due <= 0.5 ? "#059669" : "#e11d48", fontSize: 20 }]}>
              Rs. {due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

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

            <View style={styles.paymentInputsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Paid Amount</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 0 }]}
                  value={paidAmount}
                  onChangeText={handlePaidAmountChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Change</Text>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      marginBottom: 0, 
                      backgroundColor: "#f1f5f9", 
                      color: '#059669', 
                      fontWeight: '700' 
                    }
                  ]}
                  value={String(changeAmount)}
                  editable={false}
                  placeholder="0.00"
                />
              </View>
            </View>

            <TextInput
              style={[styles.input, {marginTop: 10}]}
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

        {/* Inventory Items Section */}
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

      {/* SUCCESS MODAL */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modernCard}>
            <MaterialCommunityIcons name="check-decagram" size={70} color="#059669" />
            <Text style={styles.modernTitle}>Payment Success</Text>
            
            <View style={styles.modalSummaryBox}>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Amount Paid:</Text>
                <Text style={styles.modalSummaryValue}>Rs. {lastPaid.toFixed(2)}</Text>
              </View>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Change Returned:</Text>
                <Text style={[styles.modalSummaryValue, {color: '#059669'}]}>Rs. {lastChange.toFixed(2)}</Text>
              </View>
            </View>

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
    paddingTop: 50, 
    paddingBottom: 25,
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30 
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerPrintBtn: { backgroundColor: 'white', padding: 8, borderRadius: 25, elevation: 5 },
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
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '500' },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemCard: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  itemHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: 'center' },
  itemName: { fontWeight: "600", color: "#1e293b", fontSize: 14, flex: 1, marginRight: 10 },
  itemPrice: { fontWeight: "700", color: "#1e293b", fontSize: 14 },
  itemMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  metaPrice: { color: "#94a3b8", fontSize: 12, marginLeft: 'auto' },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  totalLabel: { color: "#64748b", fontSize: 14, fontWeight: '500' },
  totalValue: { fontWeight: "700", fontSize: 15, color: "#334155" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 15 },
  input: { backgroundColor: "#f8fafc", padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b', fontSize: 15 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4, marginLeft: 4 },
  paymentInputsRow: { flexDirection: "row", gap: 12, alignItems: 'flex-end' },
  methodRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  methodBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center", marginHorizontal: 3, backgroundColor: 'white' },
  methodBtnActive: { backgroundColor: "#30a830", borderColor: "#30a830" },
  methodText: { fontWeight: "600", fontSize: 12, color: "#475569" },
  submitBtn: { backgroundColor: "#30a830", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 5 },
  submitText: { color: "white", fontWeight: "700", letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.8)", justifyContent: "center", alignItems: "center" },
  modernCard: { backgroundColor: "white", borderRadius: 24, padding: 35, alignItems: "center", width: '85%' },
  modernTitle: { fontSize: 20, fontWeight: "700", color: "#1e293b", marginTop: 15 },
  modernMessage: { color: "#64748b", marginVertical: 15, textAlign: "center", lineHeight: 20 },
  modernDoneBtn: { backgroundColor: "#1e293b", paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  modernDoneText: { color: "white", fontWeight: "700" },
  modalSummaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 15,
    padding: 15,
    width: '100%',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4
  },
  modalSummaryLabel: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500'
  },
  modalSummaryValue: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '700'
  }
});