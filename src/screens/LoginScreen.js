 import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from "react-native";

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      <Image source={require("../assets/bill-logo.png")} style={styles.logo} />
      <Text style={styles.title}>Billing App</Text>

      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={() => navigation.replace("Dashboard")}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text style={styles.forgot}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#f2f2f2" },
  logo: { width: 120, height: 120, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 30, color: "#333" },
  input: { width: "100%", padding: 15, marginBottom: 15, borderRadius: 10, backgroundColor: "#fff", fontSize: 16 },
  button: { width: "100%", padding: 15, borderRadius: 10, backgroundColor: "#4CAF50", alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  forgot: { marginTop: 15, color: "#888" },

});