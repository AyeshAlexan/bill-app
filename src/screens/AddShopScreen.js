import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar, FlatList, ActivityIndicator
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
// ✅ Import fetchPendingShops
import { addShop, fetchCities, fetchPendingShops } from "../services/shopApi"; 
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from "react-native-toast-message";

export default function AddShopScreen({ navigation, route }) {
  const { route: selectedRoute } = route.params || {};

  // Form States
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address1, setAddress1] = useState("");
  const [city1, setCity1] = useState("");
  const [contact1, setContact1] = useState("");
  const [email, setEmail] = useState("");

  // UI Control States
  const [viewMode, setViewMode] = useState("form"); // "form", "pending", "approved", "rejected"
  const [shopList, setShopList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      const data = await fetchCities();
      setCities(data);
      setFilteredCities(data);
    } catch (err) {
      console.log("City load error", err);
    }
  };

  // ✅ NEW: Function to load list data dynamically
  const loadStatusData = async (status) => {
    setViewMode(status);
    setLoadingList(true);
    try {
      const data = await fetchPendingShops(status);
      setShopList(data);
    } catch (err) {
      Toast.show({ type: "error", text1: "Error", text2: "Failed to load list" });
    } finally {
      setLoadingList(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const filtered = cities.filter((item) =>
        item.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities(cities);
    }
  };

  const saveShop = async () => {
    if (!name || !address1 || !city1 || !contact1) {
      Toast.show({ type: "error", text1: "Required", text2: "Please fill all marked fields" });
      return;
    }

    setSaving(true);
    try {
      await addShop({
        Code: code,
        Name: name,
        First_name: name,
        Address_1: address1,
        City_1: city1,
        Contact_1: contact1,
        Email: email,
        route: selectedRoute,
      });

      Toast.show({ type: "success", text1: "Submitted", text2: "Shop sent for Admin approval" });
      // Reset form and stay on screen
      setName(""); setAddress1(""); setCity1(""); setContact1(""); setEmail("");
      loadStatusData('pending'); // Switch to pending list to show the new entry
    } catch (e) {
      Toast.show({ type: "error", text1: "Error", text2: "Error saving shop" });
    } finally {
      setSaving(false);
    }
  };

  // ✅ NEW: Component to render each shop in the list
  const renderShopItem = ({ item }) => (
    <View style={styles.shopCard}>
      <View style={styles.shopInfo}>
        <Text style={styles.shopNameText}>{item.Name}</Text>
        <Text style={styles.shopAddrText}>{item.Address_1}</Text>
        <View style={styles.badgeRow}>
            <View style={styles.cityBadge}>
                <Text style={styles.cityBadgeText}>{item.City_1}</Text>
            </View>
            <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>
      <MaterialCommunityIcons 
        name={viewMode === 'approved' ? "check-circle" : viewMode === 'rejected' ? "close-circle" : "clock-fast"} 
        size={24} 
        color={viewMode === 'approved' ? "#10b981" : viewMode === 'rejected' ? "#ef4444" : "#f59e0b"} 
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar barStyle="light-content" backgroundColor="#30a830" />
      <SafeAreaView style={{ backgroundColor: "#30a830" }} edges={['top']} />

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => viewMode === 'form' ? navigation.goBack() : setViewMode('form')} style={styles.backBtnWrapper}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {viewMode === 'form' ? "Register New Shop" : `${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Shops`}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ✅ DYNAMIC CONTENT AREA */}
        {viewMode === "form" ? (
          <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Required Information</Text>
            <View style={styles.card}>
              {/* Shop Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Shop Name *</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="storefront-outline" size={20} color="#94a3b8" />
                  <TextInput style={styles.input} placeholder="Enter Shop Name" value={name} onChangeText={setName} />
                </View>
              </View>

              {/* Address Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address *</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="map-marker-outline" size={20} color="#94a3b8" />
                  <TextInput style={styles.input} placeholder="Street, Area" value={address1} onChangeText={setAddress1} />
                </View>
              </View>

              {/* City Dropdown (Searchable) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Route / City *</Text>
                <TouchableOpacity style={[styles.inputWrapper, showCityDropdown && styles.activeDropdown]} onPress={() => setShowCityDropdown(!showCityDropdown)}>
                  <MaterialCommunityIcons name="city-variant-outline" size={20} color="#94a3b8" />
                  <Text style={[styles.inputText, { color: city1 ? "#1e293b" : "#94a3b8" }]}>{city1 || "Select Route"}</Text>
                  <MaterialCommunityIcons name={showCityDropdown ? "chevron-up" : "chevron-down"} size={22} color="#64748b" />
                </TouchableOpacity>
                {showCityDropdown && (
                  <View style={styles.dropdownList}>
                    <View style={styles.searchBarWrapper}>
                      <Ionicons name="search" size={18} color="#94a3b8" />
                      <TextInput style={styles.searchInput} placeholder="Search route..." value={searchQuery} onChangeText={handleSearch} autoFocus />
                    </View>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {filteredCities.map((city, index) => (
                        <TouchableOpacity key={index} style={styles.dropdownItem} onPress={() => { setCity1(city); setShowCityDropdown(false); }}>
                          <Text style={styles.dropdownText}>{city}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Contact Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact Number *</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="phone-outline" size={20} color="#94a3b8" />
                  <TextInput style={styles.input} placeholder="07X XXX XXXX" value={contact1} onChangeText={setContact1} keyboardType="phone-pad" />
                </View>
              </View>
            </View>

            <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={saveShop} disabled={saving}>
              <Text style={styles.submitText}>{saving ? "Registering..." : "Submit for Approval"}</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* ✅ LIST VIEW */
          <View style={{ flex: 1, padding: 20 }}>
            {loadingList ? (
              <ActivityIndicator size="large" color="#30a830" style={{ marginTop: 50 }} />
            ) : (
              <FlatList
                data={shopList}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderShopItem}
                ListEmptyComponent={<Text style={styles.noResultText}>No {viewMode} shops found</Text>}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}

        {/* STATUS NAV BAR */}
        <View style={styles.statusNav}>
          <TouchableOpacity 
            style={[styles.statusItem, viewMode === 'pending' && styles.activeTab]} 
            onPress={() => loadStatusData('pending')}
          >
            <MaterialCommunityIcons name="clock-outline" size={24} color="#f59e0b" />
            <Text style={[styles.statusText, {color: "#f59e0b"}]}>Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statusItem, viewMode === 'approved' && styles.activeTab]} 
            onPress={() => loadStatusData('approved')}
          >
            <MaterialCommunityIcons name="check-decagram-outline" size={24} color="#10b981" />
            <Text style={[styles.statusText, {color: "#10b981"}]}>Approved</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statusItem, viewMode === 'rejected' && styles.activeTab]} 
            onPress={() => loadStatusData('rejected')}
          >
            <MaterialCommunityIcons name="close-circle-outline" size={24} color="#ef4444" />
            <Text style={[styles.statusText, {color: "#ef4444"}]}>Rejected</Text>
          </TouchableOpacity>
        </View>
      </View>
      <SafeAreaView style={{ backgroundColor: "#000" }} edges={['bottom']} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#30a830",
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtnWrapper: { padding: 8, marginLeft: -8 },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "800" },
  form: { padding: 20, marginTop: 15 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#64748b", marginBottom: 12, textTransform: "uppercase" },
  card: { backgroundColor: "white", borderRadius: 20, padding: 20, elevation: 3, marginBottom: 25 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#f1f5f9", borderRadius: 12, paddingHorizontal: 12, backgroundColor: "#f8fafc", height: 50 },
  activeDropdown: { borderColor: "#30a830" },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: "#1e293b" },
  inputText: { flex: 1, marginLeft: 10, fontSize: 15 },
  dropdownList: { backgroundColor: "white", borderRadius: 15, marginTop: 8, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden", elevation: 5 },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', margin: 10, paddingHorizontal: 10, borderRadius: 10, height: 40 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1e293b' },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  dropdownText: { fontSize: 14, color: "#334155" },
  submitBtn: { backgroundColor: "#30a830", paddingVertical: 16, borderRadius: 16, alignItems: "center", elevation: 5 },
  submitText: { color: "white", fontSize: 16, fontWeight: "bold" },
  
  // ✅ NEW LIST STYLES
  shopCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  shopInfo: { flex: 1 },
  shopNameText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  shopAddrText: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  cityBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 10 },
  cityBadgeText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  dateText: { fontSize: 11, color: '#94a3b8' },
  noResultText: { textAlign: 'center', marginTop: 40, color: '#94a3b8' },

  statusNav: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, backgroundColor: "white", borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 20 },
  statusItem: { alignItems: "center", paddingHorizontal: 15, paddingVertical: 5 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#30a830', backgroundColor: '#f0fdf4', borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "800", marginTop: 4 }
});