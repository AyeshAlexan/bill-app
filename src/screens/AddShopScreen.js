import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { addShop } from "../services/shopApi";
import Toast from "react-native-toast-message";

export default function AddShopScreen({ navigation, route }) {
  const { route: selectedRoute } = route.params || {};

  // Form states matching your DB column names exactly
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address1, setAddress1] = useState("");
  const [city1, setCity1] = useState("");
  const [contact1, setContact1] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const saveShop = async () => {
    // Validation
    if (!code.trim() || !name.trim() || !address1.trim() || !city1.trim() || !contact1.trim() || !email.trim()) {
      Toast.show({ type: "error", text1: "Error", text2: "Please fill all required fields" });
      return;
    }

    setSaving(true);
    try {
      // Keys here must match the $request->FieldName in Laravel
      await addShop({
        Code: code.trim(),
        Name: name.trim(),
        Address_1: address1.trim(),
        City_1: city1.trim(),
        Contact_1: contact1.trim(),
        Email: email.trim(),
        route: selectedRoute,
      });

      Toast.show({ type: "success", text1: "Shop Added ✅" });
      navigation.goBack();
    } catch (e) {
      Toast.show({ 
        type: "error", 
        text1: "Error", 
        text2: e?.response?.data?.message || "Check console for SQL error" 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <MaterialCommunityIcons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Shop</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <View style={styles.card}>
          <Text style={styles.label}>Shop Code *</Text>
          <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="CUS001" />

          <Text style={styles.label}>Shop Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Shop Name" />

          <Text style={styles.label}>Address *</Text>
          <TextInput style={styles.input} value={address1} onChangeText={setAddress1} placeholder="Address Line 1" />

          <Text style={styles.label}>City *</Text>
          <TextInput style={styles.input} value={city1} onChangeText={setCity1} placeholder="City" />

          <Text style={styles.label}>Contact No *</Text>
          <TextInput style={styles.input} value={contact1} onChangeText={setContact1} placeholder="07XXXXXXXX" keyboardType="phone-pad" />

          <Text style={styles.label}>Email *</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@test.com" keyboardType="email-address" />
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, (!name.trim() || saving) && styles.submitBtnDisabled]} 
          onPress={saveShop} 
          disabled={saving}
        >
          <Text style={styles.submitText}>{saving ? "Saving..." : "Save Shop"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { backgroundColor: "#00b894", padding: 25, paddingTop: 50, flexDirection: "row", alignItems: "center" },
  headerIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold", marginLeft: 12 },
  form: { padding: 20 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "bold", color: "#64748b", marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, color: "#0f172a" },
  submitBtn: { backgroundColor: "#10b981", padding: 18, borderRadius: 15, alignItems: "center", marginTop: 10 },
  submitBtnDisabled: { backgroundColor: "#cbd5e1" },
  submitText: { color: "white", fontWeight: "bold", fontSize: 16 },
});