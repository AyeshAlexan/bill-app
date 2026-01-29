import React, { useEffect, useMemo, useState } from "react";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";

const BILL_API = "http://127.0.0.1:8000/api/bills";

export default function ViewBillScreen({ route, navigation }) {
  const { billId } = route.params;

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetchBill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billId]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BILL_API}/${billId}`);
      setBill(res.data);
    } catch (e) {
      console.log("VIEW BILL FETCH ERROR:", e?.response?.data || e.message);
      Alert.alert("Error", "Failed to load bill");
    } finally {
      setLoading(false);
    }
  };

  const subtotal = useMemo(() => Number(bill?.subtotal || 0), [bill]);
  const vatAmount = useMemo(() => Number(bill?.vat_amount || 0), [bill]);
  const extraTax = useMemo(() => Number(bill?.additional_tax || 0), [bill]);
  const totalAmount = useMemo(() => Number(bill?.total_amount || 0), [bill]);
  const dueAmount = useMemo(() => Number(bill?.due_amount || 0), [bill]);

  const payments = useMemo(() => bill?.payments || [], [bill]);

  const paidSoFar = useMemo(
    () => Math.max(totalAmount - dueAmount, 0),
    [totalAmount, dueAmount]
  );

  const statusColor = (s) => {
    if (s === "Paid") return "#10b981";
    if (s === "Partial") return "#f59e0b";
    return "#ef4444";
  };

  const formatDateTime = (dt) => {
    if (!dt) return "—";
    const safe = String(dt).replace(" ", "T");
    const d = new Date(safe);
    if (Number.isNaN(d.getTime())) return String(dt);
    return d.toLocaleString();
  };

  const escapeHtml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const getPayDate = (p) => p?.paid_at || p?.created_at || null;

  const getCardLast4 = (p) => {
    const raw = String(p?.card_number || "").replace(/\D/g, "");
    if (raw.length >= 4) return raw.slice(-4);
    return p?.card_last4 || "";
  };

  const buildPrintableHtml = () => {
    const shopName = bill?.shop?.name || "—";
    const shopLocation = bill?.shop?.location || "";
    const billNo = bill?.bill_number || "—";
    const billDate = bill?.bill_date || "—";

    const itemsHtml = (bill?.items || [])
      .map((it) => {
        const qty = Number(it.qty || 0);
        const free = Number(it.free_qty || 0);
        const unit = Number(it.unit_price || 0);
        const discP = Number(it.discount_percent || 0);
        const discAmt = Number(it.discount_amount || 0);
        const line = Number(it.line_total || it.price || 0);

        return `
          <tr>
            <td>
              <div style="font-weight:700;">${escapeHtml(it.item_name)}</div>
              <div style="color:#64748b;font-size:11px;margin-top:4px;">
                Qty: ${qty} ${free > 0 ? `• Free: ${free}` : ""} ${
          discP > 0 ? `• Discount: ${discP}%` : ""
        }
              </div>
            </td>
            <td style="text-align:right;">
              <div>Rs.${line.toFixed(2)}</div>
              <div style="color:#64748b;font-size:11px;margin-top:4px;">
                Unit: Rs.${unit.toFixed(2)} ${
          discAmt > 0 ? `<br/>- Rs.${discAmt.toFixed(2)}` : ""
        }
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    const paymentsHtml = (payments || [])
      .map((p, idx) => {
        const collector = p?.user?.name || "—";
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(p.method || "Cash")}</td>
            <td>${escapeHtml(collector)}</td>
            <td>${escapeHtml(formatDateTime(getPayDate(p)))}</td>
            <td style="text-align:right;">Rs.${Number(p.amount || 0).toFixed(
              2
            )}</td>
          </tr>
        `;
      })
      .join("");

    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill ${escapeHtml(billNo)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; }
    .row { display:flex; justify-content:space-between; gap:16px; }
    .card { border:1px solid #e5e7eb; border-radius:12px; padding:16px; margin:12px 0; }
    h1 { margin:0; font-size:18px; }
    .muted { color:#64748b; font-size:12px; margin-top:6px; }
    table { width:100%; border-collapse: collapse; margin-top:10px; }
    th, td { border-bottom:1px solid #eef2f7; padding:10px 6px; font-size:12px; vertical-align:top; }
    th { text-align:left; color:#0f172a; }
    .totals { margin-top:10px; }
    .totals div { display:flex; justify-content:space-between; padding:4px 0; font-size:12px; }
    .grand { font-weight:700; font-size:14px; }
  </style>
</head>
<body>
  <div class="row">
    <div>
      <h1>Bill ${escapeHtml(billNo)}</h1>
      <div class="muted">${escapeHtml(billDate)}</div>
      <div class="muted">${escapeHtml(shopName)} ${
      shopLocation ? "• " + escapeHtml(shopLocation) : ""
    }</div>
    </div>
    <div style="text-align:right;">
      <div class="muted">Status</div>
      <div style="font-weight:700;">${escapeHtml(bill?.status || "Pending")}</div>
    </div>
  </div>

  <div class="card">
    <div style="font-weight:700;">Items</div>
    <table>
      <tbody>
        ${itemsHtml || `<tr><td colspan="2" class="muted">No items</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>Rs.${subtotal.toFixed(2)}</span></div>
      <div><span>VAT</span><span>Rs.${vatAmount.toFixed(2)}</span></div>
      <div><span>Additional Tax</span><span>Rs.${extraTax.toFixed(2)}</span></div>
      <div class="grand"><span>Total</span><span>Rs.${totalAmount.toFixed(
        2
      )}</span></div>
      <div><span>Paid</span><span>Rs.${paidSoFar.toFixed(2)}</span></div>
      <div><span>Due</span><span>Rs.${dueAmount.toFixed(2)}</span></div>
    </div>
  </div>

  <div class="card">
    <div style="font-weight:700;">Installments (Payments)</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Method</th>
          <th>Collector</th>
          <th>Date</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${
          paymentsHtml ||
          `<tr><td colspan="5" class="muted">No payments</td></tr>`
        }
      </tbody>
    </table>
  </div>

  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>
    `;
  };

  const onPrint = async () => {
    if (!bill) return;
    const html = buildPrintableHtml();

    try {
      setPrinting(true);

      // ✅ Web
      if (Platform.OS === "web") {
        const w = window.open("", "_blank");
        if (!w) {
          Alert.alert("Popup blocked", "Allow popups to print.");
          return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
        return;
      }

      // ✅ Native (later)
      const Print = await import("expo-print");
      const Sharing = await import("expo-sharing");

      const file = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
      } else {
        Alert.alert("Saved", `PDF saved at: ${file.uri}`);
      }
    } catch (e) {
      console.log("PRINT ERROR:", e?.message || e);
      Alert.alert("Error", "Print failed");
    } finally {
      setPrinting(false);
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
      <View style={[styles.container, { justifyContent: "center", padding: 20 }]}>
        <Text>Bill not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Bill</Text>
        <Text style={styles.headerSub}>{bill?.shop?.name || "—"}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Bill card */}
        <View style={styles.card}>
          <View style={styles.billTop}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="file-document" size={24} color="#3b82f6" />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.billNo}>Bill #{bill.bill_number}</Text>
              <Text style={styles.date}>{bill.bill_date}</Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: "#f1f5f9" }]}>
              <Text style={[styles.statusText, { color: statusColor(bill.status) }]}>
                {bill.status}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Items</Text>

          {(bill.items || []).map((it) => {
            const qty = Number(it.qty || 0);
            const free = Number(it.free_qty || 0);
            const unit = Number(it.unit_price || 0);
            const discP = Number(it.discount_percent || 0);
            const discAmt = Number(it.discount_amount || 0);
            const line = Number(it.line_total || it.price || 0);

            return (
              <View key={it.id} style={styles.itemBlock}>
                <View style={styles.itemRow}>
                  <Text style={styles.itemName}>{it.item_name}</Text>
                  <Text style={styles.itemPrice}>Rs.{line.toFixed(2)}</Text>
                </View>

                <View style={styles.itemMetaRow}>
                  <Text style={styles.metaText}>Qty: {qty}</Text>
                  <Text style={styles.metaText}>Free: {free}</Text>
                  <Text style={styles.metaText}>Unit: Rs.{unit.toFixed(2)}</Text>
                </View>

                <View style={styles.itemMetaRow}>
                  <Text style={styles.metaText}>Discount: {discP}%</Text>
                  <Text style={styles.metaText}>- Rs.{discAmt.toFixed(2)}</Text>
                </View>
              </View>
            );
          })}

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
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs.{totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Paid</Text>
            <Text style={[styles.totalValue, { color: "#10b981" }]}>Rs.{paidSoFar.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Due</Text>
            <Text style={[styles.totalValue, { color: "#ef4444" }]}>Rs.{dueAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Installments */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Installments</Text>

          {payments.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="cash-remove" size={22} color="#94a3b8" />
              <Text style={styles.emptyText}>No payments recorded</Text>
            </View>
          ) : (
            payments.map((p, idx) => {
              const collector = p?.user?.name || "—";
              const method = p?.method || "Cash";
              const payDate = formatDateTime(getPayDate(p));
              const amount = Number(p?.amount || 0).toFixed(2);

              const last4 = getCardLast4(p);
              const cardRef = p?.card_ref || "";
              const chequeNo = p?.cheque_no || "";
              const chequeBank = p?.cheque_bank || "";

              return (
                <View key={p.id || `${idx}`} style={styles.payRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payTitle}>
                      {idx + 1}. {method} • {collector}
                    </Text>
                    <Text style={styles.paySub}>{payDate}</Text>

                    {method === "Card" && (last4 || cardRef) ? (
                      <Text style={styles.payMeta}>
                        Card: {last4 ? `**** ${last4}` : "—"} {cardRef ? `• Ref: ${cardRef}` : ""}
                      </Text>
                    ) : null}

                    {method === "Cheque" && (chequeNo || chequeBank) ? (
                      <Text style={styles.payMeta}>
                        Cheque: {chequeNo || "—"} {chequeBank ? `• Bank: ${chequeBank}` : ""}
                      </Text>
                    ) : null}
                  </View>

                  <Text style={styles.payAmount}>Rs.{amount}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Print button */}
        <TouchableOpacity
          style={[styles.printBtn, printing && { opacity: 0.7 }]}
          onPress={onPrint}
          disabled={printing}
          activeOpacity={0.85}
        >
          {printing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialCommunityIcons name="printer" size={18} color="white" />
              <Text style={styles.printText}>Print / Save Bill</Text>
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
    backgroundColor: "#00b894",
    padding: 25,
    paddingTop: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "bold" },
  headerSub: { color: "white", opacity: 0.8 },

  card: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
  },

  billTop: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  iconBox: { backgroundColor: "#dbeafe", padding: 10, borderRadius: 15 },
  billNo: { fontSize: 16, fontWeight: "bold" },
  date: { color: "#94a3b8", fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "bold" },

  sectionLabel: { fontSize: 14, fontWeight: "bold", marginBottom: 12 },

  itemBlock: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eef2f7",
  },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  itemName: { fontWeight: "800", color: "#0f172a" },
  itemPrice: { fontWeight: "900", color: "#0f172a" },
  itemMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  metaText: { color: "#64748b", fontSize: 11, fontWeight: "600" },

  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 12 },

  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  totalLabel: { color: "#64748b" },
  totalValue: { fontWeight: "bold", fontSize: 16, color: "#0f172a" },

  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },

  emptyBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  emptyText: { marginLeft: 10, color: "#94a3b8", fontWeight: "600" },

  payRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 10,
  },
  payTitle: { fontWeight: "800", color: "#0f172a", fontSize: 13 },
  paySub: { color: "#94a3b8", fontSize: 11, marginTop: 2 },
  payMeta: { color: "#64748b", fontSize: 11, marginTop: 2 },
  payAmount: { fontWeight: "900", color: "#10b981" },

  printBtn: {
    backgroundColor: "#0061ff",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  printText: { color: "white", fontWeight: "800" },
});
