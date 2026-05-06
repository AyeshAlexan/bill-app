import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createVoucher,
  getAccounts,
  getInvoices,
  getVouchers,
} from "../services/paymentVoucherApi";

const CustomDropdown = ({
  label,
  icon,
  data,
  value,
  onSelect,
  placeholder,
  displayKey,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={{ marginTop: 15 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setModalVisible(true)}
      >
        <MaterialCommunityIcons name={icon} size={20} color="#2563eb" />
        <Text style={styles.dropdownText} numberOfLines={1}>
          {value ? value[displayKey] : placeholder}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#64748b" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={data}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{item[displayKey]}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default function PaymentVoucherScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vouchers, setVouchers] = useState([]);

  const [invoice, setInvoice] = useState(null);
  const [drAccount, setDrAccount] = useState(null);
  const [crAccount, setCrAccount] = useState(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const accRes = await getAccounts();
      const invRes = await getInvoices();
      const vouRes = await getVouchers();
      setAccounts(accRes.data.accounts);
      setInvoices(invRes.data.invoices);
      setVouchers(vouRes.data.vouchers.data);
    } catch (e) {
      Alert.alert("Error", "Failed to load data");
    }
  };

  const submit = async () => {
    if (!drAccount || !crAccount || !amount) {
      Alert.alert(
        "Error",
        "Please fill all required fields (Dr, Cr, and Amount)",
      );
      return;
    }

    const payload = {
      invoice_no: invoice?.Invoice_no ? String(invoice.Invoice_no) : null,
      date: new Date().toISOString().split("T")[0],
      description,
      amount: Number(amount),
      drcode: drAccount?.code,
      crcode: crAccount?.code,
    };

    try {
      await createVoucher(payload);
      Alert.alert("Success", "Voucher saved successfully");
      setAmount("");
      setDrAccount(null);
      setCrAccount(null);
      setInvoice(null);
      setDescription("");
      loadData();
    } catch (e) {
      Alert.alert("Error", "Failed to save voucher");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#2563eb" }}>
      <LinearGradient colors={["#e0f2fe", "#ffffff"]} style={{ flex: 1 }}>
        <LinearGradient colors={["#2563eb", "#38bdf8"]} style={styles.header}>
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
            <Text style={styles.headerTitle}>Payment Voucher</Text>
            <Text style={styles.headerSub}>Add your expenses easily</Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 15, paddingBottom: 50 }}>
          <CustomDropdown
            label="Select Invoice (Optional)"
            icon="file-document-outline"
            data={invoices}
            value={invoice}
            onSelect={setInvoice}
            placeholder="Choose invoice"
            displayKey="Invoice_no"
          />

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Transaction Details</Text>
            <CustomDropdown
              label="Debit Account (Dr)"
              icon="arrow-down-bold-circle"
              data={accounts}
              value={drAccount}
              onSelect={setDrAccount}
              placeholder="Debit to..."
              displayKey="description"
            />
            <CustomDropdown
              label="Credit Account (Cr)"
              icon="arrow-up-bold-circle"
              data={accounts}
              value={crAccount}
              onSelect={setCrAccount}
              placeholder="Credit from..."
              displayKey="description"
            />
            <View style={{ marginTop: 15 }}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                placeholder="Enter amount"
                style={styles.input}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          <View style={{ marginTop: 15 }}>
            <Text style={styles.label}>Description / Narration</Text>
            <TextInput
              placeholder="Enter description"
              style={styles.input}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={submit}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              SAVE TRANSACTION
            </Text>
          </TouchableOpacity>

          <Text style={styles.tableTitle}>Recent Transactions</Text>

          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={true}
            style={styles.tableWrapper}
          >
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: 90 }]}>Date</Text>
                <Text style={[styles.th, { width: 90 }]}>Vch No</Text>
                <Text style={[styles.th, { width: 100 }]}>Cr Ac</Text>
                <Text style={[styles.th, { width: 100 }]}>Dr Ac</Text>
                <Text style={[styles.th, { width: 150 }]}>Desc</Text>
                <Text style={[styles.th, { width: 90 }]}>Amt</Text>
              </View>
              {vouchers.map((v, i) => (
                <Animated.View
                  key={i}
                  entering={FadeInDown.delay(i * 50)}
                  style={styles.tableRow}
                >
                  {/* Fixed Date formatting */}
                  <Text style={[styles.td, { width: 90 }]}>
                    {v.date ? v.date.substring(0, 10) : "-"}
                  </Text>
                  {/* Showing Database ID as Vch No */}
                  <Text style={[styles.td, { width: 90 }]}>{v.id || "-"}</Text>
                  <Text style={[styles.td, { width: 100 }]}>
                    {v.crcode || "-"}
                  </Text>
                  <Text style={[styles.td, { width: 100 }]}>
                    {v.drcode || "-"}
                  </Text>
                  <Text style={[styles.td, { width: 150 }]} numberOfLines={1}>
                    {v.description || "-"}
                  </Text>
                  <Text style={[styles.td, { width: 90 }]}>
                    {Number(v.amount).toLocaleString()}
                  </Text>
                </Animated.View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  headerSub: { color: "#dbeafe", marginTop: 4, fontSize: 14 },
  sectionContainer: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: { fontWeight: "bold", color: "#1e293b", marginBottom: 5 },
  label: { fontWeight: "600", color: "#475569", marginBottom: 5 },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  dropdownText: { flex: 1, color: "#334155" },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginTop: 10,
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: "#2563eb",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  tableTitle: {
    marginTop: 25,
    fontWeight: "bold",
    fontSize: 16,
    color: "#1e293b",
  },
  tableWrapper: { marginTop: 10 },
  table: { backgroundColor: "#fff", borderRadius: 12, padding: 10 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingBottom: 8,
    borderColor: "#e2e8f0",
  },
  th: { fontWeight: "bold", fontSize: 12, color: "#64748b" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: "#f1f5f9",
  },
  td: { fontSize: 12, color: "#1e293b" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    maxHeight: 300,
    padding: 10,
  },
  modalOption: { padding: 15, borderBottomWidth: 1, borderColor: "#f1f5f9" },
});
