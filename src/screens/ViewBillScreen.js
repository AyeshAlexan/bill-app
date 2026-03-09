import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

import * as Print from "expo-print";
import { Asset } from "expo-asset";

// ✅ Local asset import
import logo from "../assets/bill-logo.png"; 

import { getBillById } from "../services/billApi";
import { setAuthToken } from "../services/Api";

export default function ViewBillScreen({ route, navigation }) {
  const { billId } = route.params;

  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [company, setCompany] = useState(null);
  const [salesmanName, setSalesmanName] = useState("");
  const [customerExtra, setCustomerExtra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchBill();
  }, [billId]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (token) setAuthToken(token);
      
      const data = await getBillById(billId);
      const currentBill = data?.bill || data;
      setBill(currentBill);
      setItems(data?.items || currentBill?.items || []);
      setPayments(data?.payments || currentBill?.payments || []);
      setCompany(data?.company || null);
      
      setSalesmanName(data?.salesman_name || currentBill?.Salesmen || currentBill?.salesman || "");
      setCustomerExtra(data?.customer_extra || null);
    } catch (e) {
      Alert.alert("Error", "Failed to load bill");
    } finally {
      // Artificial delay to keep the loading animation smooth
      setTimeout(() => setLoading(false), 800);
    }
  };

  // --- CALCULATIONS ---
  const subtotal = useMemo(() => Number(bill?.Gross_Amount ?? 0), [bill]);
  const vatAmount = useMemo(() => Number(bill?.vat_amount ?? bill?.Vat_Amount ?? 0), [bill]);
  const billDiscount = useMemo(() => Number(bill?.Discount ?? 0), [bill]);
  
  const totalItemDiscount = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.Discount || 0), 0);
  }, [items]);

  const total = useMemo(() => Number(bill?.after_vat_amount ?? bill?.Net_Amount ?? 0), [bill]);
  const paid = useMemo(() => {
    const pSum = payments.reduce((sum, p) => sum + Number(p.Payment_Amount || 0), 0);
    return pSum > 0 ? pSum : Number(bill?.Paid_Amount ?? 0);
  }, [bill, payments]);
  const due = useMemo(() => Math.max(total - paid, 0), [total, paid]);
  
  const shopName = useMemo(() => bill?.Customer_Name || "NIMAL SALOON", [bill]);
  const shopPhone = useMemo(() => customerExtra?.Contact_1 || bill?.Customer_Phone || "", [customerExtra, bill]);
  const invoiceNo = bill?.Invoice_no || bill?.Sales_no || "N/A";
  
  const escapeHtml = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

  // --- HTML TEMPLATES ---

  const buildThermalHtml = (logoUri) => {
    const itemsHtml = items.map((it) => `
      <div style="margin-bottom: 12px;"> 
        <div style="font-weight: bold; text-transform: uppercase; font-size: 12px;">${escapeHtml(it.Item_description || it.item_name)}</div>
         <div style="display: flex; justify-content: space-between; font-family: monospace; font-size: 11px;">
           <span>
              ${it.QTY} x ${Number(it.Unit_price).toFixed(2)}
              ${Number(it.Free_Issues) > 0 ? `<br/>Free issues: ${it.Free_Issues}` : ""}
            </span>
              <span>${Number(it.Net_value).toFixed(2)}</span>
          </div>
        ${it.Discount > 0 ? `<div style="font-size: 10px; color: #555;">Item Disc: -${Number(it.Discount).toFixed(2)}</div>` : ''}
      </div>`).join("");

    return `
    <html>
      <head>
        <title>BUDDIKA DISTRIBUTORS - Invoice - ${invoiceNo}</title>
        <style>
          body { font-family: sans-serif; width: 280px; margin: 0 auto; padding: 5px; color: #000; }
          .center { text-align: center; }
          .logo { width: 70px; height: 70px; object-fit: contain; margin-bottom: 5px; }
          .comp-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .total-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
          .grand-total { font-size: 14px; font-weight: bold; border-top: 1px solid #000; margin-top: 5px; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="center">
          ${logoUri ? `<img src="${logoUri}" class="logo" />` : ''}
          <div class="comp-name">${escapeHtml(company?.name || "BUDDIKA DISTRIBUTORS")}</div>
          <div style="font-size: 10px;">Tel: ${escapeHtml(company?.co_number || "0772957067")}</div>
          <div style="font-weight: bold; border: 1px solid #000; display: inline-block; padding: 2px 8px; margin: 5px 0; font-size: 12px;">CASH RECEIPT</div>
        </div>
        <div style="font-size: 10px; margin-top: 5px;">
          <div style="display: flex; justify-content: space-between;"><span>Date: ${bill?.Invoice_date}</span><span>Inv: ${invoiceNo}</span></div>
          <div style="display: flex; justify-content: space-between;">
             <span>Customer: ${escapeHtml(shopName)}</span>
             <span>S.man: ${escapeHtml(salesmanName)}</span>
          </div>
        </div>
        <div class="divider"></div>
        <div>${itemsHtml}</div>
        <div class="divider"></div>
        <div class="total-row"><span>Sub Total</span><span>${subtotal.toFixed(2)}</span></div>
        ${totalItemDiscount > 0 ? `<div class="total-row"><span>Item Discount</span><span>-${totalItemDiscount.toFixed(2)}</span></div>` : ''}
        ${billDiscount > 0 ? `<div class="total-row"><span>Bill Discount</span><span>-${billDiscount.toFixed(2)}</span></div>` : ''}
        <div class="total-row"><span>VAT (${bill?.vat_presentage || 0}%)</span><span>${vatAmount.toFixed(2)}</span></div>
        <div class="total-row grand-total"><span>NET TOTAL</span><span>Rs.${total.toFixed(2)}</span></div>
        <div class="center" style="margin-top: 15px; font-size: 10px;">Thank You!</div>
      </body>
    </html>`;
  };

  const buildFormalHtml = (logoUri) => {
    const custAddress = customerExtra?.Address_1 ?? bill?.Address_1 ?? bill?.Customer_Address ?? "—";
    const custPhone = customerExtra?.Contact_1 ?? bill?.Contact_1 ?? bill?.Customer_Phone ?? "—";

    const itemsHtml = items.map((it) => `
      <tr>
        <td style="border:1px solid #000;padding:5px;text-align:center;">${escapeHtml(it.Item_code)}</td>
        <td style="border:1px solid #000;padding:5px;">${escapeHtml(it.Item_description || it.item_name)}</td>
        <td style="border:1px solid #000;padding:5px;text-align:right;">${Number(it.Unit_price || 0).toFixed(2)}</td>
        <td style="border:1px solid #000;padding:5px;text-align:center;">${it.Free_Issues || "0"}</td>
        <td style="border:1px solid #000;padding:5px;text-align:center;">${it.QTY || 0}</td>
        <td style="border:1px solid #000;padding:5px;text-align:right;">${Number(it.Discount || 0).toFixed(2)}</td>
        <td style="border:1px solid #000;padding:5px;text-align:right;">${Number(it.Net_value || 0).toFixed(2)}</td>
      </tr>`).join("");

    return `<!doctype html><html>
    <head>
      <title>BUDDIKA DISTRIBUTORS - Invoice - ${invoiceNo}</title>
      <style>
        body { font-family:sans-serif; margin:0; padding:30px; font-size:11px; color:#000; }
        .header-row { display:flex; justify-content:space-between; }
        .comp-name { font-size:18px; font-weight:bold; }
        .logo { width:100px; height:auto; }
        .tax-invoice-bar { background:#f0f0f0; border:1px solid #000; text-align:center; font-size:16px; font-weight:bold; padding:8px; margin:20px 0; }
        .items-table { width:100%; border-collapse:collapse; }
        .items-table th { border:1px solid #000; background:#000; color:#fff; padding:8px; }
        .totals-area { margin-top:20px; width:280px; float:right; }
        .footer-sig { margin-top:80px; display:flex; justify-content:space-between; }
        .sig-box { border-top:1px dotted #000; width:30%; text-align:center; padding-top:8px; }
      </style>
    </head>
    <body>
      <div class="header-row">
        <div>
          <div class="comp-name">${escapeHtml(company?.name || "BUDDIKA DISTRIBUTORS")}</div>
          <div>Address: ${escapeHtml(company?.address || "02/127, DORATIYAWA, KURUNEGALA")}</div>
          <div>Phone: ${escapeHtml(company?.co_number || "0772957067")}</div>
        </div>
        <img src="${logoUri}" class="logo" />
      </div>
      <hr style="border:0.5px solid #000; margin:15px 0;"/>
      <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
        <div>
          <strong>Customer:</strong> ${escapeHtml(shopName)}<br/>
          <strong>Address:</strong> ${escapeHtml(custAddress)}<br/>
          <strong>Phone:</strong> ${escapeHtml(custPhone)}
        </div>
        <table style="border-collapse:collapse;">
          <tr><td style="border:1px solid #000; padding:5px; background:#000; color:#fff;">Invoice No</td><td style="border:1px solid #000; padding:5px;">${escapeHtml(invoiceNo)}</td></tr>
          <tr><td style="border:1px solid #000; padding:5px; background:#000; color:#fff;">Date</td><td style="border:1px solid #000; padding:5px;">${escapeHtml(bill?.Invoice_date)}</td></tr>
        </table>
      </div>
      <div class="tax-invoice-bar">TAX INVOICE</div>
      <table class="items-table">
        <thead><tr><th>Code</th><th>Product Name</th><th>Price</th><th>Free</th><th>Qty</th><th>Disc</th><th>Amount</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div class="totals-area">
        <table style="width:100%;">
          <tr><td>Sub Total:</td><td align="right">${subtotal.toFixed(2)}</td></tr>
          ${totalItemDiscount > 0 ? `<tr><td>Item Discount:</td><td align="right">-${totalItemDiscount.toFixed(2)}</td></tr>` : ''}
          ${billDiscount > 0 ? `<tr><td>Bill Discount:</td><td align="right">-${billDiscount.toFixed(2)}</td></tr>` : ''}
          <tr><td>VAT (${bill?.vat_presentage || 0}%):</td><td align="right">${vatAmount.toFixed(2)}</td></tr>
          <tr style="font-weight:bold; font-size:15px; border-top:1.5px solid #000;"><td>Total Due:</td><td align="right">Rs.${total.toFixed(2)}</td></tr>
        </table>
      </div>
      <div style="clear:both;"></div>
      <div class="footer-sig">
        <div class="sig-box">Authorized Signature</div>
        <div class="sig-box">Checked By</div>
        <div class="sig-box">Customer Signature</div>
      </div>
      <div style="margin-top:20px; font-size:10px;">Served by: ${escapeHtml(salesmanName)}</div>
    </body></html>`;
  };

  const handlePrint = async (type) => {
    try {
      setProcessing(true);
      const asset = Asset.fromModule(logo);
      await asset.downloadAsync();
      const logoUri = asset.localUri || asset.uri; 

      const finalHtml = type === 'thermal' ? buildThermalHtml(logoUri) : buildFormalHtml(logoUri);
      const jobName = `BUDDIKA DISTRIBUTORS - Invoice - ${invoiceNo}`;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(finalHtml);
        printWindow.document.close();
        printWindow.print();
      } else {
        await Print.printAsync({ html: finalHtml, jobName: jobName });
      }
    } catch (e) {
      Alert.alert("Error", "Printing failed");
    } finally {
      setProcessing(false);
    }
  };

  // --- LOADING SCREEN ---
  if (loading) {
    return (
      <View style={styles.centerLoader}>
        <View style={styles.loaderIconContainer}>
          <MaterialCommunityIcons name="printer-search" size={65} color="#30a830" />
        </View>
        <ActivityIndicator size="large" color="#30a830" style={{ marginTop: 25 }} />
        <Text style={styles.loaderText}>Fetching Invoice Details...</Text>
        <Text style={styles.loaderSubText}>Preparing your bill for view</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Details</Text>
        <Text style={styles.headerSub}>{shopName}</Text>
        {shopPhone ? <Text style={styles.headerPhone}>{shopPhone}</Text> : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 15 }}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.invLabel}>Invoice Number</Text>
              <Text style={styles.invValue}>INV-{invoiceNo}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={[styles.statusText, { color: due <= 0 ? "#10b981" : "#ef4444" }]}>
                {due <= 0 ? "PAID" : "PENDING"}
              </Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{bill?.Invoice_date}</Text>
            </View>
            <View style={[styles.infoItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.infoLabel}>Salesman</Text>
              <Text style={styles.infoValue}>{salesmanName || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Bill Items</Text>
          {items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
               <View style={{flex: 1}}>
                 <Text style={styles.itemName}>{it.Item_description || it.item_name}</Text>
                 <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                      <Text style={styles.itemMeta}> Qty: {it.QTY} 
                        {Number(it.Free_Issues) > 0 ? ` (+${it.Free_Issues} Free)` : ""}
                            {" "}x {Number(it.Unit_price).toFixed(2)}
                       </Text>
                    {Number(it.Discount) > 0 && (
                        <View style={styles.itemDiscBadge}>
                            <Text style={styles.itemDiscText}>Disc: {Number(it.Discount).toFixed(2)}</Text>
                        </View>
                    )}
                 </View>
               </View>
               <Text style={styles.itemTotal}>Rs.{Number(it.Net_value).toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.divider} />
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>Rs.{subtotal.toFixed(2)}</Text></View>
          
          {totalItemDiscount > 0 && (
              <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Item Discount</Text>
                  <Text style={[styles.totalValue, {color: '#ef4444'}]}>- Rs.{totalItemDiscount.toFixed(2)}</Text>
              </View>
          )}

          {billDiscount > 0 && (
              <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Bill Discount</Text>
                  <Text style={[styles.totalValue, {color: '#ef4444'}]}>- Rs.{billDiscount.toFixed(2)}</Text>
              </View>
          )}

          <View style={styles.totalRow}><Text style={styles.totalLabel}>VAT</Text><Text style={styles.totalValue}>Rs.{vatAmount.toFixed(2)}</Text></View>
          
          <View style={[styles.totalRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }]}>
            <Text style={styles.grandLabel}>Grand Total</Text>
            <Text style={styles.grandValue}>Rs.{total.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.printBtn} onPress={() => handlePrint('thermal')} disabled={processing}>
           {processing ? <ActivityIndicator color="white" /> : <><MaterialCommunityIcons name="script-text-outline" size={24} color="white" /><Text style={styles.btnText}>Print Bill (Receipt)</Text></>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.pdfBtn} onPress={() => handlePrint('formal')} disabled={processing}>
           {processing ? <ActivityIndicator color="white" /> : <><MaterialCommunityIcons name="printer" size={24} color="white" /><Text style={styles.btnText}>Print Full Invoice</Text></>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  centerLoader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#f8fafc' },
  loaderIconContainer: {
    width: 130,
    height: 130,
    backgroundColor: 'white',
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  loaderText: { marginTop: 25, fontSize: 18, fontWeight: '800', color: '#1e293b' },
  loaderSubText: { marginTop: 6, fontSize: 14, color: '#64748b' },
  headerContainer: { backgroundColor: "#30a830", padding: 20, paddingTop: 50, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { color: "white", fontSize: 22, fontWeight: "bold" },
  headerSub: { color: "white", opacity: 0.9, fontSize: 16, fontWeight: '600', marginTop: 4 },
  headerPhone: { color: "white", opacity: 0.8, fontSize: 13, marginTop: 2 },
  card: { backgroundColor: "white", borderRadius: 20, padding: 20, elevation: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  invLabel: { fontSize: 12, color: "#64748b" },
  invValue: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  statusBadge: { backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "bold" },
  infoGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 11, color: "#94a3b8" },
  infoValue: { fontSize: 13, color: "#334155", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 15 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#64748b", marginBottom: 12, textTransform: 'uppercase' },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }, 
  itemName: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  itemMeta: { fontSize: 11, color: "#94a3b8" },
  itemTotal: { fontWeight: "bold", color: "#1e293b" },
  itemDiscBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  itemDiscText: { fontSize: 10, color: '#ef4444', fontWeight: 'bold' },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  totalLabel: { color: "#64748b", fontSize: 14 },
  totalValue: { fontWeight: "600", fontSize: 14 },
  grandLabel: { fontSize: 16, fontWeight: "bold" },
  grandValue: { fontSize: 18, fontWeight: "bold", color: "#30a830" },
  printBtn: { backgroundColor: "#1e293b", padding: 18, borderRadius: 15, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 20 },
  pdfBtn: { backgroundColor: "#30a830", padding: 18, borderRadius: 15, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 15 },
  btnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  backBtn: { marginBottom: 10 }
});