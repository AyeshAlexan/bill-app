import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// API SERVICES
import { addPayment, getBillById, processReturn } from "../services/billApi";

// PRINTING IMPORTS
import { Asset } from "expo-asset";
import * as Print from "expo-print";
import logo from "../assets/bill-logo.png";

// Helper for escaping HTML special characters in the print template
const escapeHtml = (str) => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Data normalization helpers
const totalOf = (b) =>
  Number(
    b?.total_amount ??
      b?.after_vat_amount ??
      b?.Net_Amount ??
      b?.Gross_Amount ??
      0,
  );

const paidOf = (b) => Number(b?.Paid_Amount ?? b?.paid_amount ?? 0);

const returnedQtyOf = (it) => Number(it.return_qty ?? it.Return_Qty ?? 0);

const returnedAmountOf = (it) =>
  Number(it.return_qty ?? 0) * Number(it.Unit_price || it.unit_price || 0);

export default function BillDetailScreen({ route, navigation }) {
  const { invoiceNo } = route.params;

  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Payment State
  const [method, setMethod] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [changeAmount, setChangeAmount] = useState(0);

  // Status State
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastPaid, setLastPaid] = useState(0);
  const [lastChange, setLastChange] = useState(0);

  // Return State
  const [returnModal, setReturnModal] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [processingReturn, setProcessingReturn] = useState(false);

  // ---------------- SUMMARY CALCULATIONS ----------------

  const subtotal = useMemo(
    () =>
      Number(
        bill?.subtotal ??
          bill?.Gross_Amount ??
          bill?.gross_amount ??
          bill?.Sub_Total ??
          0,
      ),
    [bill],
  );

  const vatAmount = useMemo(
    () => Number(bill?.vat_amount ?? bill?.Vat_Amount ?? bill?.Vat ?? 0),
    [bill],
  );

  const additionalAmount = useMemo(
    () =>
      Number(
        bill?.additional_amount ??
          bill?.Additional_Amount ??
          bill?.Other_Charges ??
          0,
      ),
    [bill],
  );

  const total = useMemo(() => totalOf(bill), [bill]);
  const paid = useMemo(() => paidOf(bill), [bill]);
  const due = useMemo(() => Math.max(total - paid, 0), [total, paid]);

  const totalReturnAmount = useMemo(() => {
    return items.reduce((sum, it) => {
      return sum + returnedAmountOf(it);
    }, 0);
  }, [items]);

  const itemDiscountTotal = useMemo(() => {
    return items.reduce((sum, it) => {
      return (
        sum +
        Number(
          it.Discount ??
            it.discount ??
            it.disc_amount ??
            it.Discount_Amount ??
            0,
        )
      );
    }, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    const combined = Number(
      bill?.bill_discount ??
        bill?.Discount_Amount ??
        bill?.discount_amount ??
        bill?.Discount ??
        0,
    );
    return Math.max(combined - itemDiscountTotal, 0);
  }, [bill, itemDiscountTotal]);

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

  // ---------------- RETURN LOGIC ----------------

  const openReturnModal = () => {
    const mapped = items.map((it) => {
      const totalQty = it.QTY || it.qty;
      const alreadyReturned = returnedQtyOf(it);
      const availableQty = totalQty - alreadyReturned;

      return {
        item_code: it.Item_code || it.item_code,
        name: it.Item_description || it.item_desc,
        qty: 0,
        maxQty: availableQty,
        alreadyReturned,
        unit_price: it.Unit_price || it.unit_price,
        reason: "",
      };
    });

    setReturnItems(mapped);
    setReturnModal(true);
  };

  const updateReturnQty = (index, value) => {
    const updated = [...returnItems];
    const val = Number(value || 0);

    if (val <= updated[index].maxQty) {
      updated[index].qty = val;
    } else {
      Alert.alert(
        "Limit Exceeded",
        "Cannot return more than available quantity",
      );
    }

    setReturnItems(updated);
  };

  const submitReturn = async () => {
    const filtered = returnItems.filter((it) => it.qty > 0);
    if (filtered.length === 0) {
      Alert.alert("Error", "No items selected for return");
      return;
    }

    try {
      setProcessingReturn(true);
      await processReturn({
        invoice_no: invoiceNo,
        items: filtered.map((it) => ({
          item_code: it.item_code,
          qty: it.qty,
          unit_price: it.unit_price,
          reason: it.reason || "Damaged",
        })),
      });
      Alert.alert("Success", "Return processed successfully");
      setReturnModal(false);
      await load();
    } catch (e) {
      Alert.alert("Error", "Return failed to process");
    } finally {
      setProcessingReturn(false);
    }
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
      const defaultAmt =
        currentDue > 0 ? String(currentDue.toFixed(2)) : "0.00";

      setAmount(defaultAmt);
      setPaidAmount(defaultAmt);
      setChangeAmount(0);
    } catch (e) {
      Alert.alert("Error", "Could not load bill details");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [invoiceNo]),
  );

  // ---------------- PRINT LOGIC ----------------

  const buildThermalHtml = (logoUri) => {
    const customerName =
      bill?.Customer_Name ||
      bill?.Customer_name ||
      bill?.shop_name ||
      "Valued Customer";
    const itemsHtml = items
      .map((it) => {
        const freeQty = it.Free_Issues ?? it.free_issues ?? 0;
        const itmDisc = Number(
          it.Discount ??
            it.discount ??
            it.disc_amount ??
            it.Discount_Amount ??
            0,
        );
        const returnedQty = returnedQtyOf(it);
        const returnedAmount = returnedAmountOf(it);
        return `
        <div style="margin-bottom:8px; font-size: 13pt;">
          <div style="font-weight:bold; text-transform: uppercase;">${escapeHtml(it.Item_description || it.item_desc)}</div>
          <div style="display:flex; justify-content:space-between;">
            <span>${it.QTY || it.qty} x ${Number(it.Unit_price || it.unit_price).toFixed(2)}</span>
            <span>${Number(it.Net_value || it.total).toFixed(2)}</span>
          </div>
          ${freeQty > 0 ? `<div style="font-size: 12px; color: #444;">(Free Issues: ${freeQty})</div>` : ""}
          ${itmDisc > 0 ? `<div style="font-size: 12px; color: #444;">(Item Disc: -${itmDisc.toFixed(2)})</div>` : ""}
          ${returnedQty > 0 ? `<div style="font-size: 12px; color: #c2410c;">(Returned: ${returnedQty} | -${returnedAmount.toFixed(2)})</div>` : ""}
        </div>`;
      })
      .join("");

    return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 300px; 
            margin: 0 auto; 
            padding: 10px; 
            color: #000;
            font-size: 14pt;
          }
          .header { text-align: center; }
          .logo { width: 80px; margin-bottom: 5px; }
          .title { font-size: 18px; font-weight: bold; }
          .subtitle { font-size: 12px; }
          .info { font-size: 14pt; margin-top: 10px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .items-section { font-size: 13pt; }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .grand-total { 
            font-size: 18pt;
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 10px;
          }
          .footer { text-align: center; margin-top: 20px; font-size: 12pt; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoUri ? `<img src="${logoUri}" class="logo" />` : ""}
          <div class="title">BUDDIKA DISTRIBUTORS</div>
          <div class="subtitle">Tel: 0772957067</div>
          <div style="border: 1.5px solid #000; display: inline-block; padding: 4px 12px; margin: 10px 0; font-weight: bold;">BILL RECEIPT</div>
        </div>
        <div class="info divider">
          <div style="display: flex; justify-content: space-between;"><span>Date: ${bill?.Invoice_date || bill?.date}</span><span>Inv: ${invoiceNo}</span></div>
          <div>Customer: ${escapeHtml(customerName)}</div>
          <div>S.man: ${escapeHtml(bill?.Salesmen || bill?.salesman || "N/A")}</div>
        </div>
        <div class="items-section">
          ${itemsHtml}
        </div>
        <div class="divider"></div>
        <div>
            ${(() => {
              const finalTotal =
                subtotal -
                itemDiscountTotal -
                discountAmount +
                vatAmount +
                additionalAmount -
                totalReturnAmount;
              return `
            <div class="total-row">
              <span>Sub Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            ${itemDiscountTotal > 0 ? `<div class="total-row"><span>Item Discount</span><span>-${itemDiscountTotal.toFixed(2)}</span></div>` : ""}
            ${discountAmount > 0 ? `<div class="total-row"><span>Bill Discount</span><span>-${discountAmount.toFixed(2)}</span></div>` : ""}
            ${vatAmount !== 0 ? `<div class="total-row"><span>VAT</span><span>${vatAmount.toFixed(2)}</span></div>` : ""}
            ${additionalAmount !== 0 ? `<div class="total-row"><span>Additional</span><span>+${additionalAmount.toFixed(2)}</span></div>` : ""}
            ${totalReturnAmount > 0 ? `<div class="total-row"><span>Total Returns</span><span>-${totalReturnAmount.toFixed(2)}</span></div>` : ""}
            <div class="total-row grand-total">
                <span>NET TOTAL</span>
                <span>Rs.${finalTotal.toFixed(2)}</span>
            </div>`;
            })()}
        </div>
        <div class="footer">Thank You!</div>
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
      const jobName = `BUDDIKA_DISTRIBUTORS_INV_${invoiceNo}`;

      if (Platform.OS === "web") {
        const w = window.open("");
        w.document.write(finalHtml);
        w.document.close();
        w.print();
      } else {
        await Print.printAsync({ html: finalHtml, jobName: jobName });
      }
    } catch (e) {
      Alert.alert("Print Error", "Could not generate print document.");
    } finally {
      setPrinting(false);
    }
  };

  const submitPayment = async () => {
    const amt = Number(amount || 0);
    if (due <= 0.5) {
      Alert.alert("Notice", "This bill is already fully paid.");
      return;
    }
    if (!amt || amt <= 0) {
      Alert.alert("Input", "Please enter a valid amount.");
      return;
    }

    try {
      setSubmitting(true);
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#30a830" />
      <View style={styles.container}>
        {/* Header */}
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
              style={styles.headerPrintBtn}
              onPress={handlePrint}
              disabled={printing}
            >
              {printing ? (
                <ActivityIndicator size="small" color="#30a830" />
              ) : (
                <MaterialCommunityIcons
                  name="printer"
                  size={22}
                  color="#30a830"
                />
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
          {/* Summary Card */}
<View style={styles.card}>
  <View style={styles.billTop}>
    <View style={styles.iconBox}>
      <MaterialCommunityIcons
        name="file-document-outline"
        size={24}
        color="#334155"
      />
    </View>
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={styles.billNo}>
        Invoice: {bill?.Invoice_no || bill?.invoice_no}
      </Text>
      <Text style={styles.date}>
        {bill?.Invoice_date || bill?.date || "—"}
      </Text>
    </View>
    <View
      style={[
        styles.badge,
        { backgroundColor: due <= 0.5 ? "#dcfce7" : "#fee2e2" },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: due <= 0.5 ? "#166534" : "#991b1b" },
        ]}
      >
        {due <= 0.5 ? "PAID" : "PENDING"}
      </Text>
    </View>
  </View>

  <View style={styles.divider} />

  {/* 1. Gross Subtotal */}
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>Gross Subtotal</Text>
    <Text style={styles.totalValue}>Rs. {subtotal.toFixed(2)}</Text>
  </View>

  {/* Additional Amount (Optional - kept for record accuracy) */}
  {additionalAmount !== 0 && (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Additional</Text>
      <Text style={styles.totalValue}>+ {additionalAmount.toFixed(2)}</Text>
    </View>
  )}

  {/* 2. Discounts */}
  {itemDiscountTotal > 0 && (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Item Discount</Text>
      <Text style={[styles.totalValue, { color: "#be123c" }]}>
        - {itemDiscountTotal.toFixed(2)}
      </Text>
    </View>
  )}
  {discountAmount > 0 && (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Bill Discount</Text>
      <Text style={[styles.totalValue, { color: "#be123c" }]}>
        - {discountAmount.toFixed(2)}
      </Text>
    </View>
  )}

  {/* 3. VAT */}
  {vatAmount !== 0 && (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>
        VAT ({bill?.vat_percent || 18}%)
      </Text>
      <Text style={styles.totalValue}>+ {vatAmount.toFixed(2)}</Text>
    </View>
  )}

  {/* 4. Original Amount */}
  {bill?.old_amount && bill.old_amount > total && (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, { color: "#64748b" }]}>
        Original Amount
      </Text>
      <Text style={[styles.totalValue, { textDecorationLine: "line-through", color: "#94a3b8" }]}>
        Rs. {Number(bill.old_amount).toFixed(2)}
      </Text>
    </View>
  )}

  {/* 5. Total Returns */}
  {totalReturnAmount > 0 && (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, { color: "#c2410c" }]}>
        Total Returns
      </Text>
      <Text style={[styles.totalValue, { color: "#c2410c" }]}>
        - Rs. {totalReturnAmount.toFixed(2)}
      </Text>
    </View>
  )}

  <View style={[styles.divider, { marginVertical: 10 }]} />

  {/* 6. Net Amount (FINAL) */}
  <View style={styles.totalRow}>
    <Text
      style={[
        styles.totalLabel,
        { color: "#0f172a", fontWeight: "700" },
      ]}
    >
      Net Amount (Final)
    </Text>
    <Text
      style={[styles.totalValue, { fontSize: 18, color: "#0f172a" }]}
    >
      Rs.{" "}
      {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </Text>
  </View>

  {/* 7. Balance Due */}
  <View style={styles.totalRow}>
    <Text
      style={[
        styles.totalLabel,
        {
          color: due <= 0.5 ? "#059669" : "#e11d48",
          fontWeight: "700",
        },
      ]}
    >
      Balance Due
    </Text>
    <Text
      style={[
        styles.totalValue,
        { color: due <= 0.5 ? "#059669" : "#e11d48", fontSize: 20 },
      ]}
    >
      Rs.{" "}
      {due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </Text>
  </View>
</View>

          {/* Payment Input Card */}
          {due > 0.5 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Record Payment</Text>
              <View style={styles.methodRow}>
                {["Cash", "Card", "Cheque", "Bank"].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.methodBtn,
                      method === m && styles.methodBtnActive,
                    ]}
                    onPress={() => setMethod(m)}
                  >
                    <Text
                      style={[
                        styles.methodText,
                        method === m && { color: "white" },
                      ]}
                    >
                      {m}
                    </Text>
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
                        color: "#059669",
                        fontWeight: "700",
                      },
                    ]}
                    value={String(changeAmount)}
                    editable={false}
                    placeholder="0.00"
                  />
                </View>
              </View>

              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                value={note}
                onChangeText={setNote}
                placeholder="Reference Note (Optional)"
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  submitting && { backgroundColor: "#94a3b8" },
                ]}
                onPress={submitPayment}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitText}>CONFIRM PAYMENT</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Inventory Items Card */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Inventory Items</Text>
            {items.length > 0 ? (
              items.map((it, idx) => {
                const itemDisc = Number(
                  it.Discount ??
                    it.discount ??
                    it.disc_amount ??
                    it.Discount_Amount ??
                    0,
                );
                const returnedQty = returnedQtyOf(it);
                const returnedAmount = returnedAmountOf(it);
                return (
                  <View key={idx} style={styles.itemCard}>
                    <View style={styles.itemHeaderRow}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {it.Item_description || it.item_desc || "Item"}
                      </Text>
                      <Text style={styles.itemPrice}>
                        Rs. {Number(it.Net_value || it.total || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.itemMetaRow}>
                      <View style={styles.itemBadge}>
                        <Text style={styles.badgeText}>
                          Qty: {it.QTY || it.qty}
                        </Text>
                      </View>
                      {(it.Free_Issues > 0 || it.free_issues > 0) && (
                        <View
                          style={[
                            styles.itemBadge,
                            { backgroundColor: "#f0f9ff" },
                          ]}
                        >
                          <Text
                            style={[styles.badgeText, { color: "#0369a1" }]}
                          >
                            Free: {it.Free_Issues ?? it.free_issues ?? 0}
                          </Text>
                        </View>
                      )}
                      {itemDisc > 0 && (
                        <View
                          style={[
                            styles.itemBadge,
                            { backgroundColor: "#fff1f2" },
                          ]}
                        >
                          <Text
                            style={[styles.badgeText, { color: "#be123c" }]}
                          >
                            Disc: {itemDisc.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      {returnedQty > 0 && (
                        <View
                          style={[
                            styles.itemBadge,
                            { backgroundColor: "#fff7ed" },
                          ]}
                        >
                          <Text
                            style={[styles.badgeText, { color: "#c2410c" }]}
                          >
                            Returned: {returnedQty}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.metaPrice}>
                        @{" "}
                        {Number(it.Unit_price || it.unit_price || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={{ textAlign: "center", color: "#64748b" }}>
                No items found
              </Text>
            )}

            <TouchableOpacity
              style={[styles.returnBtn, { marginTop: 20 }]}
              onPress={openReturnModal}
            >
              <MaterialCommunityIcons
                name="backup-restore"
                size={20}
                color="white"
              />
              <Text style={styles.returnText}>Process Return</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Payment Success Modal */}
        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modernCard}>
              <MaterialCommunityIcons
                name="check-decagram"
                size={70}
                color="#059669"
              />
              <Text style={styles.modernTitle}>Payment Success</Text>
              <View style={styles.modalSummaryBox}>
                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>Amount Paid:</Text>
                  <Text style={styles.modalSummaryValue}>
                    Rs. {lastPaid.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>Change Returned:</Text>
                  <Text
                    style={[styles.modalSummaryValue, { color: "#059669" }]}
                  >
                    Rs. {lastChange.toFixed(2)}
                  </Text>
                </View>
              </View>
              <Text style={styles.modernMessage}>
                The payment for invoice #{invoiceNo} has been recorded.
              </Text>
              <TouchableOpacity
                style={styles.modernDoneBtn}
                onPress={() => setShowSuccess(false)}
              >
                <Text style={styles.modernDoneText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Return Items Modal */}
        <Modal visible={returnModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modernCard, { width: "95%", maxHeight: "85%" }]}
            >
              <Text style={styles.cardTitle}>Return Items</Text>
              <ScrollView style={{ width: "100%" }}>
                {returnItems.map((it, index) => (
                  <View
                    key={index}
                    style={{
                      marginBottom: 15,
                      borderBottomWidth: 1,
                      borderBottomColor: "#f1f5f9",
                      paddingBottom: 10,
                    }}
                  >
                    <Text style={{ fontWeight: "600", color: "#1e293b" }}>
                      {it.name}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 8,
                      }}
                    >
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        keyboardType="numeric"
                        placeholder="Qty"
                        value={String(it.qty)}
                        onChangeText={(val) => updateReturnQty(index, val)}
                      />
                      <Text
                        style={{
                          marginLeft: 10,
                          color: "#64748b",
                          fontWeight: "600",
                        }}
                      >
                        / {it.maxQty}
                      </Text>
                    </View>
                    <Text
                      style={{ marginTop: 4, color: "#dc2626", fontSize: 12 }}
                    >
                      Already Returned: {it.alreadyReturned}
                    </Text>
                    <TextInput
                      style={[styles.input, { marginTop: 8, marginBottom: 0 }]}
                      placeholder="Reason (Damaged / Expired)"
                      value={it.reason}
                      onChangeText={(val) => {
                        const updated = [...returnItems];
                        updated[index].reason = val;
                        setReturnItems(updated);
                      }}
                    />
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.submitBtn, { width: "100%", marginTop: 20 }]}
                onPress={submitReturn}
                disabled={processingReturn}
              >
                {processingReturn ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitText}>CONFIRM RETURN</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: "#64748b", marginTop: 10, width: "100%" },
                ]}
                onPress={() => setReturnModal(false)}
              >
                <Text style={styles.submitText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#30a830" },
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  header: {
    backgroundColor: "#30a830",
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerPrintBtn: {
    backgroundColor: "white",
    padding: 8,
    borderRadius: 25,
    elevation: 5,
  },
  headerTitle: { color: "white", fontSize: 25.5, fontWeight: "700" },
  headerSub: { color: "white", fontSize: 13, marginTop: 4, fontWeight: "700" },
  headerSub1: {
    color: "white",
    fontSize: 12.5,
    marginTop: 4,
    fontWeight: "500",
  },
  content: { padding: 15 },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  billTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  iconBox: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  billNo: { fontSize: 15, fontWeight: "700", color: "#334155" },
  date: { color: "#64748b", fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  itemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    marginRight: 5,
  },
  badgeText: { fontSize: 10, fontWeight: "600" },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: {
    fontWeight: "600",
    color: "#1e293b",
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  itemPrice: { fontWeight: "700", color: "#1e293b", fontSize: 14 },
  itemMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  metaPrice: { color: "#94a3b8", fontSize: 12, marginLeft: "auto" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 12 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: { color: "#64748b", fontSize: 14, fontWeight: "500" },
  totalValue: { fontWeight: "700", fontSize: 15, color: "#334155" },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 15,
  },
  input: {
    backgroundColor: "#f8fafc",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    color: "#1e293b",
    fontSize: 15,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
    marginLeft: 4,
  },
  paymentInputsRow: { flexDirection: "row", gap: 12, alignItems: "flex-end" },
  methodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    marginHorizontal: 3,
    backgroundColor: "white",
  },
  methodBtnActive: { backgroundColor: "#30a830", borderColor: "#30a830" },
  methodText: { fontWeight: "600", fontSize: 12, color: "#475569" },
  submitBtn: {
    backgroundColor: "#30a830",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5,
  },
  submitText: { color: "white", fontWeight: "700", letterSpacing: 0.5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modernCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 25,
    alignItems: "center",
    width: "85%",
  },
  modernTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 15,
  },
  modernMessage: {
    color: "#64748b",
    marginVertical: 15,
    textAlign: "center",
    lineHeight: 20,
  },
  modernDoneBtn: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  modernDoneText: { color: "white", fontWeight: "700" },
  modalSummaryBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 15,
    padding: 15,
    width: "100%",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  modalSummaryLabel: { color: "#64748b", fontSize: 14, fontWeight: "500" },
  modalSummaryValue: { color: "#1e293b", fontSize: 14, fontWeight: "700" },
  returnBtn: {
    flexDirection: "row",
    backgroundColor: "#f59e0b",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  returnText: { color: "white", fontWeight: "700", marginLeft: 8 },
});
