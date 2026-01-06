import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { shops } from "../data/dummyData";

export default function ShopListScreen({ navigation }) {
  return (
    <FlatList
      data={shops}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{ padding: 20 }}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Bills", { shop: item })}>
          <View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.location}>{item.location}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.pendingBills} Pending</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", justifyContent: "space-between", padding: 20, backgroundColor: "#fff", borderRadius: 10, marginBottom: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  name: { fontSize: 18, fontWeight: "bold" },
  location: { fontSize: 14, color: "#666", marginTop: 5 },
  badge: { backgroundColor: "#FF5252", borderRadius: 15, paddingHorizontal: 10, justifyContent: "center", alignItems: "center" },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
});

