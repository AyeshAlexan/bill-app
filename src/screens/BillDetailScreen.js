import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
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

const BILL_API = "http://127.0.0.1:8000/api/bills";
const PAY_API = "http://127.0.0.1:8000/api/payments";

export default function BillDetailScreen({ route, navigation }) {
  const { billId } = route.params;

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [payLoading, setPayLoading] = useState(false);

  // ✅ Card fields
  const [cardHolder, setCardHolder] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [cardRef, setCardRef] = useState("");

  // ✅ Cheque fields
  const [chequeNo, setChequeNo] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [chequeDate, setChequeDate] = useState(""); // YYYY-MM-DD

  // ✅ success modal
  const [successVisible, setSuccessVisible] = useState(false);
  const [successText, setSuccessText] = useState("");

  useEffect(() => {
    fetchBill();
  }, []);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BILL_API}/${billId}`);
      setBill(res.data);
    } catch (e) {
      console.log("FETCH BILL ERROR:", e?.response?.data || e.message);
      Alert.alert("Error", "Failed to load bill details");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s) => {
    if (s === "Paid") return "#10b981";
    if (s === "Partial") return "#f59e0b";
    return "#ef4444";
  };

  const subtotal = useMemo(() => Number(bill?.subtotal || 0), [bill]);
  const vatAmount = useMemo(() => Number(bill?.vat_amount || 0), [bill]);
  const extraTax = useMemo(() => Number(bill?.additional_tax || 0), [bill]);

  const totalAmount = useMemo(() => Number(bill?.total_amount || 0), [bill]);
  const dueAmount = useMemo(() => Number(bill?.due_amount || 0), [bill]);

  const paidSoFar = useMemo(
    () => Math.max(totalAmount - dueAmount, 0),
    [totalAmount, dueAmount],
  );

  const resetMethodFields = (method) => {
    if (method !== "Card") {
      setCardHolder("");
      setCardLast4("");
      setCardRef("");
    }
    if (method !== "Cheque") {
      setChequeNo("");
      setChequeBank("");
      setChequeDate("");
    }
  };

  const validateMethodFields = () => {
    if (payMethod === "Card") {
      if (!cardHolder.trim()) return "Enter card holder name";
      if (!/^\d{4}-\d{4}-\d{4}-\d{4}$/.test(cardLast4.trim()))
        return "Card number must be in format XXXX-XXXX-XXXX-XXXX";
      if (!cardRef.trim()) return "Enter card reference/transaction id";
    }

    if (payMethod === "Cheque") {
      if (!chequeNo.trim()) return "Enter cheque number";
      if (!chequeBank.trim()) return "Enter bank name";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(chequeDate.trim()))
        return "Cheque date must be YYYY-MM-DD";
    }

    return null;
  };

  const onSubmitPayment = async () => {
    if (!bill) return;

    const pay = parseFloat(payAmount);
    if (Number.isNaN(pay) || pay <= 0) {
      Alert.alert("Validation", "Enter a valid payment amount");
      return;
    }

    if (pay > dueAmount) {
      Alert.alert("Validation", "Payment cannot be greater than Due Amount");
      return;
    }

    const methodErr = validateMethodFields();
    if (methodErr) {
      Alert.alert("Validation", methodErr);
      return;
    }

    try {
      setPayLoading(true);

      let userId = null;
      try {
        const userStr = await AsyncStorage.getItem("user");
        const userObj = userStr ? JSON.parse(userStr) : null;
        userId = userObj?.id ?? null;
      } catch (_) {}

      const beforeDue = dueAmount;

      const payload = {
        bill_id: bill.id,
        user_id: userId,
        amount: pay,
        method: payMethod,
      };

      // ✅ attach details based on method
      if (payMethod === "Card") {
        payload.card_holder_name = cardHolder.trim();
        payload.card_last4 = cardLast4.trim();
        payload.card_ref = cardRef.trim();
      }

      if (payMethod === "Cheque") {
        payload.cheque_no = chequeNo.trim();
        payload.cheque_bank = chequeBank.trim();
        payload.cheque_date = chequeDate.trim();
      }

      await axios.post(PAY_API, payload);

      await fetchBill();

      const afterDue = Math.max(beforeDue - pay, 0);

      setPayAmount("");
      resetMethodFields("Cash"); // clear all
      setPayMethod("Cash");

      setSuccessText(
        `You paid Rs.${pay.toFixed(2)}\nRemaining due Rs.${afterDue.toFixed(2)}`,
      );
      setSuccessVisible(true);
      setTimeout(() => setSuccessVisible(false), 1600);
    } catch (e) {
      console.log("PAYMENT ERROR:", e?.response?.data || e.message);
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 422 ? "Validation error" : "Payment failed");
      Alert.alert("Error", msg);
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#00b894" />
      </View>
    );
  }

  if (!bill) {
    return (
      <View
        style={[styles.container, { justifyContent: "center", padding: 20 }]}
      >
        <Text>Bill not found</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Bill Details</Text>
          <Text style={styles.headerSub}>{bill?.shop?.name || "—"}</Text>
        </View>

        <View style={styles.content}>
          {/* BILL CARD */}
          <View style={styles.card}>
            <View style={styles.billTop}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons
                  name="file-document"
                  size={24}
                  color="#3b82f6"
                />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.billNo}>Bill #{bill.bill_number}</Text>
                <Text style={styles.date}>{bill.bill_date}</Text>
              </View>

              <View
                style={[styles.statusBadge, { backgroundColor: "#f1f5f9" }]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: statusColor(bill.status) },
                  ]}
                >
                  {bill.status}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Items</Text>

            {(bill.items || []).map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <View>
                  <Text style={styles.itemName}>{it.item_name}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  Rs.{Number(it.price).toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>Rs.{subtotal.toFixed(2)}</Text>
            </View>

            {/* VAT might be 0 if disabled */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT (15%)</Text>
              <Text style={styles.totalValue}>Rs.{vatAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Additional Tax</Text>
              <Text style={styles.totalValue}>Rs.{extraTax.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>Rs.{totalAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Due Amount</Text>
              <Text style={[styles.totalValue, { color: "#ef4444" }]}>
                Rs.{dueAmount.toFixed(2)}
              </Text>
            </View>

            {paidSoFar > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Paid Amount</Text>
                <Text style={[styles.totalValue, { color: "#10b981" }]}>
                  Rs.{paidSoFar.toFixed(2)}
                </Text>
              </View>
            )}
          </View>

          {/* PAYMENT CARD */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Collect Payment</Text>

            <Text style={styles.inputLabel}>Payment Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
            />

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.methodRow}>
              {["Cash", "Card", "Cheque"].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.methodBtn,
                    payMethod === m && styles.methodBtnActive,
                  ]}
                  onPress={() => {
                    setPayMethod(m);
                    resetMethodFields(m);
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.methodText,
                      payMethod === m && styles.methodTextActive,
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ✅ Card details */}
            {payMethod === "Card" && (
              <View style={styles.detailBox}>
                <Text style={styles.detailTitle}>Card Details</Text>

                <Text style={styles.inputLabel}>Card Holder Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Name on card"
                  value={cardHolder}
                  onChangeText={setCardHolder}
                />

                <Text style={styles.inputLabel}>Last 4 Digits</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1234"
                  keyboardType="numeric"
                  maxLength={4}
                  value={cardLast4}
                  onChangeText={setCardLast4}
                />

                <Text style={styles.inputLabel}>Transaction Reference</Text>
                <TextInput
                  style={styles.input}
                  placeholder="REF-XXXX"
                  value={cardRef}
                  onChangeText={setCardRef}
                />
              </View>
            )}

            {/* ✅ Cheque details */}
            {payMethod === "Cheque" && (
              <View style={styles.detailBox}>
                <Text style={styles.detailTitle}>Cheque Details</Text>

                <Text style={styles.inputLabel}>Cheque Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Cheque No"
                  value={chequeNo}
                  onChangeText={setChequeNo}
                />

                <Text style={styles.inputLabel}>Bank Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Bank"
                  value={chequeBank}
                  onChangeText={setChequeBank}
                />

                <Text style={styles.inputLabel}>Cheque Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-01-19"
                  value={chequeDate}
                  onChangeText={setChequeDate}
                />
              </View>
            )}

            <View style={styles.noteBox}>
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color="#64748b"
              />
              <Text style={styles.noteText}>
                VAT is already included in this bill. Payment will reduce only
                the Due Amount.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (payLoading || dueAmount <= 0) && { opacity: 0.7 },
              ]}
              onPress={onSubmitPayment}
              disabled={payLoading || dueAmount <= 0}
              activeOpacity={0.85}
            >
              {payLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitText}>
                  {dueAmount <= 0 ? "Bill Already Paid" : "Submit Payment"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ✅ SUCCESS MODAL */}
      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check" size={30} color="white" />
            </View>
            <Text style={styles.successTitle}>Payment Done</Text>
            <Text style={styles.successMsg}>{successText}</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#00b894",
    padding: 30,
    paddingTop: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "bold" },
  headerSub: { color: "white", opacity: 0.8 },
  content: { padding: 20 },

  card: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },

  billTop: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  iconBox: { backgroundColor: "#dbeafe", padding: 10, borderRadius: 15 },
  billNo: { fontSize: 16, fontWeight: "bold" },
  date: { color: "#94a3b8", fontSize: 12 },
  statusBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { color: "#ef4444", fontSize: 10, fontWeight: "bold" },

  sectionLabel: { fontSize: 14, fontWeight: "bold", marginBottom: 15 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  itemName: { fontWeight: "500" },
  itemPrice: { fontWeight: "bold" },

  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  totalLabel: { color: "#64748b" },
  totalValue: { fontWeight: "bold", fontSize: 16 },

  cardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },

  inputLabel: { fontSize: 13, color: "#64748b", marginBottom: 8 },
  input: {
    backgroundColor: "#f1f5f9",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },

  methodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    alignItems: "center",
    marginHorizontal: 4,
  },
  methodBtnActive: { backgroundColor: "#0061ff", borderColor: "#0061ff" },
  methodText: { color: "#64748b", fontWeight: "600" },
  methodTextActive: { color: "white", fontWeight: "700" },

  // ✅ NEW detail box styles (small addition)
  detailBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  detailTitle: { fontWeight: "800", color: "#0f172a", marginBottom: 10 },

  submitBtn: {
    backgroundColor: "#0061ff",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  submitText: { color: "white", fontSize: 18, fontWeight: "bold" },

  noteBox: {
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  noteText: {
    marginLeft: 10,
    color: "#64748b",
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  successCard: {
    backgroundColor: "white",
    borderRadius: 22,
    padding: 22,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  successIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  successTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  successMsg: {
    marginTop: 8,
    textAlign: "center",
    color: "#475569",
    lineHeight: 18,
  },
});
