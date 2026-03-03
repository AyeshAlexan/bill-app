import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login } from "../services/authApi";
import { setAuthToken } from "../services/Api";

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const onSignIn = async () => {
    setErrorText("");

    if (!username.trim() || !password.trim()) {
      setErrorText("Please enter username and password");
      return;
    }

    try {
      setLoading(true);

      const data = await login(username.trim(), password);

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      setAuthToken(data.token);

      navigation.replace("Dashboard");
    } catch (e) {
      const status = e?.response?.status;
      const backendMsg = e?.response?.data?.message;

      let msg = "Login failed. Please try again.";
      if (status === 401) msg = backendMsg || "Invalid username or password";
      else if (status === 422) msg = "Please fill all fields correctly";
      else if (e.message?.includes("Network Error"))
        msg = "Cannot connect to server. Check backend is running.";

      setErrorText(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Image
          source={require("../assets/bill-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.signInSub}>Sign in to continue bill collection</Text>

        {!!errorText && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            placeholder="Enter your username"
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="Enter your password"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={onSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>Secure bill collection system</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    padding: 10,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 30,
    padding: 30,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  logo: { width: 250, height: 100, marginBottom: 10 },
  welcomeText: { fontSize: 22, fontWeight: "bold", color: "#1e293b" },
  signInSub: { color: "#64748b", marginBottom: 20 },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    padding: 10,
    width: "100%",
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: { color: "#B91C1C", fontWeight: "600" },
  inputGroup: { width: "100%", marginBottom: 15 },
  label: {
    color: "#475569",
    fontWeight: "600",
    marginBottom: 5,
    marginLeft: 5,
  },
  input: { backgroundColor: "#f1f5f9", padding: 15, borderRadius: 15 },
  button: {
    backgroundColor: "#58c058",
    padding: 18,
    borderRadius: 15,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
  footerText: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 25,
    textTransform: "uppercase",
  },
});
