import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function DashboardScreen({ navigation }) {
  const [activeStat, setActiveStat] = useState("shops");

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSub}>Hello, Ayesh!</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => navigation.replace("Login")}
        >
          <MaterialCommunityIcons name="logout" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* STAT CARDS */}
      <View style={styles.statGrid}>
        <StatCard
          color="#10b981"
          icon="store"
          label="Shops"
          value="3"
          active={activeStat === "shops"}
          onPress={() => setActiveStat("shops")}
        />

        <StatCard
          color="#ef4444"
          icon="clock-outline"
          label="Pending Bills"
          value="5"
          active={activeStat === "pending"}
          onPress={() => setActiveStat("pending")}
        />

        <StatCard
          color="#f97316"
          icon="trending-up"
          label="Collected"
          value="Rs. 4,500"
          active={activeStat === "collected"}
          onPress={() => setActiveStat("collected")}
        />

        <StatCard
          color="#3b82f6"
          icon="check-all"
          label="Paid Bills"
          value="1"
          active={activeStat === "paid"}
          onPress={() => setActiveStat("paid")}
        />
      </View>

      {/* QUICK ACTIONS */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionRow}>
        <ActionBtn
          isCustomImage
          imageSource={require("../assets/shop.jpg")}
          label="Shops"
          onPress={() => navigation.navigate("ShopList")}
        />

        <ActionBtn
          isCustomImage
          imageSource={require("../assets/pending.png")}
          label="Pending Bills"
          onPress={() => navigation.navigate("PendingBills")}
        />

        <ActionBtn
          isCustomImage
          imageSource={require("../assets/payment-icon.png")}
          label="Payments"
          onPress={() => navigation.navigate("Payment")}
        />
      </View>

      {/* RECENT ACTIVITY */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.activityBox}>
        {renderRecentActivity(activeStat)}
      </View>
      {/* FAB to Add Bill */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate("AddBill")} >
        <MaterialCommunityIcons name="plus" size={32} color="white" />
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= ACTIVITY DATA ================= */

const renderRecentActivity = (type) => {
  switch (type) {
    case "shops":
      return (
        <>
          <Text style={styles.activityItem}>🏪 Visited: Kandy Central Stores</Text>
          <Text style={styles.activityItem}>🏪 Visited: Katugastota Mart</Text>
          <Text style={styles.activityItem}>🏪 Not Visited: Peradeniya Stores</Text>
        </>
      );

    case "pending":
      return (
        <>
          <Text style={styles.activityItem}>⏳ Bill #1023 – Rs. 1,200</Text>
          <Text style={styles.activityItem}>⏳ Bill #1027 – Rs. 850</Text>
          <Text style={styles.activityItem}>⏳ Bill #1031 – Rs. 2,000</Text>
        </>
      );

    case "collected":
      return (
        <>
          <Text style={styles.activityItem}>💰 Rs. 1,500 from Katugastota Mart</Text>
          <Text style={styles.activityItem}>💰 Rs. 2,000 from Kandy Stores</Text>
          <Text style={styles.activityItem}>💰 Rs. 1,000 from Peradeniya</Text>
        </>
      );

    case "paid":
      return (
        <>
          <Text style={styles.activityItem}>✔ Bill #1009 fully paid</Text>
          <Text style={styles.activityItem}>✔ Bill #1015 fully paid</Text>
        </>
      );

    default:
      return null;
  }
};

/* ================= COMPONENTS ================= */

const StatCard = ({ color, icon, label, value, onPress, active }) => (
  <TouchableOpacity
    style={[
      styles.statCard,
      {
        backgroundColor: color,
        borderWidth: active ? 3 : 0,
        borderColor: "#111827",
      },
    ]}
    onPress={onPress}
  >
    <MaterialCommunityIcons name={icon} size={26} color="white" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const ActionBtn = ({ label, onPress, isCustomImage, imageSource }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
    {isCustomImage && (
      <Image source={imageSource} style={styles.customIcon} />
    )}
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  header: {
    backgroundColor: "#2563eb",
    padding: 40,
    paddingTop: 60,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  headerTitle: { color: "white", fontSize: 26, fontWeight: "bold" },
  headerSub: { color: "#bfdbfe", fontSize: 16 },

  logoutBtn: {
    position: "absolute",
    right: 25,
    top: 65,
  },

  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    justifyContent: "space-between",
  },

  statCard: {
    width: "47%",
    padding: 20,
    borderRadius: 20,
    margin: 5,
    height: 150,
    justifyContent: "space-between",
  },

  statValue: { color: "white", fontSize: 22, fontWeight: "bold" },
  statLabel: { color: "white", opacity: 0.9 },

  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 20,
    fontSize: 18,
    fontWeight: "bold",
  },

  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 15,
    justifyContent: "space-around",
    marginTop: 15,
  },

  actionBtn: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    width: "30%",
    alignItems: "center",
    elevation: 2,
  },

  actionLabel: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: "bold",
  },

  customIcon: { width: 28, height: 28, resizeMode: "contain" },

  activityBox: {
    backgroundColor: "white",
    margin: 20,
    padding: 15,
    borderRadius: 15,
    elevation: 2,
  },

  activityItem: {
    fontSize: 14,
    marginBottom: 8,
    color: "#374151",
  },

// Add this to your StyleSheet
fab: {
  position: 'absolute',
  width: 60,
  height: 60,
  alignItems: 'center',
  justifyContent: 'center',
  right: 20,
  bottom: 20,
  backgroundColor: '#2563eb', // Matches your dashboard header
  borderRadius: 30,
  elevation: 8,
  shadowColor: '#000',
  shadowOpacity: 0.3,
  shadowRadius: 3,
}
});
