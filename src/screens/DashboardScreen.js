import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from "react-native";
import { shops, bills } from "../data/dummyData";

export default function DashboardScreen({ navigation }) {
  const totalShops = shops.length;
  const totalPendingBills = bills.filter(b => b.status !== "Paid").length;
  const totalCollected = bills.reduce((sum, b) => sum + b.paid, 0);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Hello, Collector!</Text>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.card, { backgroundColor: "#4CAF50" }]}>
          <Text style={styles.cardTitle}>Shops</Text>
          <Text style={styles.cardValue}>{totalShops}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: "#FF5252" }]}>
          <Text style={styles.cardTitle}>Pending Bills</Text>
          <Text style={styles.cardValue}>{totalPendingBills}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: "#FFA500" }]}>
          <Text style={styles.cardTitle}>Collected</Text>
          <Text style={styles.cardValue}>Rs.{totalCollected}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("Shops")}>
          <Image source={require("../assets/shop.jpg")} style={styles.actionIcon} />
          <Text style={styles.actionText}>Shops</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("Bills")}>
          <Image source={require("../assets/bill-logo.png")} style={styles.actionIcon} />
          <Text style={styles.actionText}>Pending Bills</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("Payment")}>
          <Image source={require("../assets/payment-icon.png")} style={styles.actionIcon} />
          <Text style={styles.actionText}>Payments</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f2", padding: 20 },
  header: { fontSize: 26, fontWeight: "bold", marginBottom: 20, color: "#333" },
  summaryContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  card: { flex: 1, marginHorizontal: 5, padding: 20, borderRadius: 15, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  cardTitle: { color: "#fff", fontSize: 16, marginBottom: 10 },
  cardValue: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  actionsContainer: { flexDirection: "row", justifyContent: "space-between" },
  actionCard: { flex: 1, marginHorizontal: 5, padding: 20, backgroundColor: "#fff", borderRadius: 15, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  actionIcon: { width: 50, height: 50, marginBottom: 10 },
  actionText: { fontSize: 16, fontWeight: "bold", color: "#333" },
});
