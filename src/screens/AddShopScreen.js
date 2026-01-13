import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { addShop } from "../services/shopApi";
import Toast from "react-native-toast-message";

export default function AddShopScreen({ navigation }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [owner_name, setOwnerName] = useState("");
  const [contact_no, setContactNo] = useState("");
  const [saving, setSaving] = useState(false);

  const saveShop = async () => {
    if (!name.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Shop name is required",
        position: "top",
      });
      return;
    }

    if (saving) return;

    setSaving(true);

    try {
      const res = await addShop({
        name: name.trim(),
        location: location.trim(),
        owner_name: owner_name.trim(),
        contact_no: contact_no.trim(),
      });

      Toast.show({
        type: "success",
        text1: "Shop Added ✅",
        text2: res?.message || "Shop saved to database",
        position: "top",
      });

      // Go back to ShopList
      navigation.goBack();
    } catch (e) {
      console.log("ADD SHOP ERROR STATUS:", e?.response?.status);
      console.log("ADD SHOP ERROR DATA:", e?.response?.data);
      console.log("ADD SHOP ERROR MSG:", e?.message);

      let msg = "Failed to add shop";

      if (e?.response?.status === 422) {
        msg = "Validation failed (check backend rules)";
      } else if (e?.response?.status === 401) {
        msg = "Unauthorized request";
      } else if (e?.response?.data?.message) {
        msg = e.response.data.message;
      }

      Toast.show({
        type: "error",
        text1: "Error",
        text2: msg,
        position: "top",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerIconBtn}
        >
          <MaterialCommunityIcons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Shop</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        {/* FORM CARD */}
        <View style={styles.card}>
          <Text style={styles.label}>Shop Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter shop name"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter location"
            placeholderTextColor="#94a3b8"
            value={location}
            onChangeText={setLocation}
          />

          <Text style={styles.label}>Owner Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter owner name"
            placeholderTextColor="#94a3b8"
            value={owner_name}
            onChangeText={setOwnerName}
          />

          <Text style={styles.label}>Contact No</Text>
          <TextInput
            style={styles.input}
            placeholder="07XXXXXXXX"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={contact_no}
            onChangeText={setContactNo}
          />
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!name.trim() || saving) && styles.submitBtnDisabled,
          ]}
          disabled={!name.trim() || saving}
          onPress={saveShop}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>
            {saving ? "Saving..." : "Save Shop"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
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
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 12,
  },

  form: { padding: 20 },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    color: "#0f172a",
  },

  submitBtn: {
    backgroundColor: "#10b981",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnDisabled: {
    backgroundColor: "#cbd5e1",
  },
  submitText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
