import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { bills } from "../data/dummyData";

export default function BillListScreen({ route, navigation }) {
  const { shop } = route.params;
  const shopBills = bills.filter(b => b.shopId === shop.id);

  const getStatusColor = (status) => {
    if (status === "Paid") return "#4CAF50";
    if (status === "Partial") return "#FFA500";
    return "#FF5252";
  };

  return (
    <FlatList
      data={shopBills}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{ padding: 20 }}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("BillDetails", { bill: item })}>
          <View>
            <Text style={styles.billNo}>Bill #{item.billNo}</Text>
            <Text>Total: Rs.{item.total}</Text>
          </View>
          <View style={[styles.status, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", justifyContent: "space-between", padding: 20, backgroundColor: "#fff", borderRadius: 10, marginBottom: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  billNo: { fontWeight: "bold", fontSize: 16 },
  status: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12 },
  statusText: { color: "#fff", fontWeight: "bold" },
});
