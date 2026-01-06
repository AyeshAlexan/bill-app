import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Picker } from '@react-native-picker/picker';

export default function PaymentScreen({ route, navigation }) {
  const { bill } = route.params;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Collect Payment for Bill #{bill.billNo}</Text>

      <TextInput
        placeholder="Enter Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={styles.input}
      />

      <Picker
        selectedValue={method}
        onValueChange={(itemValue) => setMethod(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Cash" value="Cash" />
        <Picker.Item label="Card" value="Card" />
        <Picker.Item label="Bank" value="Bank" />
      </Picker>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Submit Payment</Text>
      </TouchableOpacity>
    </View>
  );
  
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f2f2f2" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  input: { padding: 15, backgroundColor: "#fff", borderRadius: 10, marginBottom: 20 },
  picker: { backgroundColor: "#fff", borderRadius: 10, marginBottom: 20 },
  button: { padding: 15, backgroundColor: "#4CAF50", borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});


