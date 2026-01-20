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

  // ✅ Card fields (FULL)
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState(""); // 1234-5678-9012-3456
  const [cardExpiry, setCardExpiry] = useState(""); // MM/YY
  const [cardRef, setCardRef] = useState("");

  // ✅ Cheque fields
  const [chequeNo, setChequeNo] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [chequeDate, setChequeDate] = useState(""); // YYYY-MM-DD

  const [successVisible, setSuccessVisible] = useState(false);
  const [successText, setSuccessText] = useState("");

  // ✅ Error message state
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorText, setErrorText] = useState("");

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

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    const parts = digits.match(/.{1,4}/g) || [];
    return parts.join("-");
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 4); // MMYY
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const isValidExpiry = (mmYY) => {
    if (!/^\d{2}\/\d{2}$/.test(mmYY)) return false;
    const [mm, yy] = mmYY.split("/").map(Number);
    if (mm < 1 || mm > 12) return false;

    const now = new Date();
    const curYY = now.getFullYear() % 100;
    const curMM = now.getMonth() + 1;

    if (yy < curYY) return false;
    if (yy === curYY && mm < curMM) return false;
    return true;
  };

  const resetMethodFields = (method) => {
    if (method !== "Card") {
      setCardHolder("");
      setCardNumber("");
      setCardExpiry("");
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
      // Check card holder name
      if (!cardHolder || !cardHolder.trim()) {
        return "❌ Please enter card holder name";
      }

      // Check card number is not empty
      if (!cardNumber || !cardNumber.trim()) {
        return "❌ Please enter card number";
      }

      // Check card number format
      if (!/^\d{4}-\d{4}-\d{4}-\d{4}$/.test(cardNumber.trim())) {
        return "❌ Card number must be 16 digits in format: 1234-5678-9012-3456";
      }

      // Check expiry is not empty
      if (!cardExpiry || !cardExpiry.trim()) {
        return "❌ Please enter expiry date";
      }

      // Check expiry format and validity
      if (!isValidExpiry(cardExpiry.trim())) {
        return "❌ Expiry date must be valid in MM/YY format and not expired";
      }

      // Check transaction reference
      if (!cardRef || !cardRef.trim()) {
        return "❌ Please enter transaction reference";
      }

      return null;
    }

    if (payMethod === "Cheque") {
      // Check cheque number
      if (!chequeNo || !chequeNo.trim()) {
        return "❌ Please enter cheque number";
      }

      // Check bank name
      if (!chequeBank || !chequeBank.trim()) {
        return "❌ Please enter bank name";
      }

      // Check cheque date is not empty
      if (!chequeDate || !chequeDate.trim()) {
        return "❌ Please enter cheque date";
      }

      // Check cheque date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(chequeDate.trim())) {
        return "❌ Cheque date must be in YYYY-MM-DD format (e.g., 2026-01-19)";
      }

      return null;
    }

    return null;
  };

  const onSubmitPayment = async () => {
    if (!bill) return;

    console.log("🔍 PAYMENT SUBMISSION STARTED");
    console.log("Payment Amount:", payAmount);
    console.log("Pay Method:", payMethod);
    console.log("Due Amount:", dueAmount);

    // Check payment amount
    if (!payAmount || payAmount.trim() === "") {
      console.log("❌ Empty payment amount");
      setErrorText("Please enter a payment amount");
      setErrorVisible(true);
      setTimeout(() => setErrorVisible(false), 3000);
      return;
    }

    const pay = parseFloat(payAmount);
    if (Number.isNaN(pay) || pay <= 0) {
      console.log("❌ Invalid payment amount:", payAmount);
      setErrorText("Please enter a valid payment amount greater than 0");
      setErrorVisible(true);
      setTimeout(() => setErrorVisible(false), 3000);
      return;
    }

    if (pay > dueAmount) {
      console.log("❌ Payment exceeds due amount");
      setErrorText(
        `Payment cannot exceed due amount of Rs.${dueAmount.toFixed(2)}`,
      );
      setErrorVisible(true);
      setTimeout(() => setErrorVisible(false), 3000);
      return;
    }

    // Validate payment method specific fields BEFORE submitting
    const methodErr = validateMethodFields();
    console.log("Method validation result:", methodErr);
    if (methodErr) {
      setErrorText(methodErr);
      setErrorVisible(true);
      setTimeout(() => setErrorVisible(false), 3500);
      return;
    }

    console.log("✅ All validations passed, submitting payment...");

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

      if (payMethod === "Card") {
        payload.card_holder_name = cardHolder.trim();
        payload.card_number = cardNumber.trim(); // ✅ correct key
        payload.card_expiry = cardExpiry.trim(); // ✅ correct key
        payload.card_ref = cardRef.trim();
      }

      if (payMethod === "Cheque") {
        payload.cheque_no = chequeNo.trim();
        payload.cheque_bank = chequeBank.trim();
        payload.cheque_date = chequeDate.trim();
      }

      console.log("Submitting payment with payload:", payload);
      const res = await axios.post(PAY_API, payload);
      console.log("Payment response:", res.data);

      await fetchBill();

      const afterDue = Math.max(beforeDue - pay, 0);

      setPayAmount("");
      resetMethodFields("Cash");
      setPayMethod("Cash");

      setSuccessText(
        `✅ Payment Successful!\nYou paid Rs.${pay.toFixed(2)}\nRemaining due Rs.${afterDue.toFixed(2)}`,
      );
      setSuccessVisible(true);
      setTimeout(() => setSuccessVisible(false), 1600);
    } catch (e) {
      console.log("PAYMENT ERROR - Response:", e?.response?.data);
      console.log("PAYMENT ERROR - Message:", e.message);
      console.log("PAYMENT ERROR - Full Error:", e);

      // ✅ show laravel validation messages if any
      const laravelErrors = e?.response?.data?.errors;
      if (laravelErrors) {
        const firstKey = Object.keys(laravelErrors)[0];
        const firstMsg = laravelErrors[firstKey]?.[0] || "Validation error";
        setErrorText(firstMsg);
        setErrorVisible(true);
        setTimeout(() => setErrorVisible(false), 3500);
        return;
      }

      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 422
          ? "Validation error - Please check all fields"
          : "Payment failed - Please try again");
      setErrorText(msg);
      setErrorVisible(true);
      setTimeout(() => setErrorVisible(false), 3500);
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
                <Text style={styles.itemName}>{it.item_name}</Text>
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

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT</Text>
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

                <Text style={styles.inputLabel}>Card Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1234-5678-9012-3456"
                  keyboardType="numeric"
                  value={cardNumber}
                  onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                  maxLength={19}
                />

                <Text style={styles.inputLabel}>Expiry (MM/YY)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="08/28"
                  keyboardType="numeric"
                  value={cardExpiry}
                  onChangeText={(t) => setCardExpiry(formatExpiry(t))}
                  maxLength={5}
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

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (payLoading || dueAmount <= 0) && { opacity: 0.7 },
              ]}
              onPress={() => {
                console.log("🔘 SUBMIT BUTTON PRESSED");
                onSubmitPayment();
              }}
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

      {/* ✅ ERROR MESSAGE MODAL */}
      <Modal visible={errorVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.successCard,
              {
                backgroundColor: "#fff5f5",
                borderLeftWidth: 4,
                borderLeftColor: "#ef4444",
              },
            ]}
          >
            <View style={[styles.successIcon, { backgroundColor: "#ef4444" }]}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={30}
                color="white"
              />
            </View>
            <Text style={[styles.successTitle, { color: "#dc2626" }]}>
              Validation Error
            </Text>
            <Text style={[styles.successMsg, { color: "#7f1d1d" }]}>
              {errorText}
            </Text>
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
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "bold" },

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
