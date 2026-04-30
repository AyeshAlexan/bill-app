import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp, Layout } from "react-native-reanimated";
import { setAuthToken } from "../services/Api";
import { fetchDailyReport } from "../services/dashboardApi";

const { width } = Dimensions.get("window");

export default function DailyReportScreen({ navigation }) {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("bills");

  const [data, setData] = useState({
    summary: {
      bills_count: 0,
      total_sales: 0,
      total_collected: 0,
      credit_sales: 0,
    },
    items: [],
    sales: {
      cash: 0,
      card: 0,
      cheque: 0,
      bank: 0,
      total_collected: 0,
      total_bills: 0,
      credit: 0,
    },
    bills: [],
    payments: [],
  });

  const ensureToken = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    if (token) setAuthToken(token);
    return token;
  }, []);

  const loadDailyReport = useCallback(
    async (selectedDate) => {
      try {
        setLoading(true);
        const token = await ensureToken();
        if (!token) {
          navigation.replace("Login");
          return;
        }

        const formattedDate = selectedDate.toISOString().split("T")[0];
        const reportData = await fetchDailyReport(formattedDate);
        setData(reportData);
      } catch (err) {
        console.error("Daily Report error:", err.message);
        Alert.alert("Error", "Failed to load daily report");
      } finally {
        setLoading(false);
      }
    },
    [ensureToken, navigation],
  );

  useFocusEffect(
    useCallback(() => {
      loadDailyReport(date);
    }, [loadDailyReport, date]),
  );

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatMoney = (n) =>
    `Rs.${Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  const formatDate = (d) => {
    const options = { month: "2-digit", day: "2-digit", year: "numeric" };
    return d.toLocaleDateString("en-IN", options);
  };

  const renderStat = (icon, label, value, color, index) => (
    <Animated.View 
      entering={FadeInUp.delay(index * 100).springify()}
      style={{ width: "48%" }}
    >
      <LinearGradient
        colors={[color + "20", color + "10"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statCard}
      >
        <MaterialCommunityIcons name={icon} size={28} color={color} />
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </LinearGradient>
    </Animated.View>
  );

  const renderBillItem = (bill, idx) => (
    <Animated.View
      key={`bill-${idx}`}
      entering={FadeInDown.delay(idx * 50).springify()}
      layout={Layout.springify()}
    >
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("BillDetail", { invoiceNo: bill.invoice_no })
        }
        style={styles.itemCard}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemBillNo}>{bill.invoice_no}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  bill.status === "paid"
                    ? "#22c55e"
                    : bill.status === "partial"
                      ? "#f97316"
                      : "#8b5cf6",
              },
            ]}
          >
            <Text style={styles.statusText}>{bill.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.itemCustomer}>{bill.customer_name}</Text>
        <View style={styles.itemFooter}>
          <View>
            <Text style={styles.itemLabel}>Amount</Text>
            <Text style={styles.itemAmount}>{formatMoney(bill.amount)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.itemLabel}>Balance</Text>
            <Text
              style={[
                styles.itemAmount,
                { color: bill.balance > 0 ? "#ef4444" : "#22c55e" },
              ]}
            >
              {formatMoney(bill.balance)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderItemRow = (item, idx) => (
    <Animated.View 
      key={`item-${idx}`} 
      entering={FadeInDown.delay(idx * 30)}
      style={styles.tableRow}
    >
      <Text style={[styles.tableCell, { flex: 1 }]}>{item.name}</Text>
      <Text style={[styles.tableCell, { textAlign: "center", width: 60 }]}>
        {item.quantity}
      </Text>
      <Text style={[styles.tableCell, { textAlign: "right", width: 80 }]}>
        {formatMoney(item.rate)}
      </Text>
      <Text style={[styles.tableCell, { textAlign: "right", width: 80 }]}>
        {formatMoney(item.amount)}
      </Text>
    </Animated.View>
  );

  const renderPaymentItem = (payment, idx) => (
    <Animated.View
      key={`payment-${idx}`}
      entering={FadeInDown.delay(idx * 50).springify()}
    >
      <TouchableOpacity
        style={styles.paymentCard}
        activeOpacity={0.7}
      >
        <View style={styles.paymentHeader}>
          <View>
            <Text style={styles.paymentBillNo}>{payment.invoice_no}</Text>
            <Text style={styles.paymentCustomer}>{payment.customer_name}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.paymentAmount}>
              {formatMoney(payment.amount)}
            </Text>
            <View
              style={[
                styles.methodBadge,
                {
                  backgroundColor:
                    payment.method === "Cash"
                      ? "#10b981"
                      : payment.method === "Card"
                        ? "#06b6d4"
                        : payment.method === "Cheque"
                          ? "#a855f7"
                          : "#f59e0b",
                },
              ]}
            >
              <Text style={styles.methodText}>{payment.method}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPaymentMethod = (method, amount, icon, color, idx) => (
    <Animated.View 
      entering={FadeInUp.delay(idx * 100).springify()}
      style={{ width: "48%" }}
    >
      <LinearGradient
        colors={[color + "20", color + "10"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.paymentMethodCard}
      >
        <MaterialCommunityIcons name={icon} size={24} color={color} />
        <Text style={styles.paymentMethodLabel}>{method}</Text>
        <Text style={[styles.paymentMethodAmount, { color }]}>
          {formatMoney(amount)}
        </Text>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeAreaWrapper} edges={["bottom"]}>
      <View style={{ flex: 1, backgroundColor: "#f0fdf4" }}>
        <LinearGradient
          colors={["#86efadd0", "#f0fdf4", "#86edacd0", "#ffffff99"]}
          style={styles.screenWrapper}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          {/* Header */}
          <LinearGradient
            colors={["#275ddb", "#5bc9ed"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 0 }}
            style={styles.header}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={28}
                color="white"
              />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Daily Report</Text>
              <Text style={styles.headerSub}>
                Auto-generated from your daily transactions
              </Text>
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
          >
            {/* Date Picker */}
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.datePickerBtn}
            >
              <MaterialCommunityIcons
                name="calendar"
                size={20}
                color="#2563eb"
              />
              <Text style={styles.dateText}>
                Report Date: {formatDate(date)}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color="#2563eb"
              />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
              />
            )}

            {loading ? (
              <ActivityIndicator
                color="#2563eb"
                size="large"
                style={{ marginTop: 40 }}
              />
            ) : (
              <>
                {/* Stats Section */}
                <View style={styles.statsGrid}>
                  {renderStat("file-document", "BILLS CREATED", data.summary.bills_count, "#3b82f6", 0)}
                  {renderStat("storefront", "SHOPS VISITED", data.bills.length, "#10b981", 1)}
                  {renderStat("cash-multiple", "PAYMENTS", data.payments.length, "#8b5cf6", 2)}
                  {renderStat("trending-up", "TOTAL COLLECTED", formatMoney(data.sales.total_collected), "#f59e0b", 3)}
                </View>

                {/* Navigation Tabs */}
                <View style={styles.navTabs}>
                  {["bills", "items", "payments"].map((section, idx) => (
                    <TouchableOpacity
                      key={section}
                      style={[
                        styles.navTab,
                        activeSection === section && styles.navTabActive,
                      ]}
                      onPress={() => setActiveSection(section)}
                    >
                      <MaterialCommunityIcons
                        name={section === "bills" ? "file-document-outline" : section === "items" ? "shopping-outline" : "cash-check"}
                        size={18}
                        color={activeSection === section ? "white" : "#64748b"}
                      />
                      <Text
                        style={[
                          styles.navTabText,
                          activeSection === section && styles.navTabTextActive,
                        ]}
                      >
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Content Sections */}
                {activeSection === "bills" && (
                  <View>
                    <Text style={styles.sectionTitle}>Bills Created Today</Text>
                    {data.bills.length > 0 ? (
                      <View style={styles.contentBox}>
                        {data.bills.map((bill, idx) => renderBillItem(bill, idx))}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>No bills created today</Text>
                    )}
                  </View>
                )}

                {activeSection === "items" && (
                  <View>
                    <Text style={styles.sectionTitle}>Items Sold Today</Text>
                    {data.items.length > 0 ? (
                      <View style={styles.contentBox}>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Item Name</Text>
                          <Text style={[styles.tableHeaderCell, { textAlign: "center", width: 60 }]}>QTY</Text>
                          <Text style={[styles.tableHeaderCell, { textAlign: "right", width: 80 }]}>RATE</Text>
                          <Text style={[styles.tableHeaderCell, { textAlign: "right", width: 80 }]}>AMOUNT</Text>
                        </View>
                        {data.items.map((item, idx) => renderItemRow(item, idx))}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>No items sold today</Text>
                    )}
                  </View>
                )}

                {activeSection === "payments" && (
                  <View>
                    <Text style={styles.sectionTitle}>Payments Collected Today</Text>
                    {data.payments.length > 0 ? (
                      <View style={styles.contentBox}>
                        {data.payments.map((payment, idx) => renderPaymentItem(payment, idx))}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>No payments collected today</Text>
                    )}
                  </View>
                )}

                <Text style={styles.sectionTitle}>Sales Summary</Text>
                <Text style={styles.sectionSubtitle}>Financial breakdown for {formatDate(date)}</Text>

                <View style={styles.paymentMethodsGrid}>
                  {renderPaymentMethod("CASH", data.sales.cash, "cash", "#10b981", 0)}
                  {renderPaymentMethod("BANK/CARD", data.sales.card, "credit-card", "#06b6d4", 1)}
                  {renderPaymentMethod("CHEQUE", data.sales.cheque, "file-document", "#a855f7", 2)}
                  {renderPaymentMethod("BANK TRANSFER", data.sales.bank, "bank-transfer", "#f59e0b", 3)}
                </View>

                <View style={styles.contentBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Collected</Text>
                    <Text style={[styles.summaryValue, { color: "#10b981" }]}>{formatMoney(data.sales.total_collected)}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Credit Sales</Text>
                    <Text style={[styles.summaryValue, { color: "#8b5cf6" }]}>{formatMoney(data.sales.credit)}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Bills Amount</Text>
                    <Text style={[styles.summaryValue, { color: "#3b82f6" }]}>{formatMoney(data.sales.total_bills)}</Text>
                  </View>
                </View>

                <LinearGradient
                  colors={["#275ddb", "#5bc9ed"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.grandTotalCard}
                >
                  <Text style={styles.grandTotalLabel}>Total Business Value</Text>
                  <Text style={styles.grandTotalValue}>{formatMoney(data.sales.total_bills)}</Text>
                </LinearGradient>

                <View style={{ height: 40 }} />
              </>
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaWrapper: { flex: 1, backgroundColor: "#131313" },
  screenWrapper: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 0 },
  header: { padding: 20, paddingTop: Platform.OS === "ios" ? 20 : 15, paddingBottom: 25, flexDirection: "row", alignItems: "center", gap: 15 },
  backBtn: { padding: 8 },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "bold" },
  headerSub: { color: "#bfdbfe", fontSize: 14, marginTop: 4 },
  datePickerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginHorizontal: 20, marginTop: 20, paddingVertical: 12, paddingHorizontal: 15, backgroundColor: "rgba(255, 255, 255, 0.6)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.8)" },
  dateText: { fontSize: 14, fontWeight: "600", color: "#2563eb" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 15, marginTop: 20, gap: 10, justifyContent: "space-between" },
  statCard: { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 16, alignItems: "center", gap: 6, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.5)" },
  statLabel: { fontSize: 10, fontWeight: "600", color: "#64748b", textTransform: "uppercase", textAlign: "center" },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#1e293b", textAlign: "center" },
  navTabs: { flexDirection: "row", marginHorizontal: 20, marginTop: 20, backgroundColor: "rgba(255, 255, 255, 0.3)", borderRadius: 12, padding: 6, gap: 6 },
  navTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  navTabActive: { backgroundColor: "#2563eb" },
  navTabText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  navTabTextActive: { color: "white" },
  sectionTitle: { paddingHorizontal: 20, paddingTop: 20, fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  sectionSubtitle: { paddingHorizontal: 20, fontSize: 12, color: "#64748b", marginTop: 4 },
  contentBox: { marginHorizontal: 20, marginTop: 12, padding: 15, backgroundColor: "rgba(255, 255, 255, 0.5)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.8)" },
  itemCard: { backgroundColor: "rgba(255, 255, 255, 0.5)", padding: 14, marginBottom: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0, 0, 0, 0.05)" },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  itemBillNo: { fontSize: 13, fontWeight: "bold", color: "#2563eb" },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  statusText: { color: "white", fontSize: 10, fontWeight: "bold" },
  itemCustomer: { fontSize: 13, color: "#475569", marginBottom: 8 },
  itemFooter: { flexDirection: "row", justifyContent: "space-between" },
  itemLabel: { fontSize: 10, color: "#64748b", marginBottom: 2 },
  itemAmount: { fontSize: 12, fontWeight: "bold", color: "#1e293b" },
  tableHeader: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: "#e2e8f0", marginBottom: 10 },
  tableHeaderCell: { fontSize: 11, fontWeight: "bold", color: "#475569", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(0, 0, 0, 0.05)" },
  tableCell: { fontSize: 12, color: "#1e293b" },
  paymentCard: { backgroundColor: "rgba(255, 255, 255, 0.5)", padding: 14, marginBottom: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0, 0, 0, 0.05)" },
  paymentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  paymentBillNo: { fontSize: 13, fontWeight: "bold", color: "#2563eb", marginBottom: 2 },
  paymentCustomer: { fontSize: 12, color: "#475569" },
  paymentAmount: { fontSize: 14, fontWeight: "bold", color: "#1e293b", marginBottom: 6 },
  methodBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  methodText: { color: "white", fontSize: 10, fontWeight: "bold" },
  paymentMethodsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 15, marginTop: 12, gap: 10, justifyContent: "space-between" },
  paymentMethodCard: { paddingVertical: 14, paddingHorizontal: 10, borderRadius: 12, alignItems: "center", gap: 6, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.5)" },
  paymentMethodLabel: { fontSize: 10, fontWeight: "600", color: "#475569", textTransform: "uppercase" },
  paymentMethodAmount: { fontSize: 14, fontWeight: "bold" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  summaryLabel: { fontSize: 13, fontWeight: "600", color: "#475569" },
  summaryValue: { fontSize: 14, fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "rgba(0, 0, 0, 0.05)" },
  grandTotalCard: { marginHorizontal: 20, marginTop: 20, paddingVertical: 24, paddingHorizontal: 20, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  grandTotalLabel: { fontSize: 14, color: "#e0e7ff", fontWeight: "600" },
  grandTotalValue: { fontSize: 28, fontWeight: "bold", color: "white", marginTop: 8 },
  emptyText: { textAlign: "center", color: "#94a3b8", paddingVertical: 30, fontSize: 13 },
});