import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getBillById } from "../services/billApi";
import { setAuthToken } from "../services/Api";

export default function ViewBillScreen({ route, navigation }) {
  const { billId } = route.params;

  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetchBill();
  }, [billId]);

  const ensureToken = async () => {
    const token = await AsyncStorage.getItem("token");
    if (token) setAuthToken(token);
    return token;
  };

  const fetchBill = async () => {
    try {
      setLoading(true);
      const token = await ensureToken();
      if (!token) {
        Alert.alert("Session expired", "Please login again.");
        navigation.replace("Login");
        return;
      }

      const data = await getBillById(billId);
      const currentBill = data?.bill || data;
      setBill(currentBill);
      setItems(data?.items || currentBill?.items || []);
      setPayments(data?.payments || currentBill?.payments || []);
    } catch (e) {
      console.log("VIEW BILL ERROR:", e?.response?.data || e.message);
      Alert.alert("Error", "Failed to load bill");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED Calculation Mappings
  const subtotal = useMemo(() => Number(bill?.Gross_Amount ?? 0), [bill]);
  const vatAmount = useMemo(() => Number(bill?.vat_amount ?? bill?.Vat_Amount ?? 0), [bill]);
  
  // Total should be the after_vat_amount from your PHP controller
  const total = useMemo(() => 
    Number(bill?.after_vat_amount ?? bill?.Net_Amount ?? 0), 
  [bill]);

  // Paid should be the sum of all payments from the database
  const paid = useMemo(() => {
    const paymentSum = payments.reduce((sum, p) => sum + Number(p.Payment_Amount || 0), 0);
    return paymentSum > 0 ? paymentSum : Number(bill?.Paid_Amount ?? 0);
  }, [bill, payments]);

  const due = useMemo(() => Math.max(total - paid, 0), [total, paid]);

  const shopName = useMemo(() => bill?.Customer_Name || "NIMAL SALOON", [bill]);
  const shopLocation = useMemo(() => {
    return (
      bill?.City_1 ||
      bill?.location ||
      payments?.[0]?.City_1 ||
      bill?.customer?.City_1 ||
      ""
    );
  }, [bill, payments]);

  const statusColor = (d) => {
    if (d <= 0) return "#10b981"; // Paid
    if (d < total) return "#f59e0b"; // Partial
    return "#ef4444"; // Due
  };

  const escapeHtml = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

  // ✅ FIXED HTML Print Builder (Uses the new calculation constants)
  const buildPrintableHtml = () => {
    const billNo = bill?.Invoice_no || bill?.Sales_no || "—";
    const billDate = bill?.Invoice_date || bill?.Payment_date || "—";

    const itemsHtml = items.map((it) => {
      const lineTotal = Number(it.Net_value || it.total || 0);
      const unitPrice = Number(it.Unit_price || 0);
      const qty = it.QTY || it.qty || 0;

      return `
        <tr>
          <td>
            <div style="font-weight:700;">${escapeHtml(it.Item_description || it.item_name)}</div>
            <div style="color:#64748b;font-size:11px;margin-top:4px;">
              Qty: ${qty} • Unit: Rs.${unitPrice.toFixed(2)}
            </div>
          </td>
          <td style="text-align:right; vertical-align:middle;">Rs.${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join("");

    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill ${escapeHtml(billNo)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
    .header-row { border-bottom: 2px solid #30a830; padding-bottom: 15px; margin-bottom: 20px; }
    .shop-name { font-size: 24px; font-weight: bold; color: #30a830; margin: 0; }
    .muted { color:#64748b; font-size: 13px; margin-top: 4px; }
    .card { border:1px solid #eef2f7; border-radius:12px; padding:16px; margin:12px 0; background: #fff; }
    table { width:100%; border-collapse: collapse; margin-top:10px; }
    td { border-bottom:1px solid #f1f5f9; padding:12px 6px; font-size:13px; text-align: left; }
    .totals { margin-top:15px; border-top: 1px solid #f1f5f9; padding-top: 10px; }
    .totals-row { display:flex; justify-content:space-between; padding:4px 0; font-size:13px; }
    .grand-total { font-weight:700; font-size:16px; margin-top: 8px; border-top: 1px double #eef2f7; padding-top: 8px; color: #30a830; }
  </style>
</head>
<body>
  <div class="header-row">
    <div class="shop-name">${escapeHtml(shopName)}</div>
    <div class="muted">${escapeHtml(shopLocation)}</div>
    <div style="margin-top: 10px;">
        <div class="muted"><b>Invoice:</b> ${escapeHtml(billNo)}</div>
        <div class="muted"><b>Date:</b> ${escapeHtml(billDate)}</div>
    </div>
  </div>
  <div class="card">
    <div style="font-weight:700; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Items</div>
    <table>
      <tbody>${itemsHtml || '<tr><td>No items</td></tr>'}</tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>Rs.${subtotal.toFixed(2)}</span></div>
      <div class="totals-row"><span>VAT</span><span>Rs.${vatAmount.toFixed(2)}</span></div>
      <div class="totals-row grand-total"><span>Total</span><span>Rs.${total.toFixed(2)}</span></div>
      <div class="totals-row" style="color:#10b981;"><span>Paid</span><span>Rs.${paid.toFixed(2)}</span></div>
      <div class="totals-row" style="color:#ef4444;"><span>Due</span><span>Rs.${due.toFixed(2)}</span></div>
    </div>
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
  };

  const onPrint = async () => {
    if (!bill) return;
    try {
      setPrinting(true);
      const html = buildPrintableHtml();
      if (Platform.OS === "web") {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
        }
      } else {
        const Print = await import("expo-print");
        const Sharing = await import("expo-sharing");
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri);
      }
    } catch (e) {
      Alert.alert("Error", "Print failed");
    } finally {
      setPrinting(false);
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Invoice</Text>
        <Text style={styles.headerSub}>{shopName}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.card}>
          <View style={styles.billTop}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color="#30a830" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.billNo}>INV-{bill?.Invoice_no || bill?.Sales_no}</Text>
              <Text style={styles.date}>{bill?.Invoice_date || bill?.Payment_date}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={[styles.statusText, { color: statusColor(due) }]}>
                {due <= 0 ? "PAID" : due < total ? "PARTIAL" : "UNPAID"}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Items</Text>
          {items.map((it, i) => (
            <View key={i} style={styles.itemRowMain}>
              <View style={{flex: 1}}>
                <Text style={styles.itemName}>{it.Item_description || it.item_name}</Text>
                <Text style={styles.metaText}>Qty: {it.QTY || 0} • Rs.{Number(it.Unit_price || 0).toFixed(2)}</Text>
              </View>
              <Text style={styles.itemPrice}>Rs.{Number(it.Net_value || 0).toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>Rs.{subtotal.toFixed(2)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>VAT</Text><Text style={styles.totalValue}>Rs.{vatAmount.toFixed(2)}</Text></View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, {fontWeight: 'bold', color: '#1e293b'}]}>Total</Text>
            <Text style={[styles.totalValue, {fontSize: 18, color: '#30a830'}]}>Rs.{total.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
             <Text style={styles.totalLabel}>Paid</Text>
             <Text style={[styles.totalValue, { color: "#10b981" }]}>Rs.{paid.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
             <Text style={styles.totalLabel}>Due</Text>
             <Text style={[styles.totalValue, { color: "#ef4444" }]}>Rs.{due.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.printBtn, printing && {opacity: 0.7}]} onPress={onPrint} disabled={printing}>
          {printing ? <ActivityIndicator color="white" /> : (
            <>
              <MaterialCommunityIcons name="printer" size={20} color="white" />
              <Text style={styles.printText}>Print Invoice</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#30a830",
    padding: 25,
    paddingTop: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: { marginBottom: 5, marginLeft: -10 },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "bold" },
  headerSub: { color: "white", opacity: 0.9, fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  billTop: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  iconBox: { backgroundColor: "#dcfce7", padding: 10, borderRadius: 15 },
  billNo: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  date: { color: "#94a3b8", fontSize: 12 },
  statusBadge: { backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "bold" },
  sectionLabel: { fontSize: 12, fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase", marginBottom: 15 },
  itemRowMain: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  itemName: { fontWeight: "700", color: "#1e293b", fontSize: 14 },
  metaText: { color: "#94a3b8", fontSize: 11, marginTop: 2 },
  itemPrice: { fontWeight: "bold", color: "#1e293b" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  totalLabel: { color: "#64748b", fontSize: 14 },
  totalValue: { fontWeight: "bold", color: "#1e293b", fontSize: 15 },
  printBtn: {
    backgroundColor: "#0061ff",
    padding: 18,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  printText: { color: "white", fontWeight: "bold", fontSize: 16 },
});