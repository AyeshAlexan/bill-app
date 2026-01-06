import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function BillDetailScreen({ route, navigation }) {
  const { bill } = route.params;

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#f2f2f2" }}>
      <View style={styles.card}>
        <Text style={styles.title}>Bill #{bill.billNo}</Text>
        <Text>Total: Rs.{bill.total}</Text>
        <Text>Paid: Rs.{bill.paid}</Text>
        <Text>Due: Rs.{bill.total - bill.paid}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Payment", { bill })}>
        <Text style={styles.buttonText}>Collect Payment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, backgroundColor: "#fff", borderRadius: 10, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  button: { padding: 15, backgroundColor: "#4CAF50", borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
