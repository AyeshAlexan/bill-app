import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Text,
} from "react-native";
import LottieView from "lottie-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login } from "../services/authApi";
import { setAuthToken } from "../services/Api";

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [errorText, setErrorText] = useState("");
  
  const animation = useRef(null);

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

      setLoading(false);
      setLoginSuccess(true);

      // Delay to let the slow animation finish before switching screens
      setTimeout(() => {
        setLoginSuccess(false);
        navigation.replace("Dashboard");
      }, 3000);

    } catch (e) {
      setLoading(false);
      setErrorText("Invalid username or password");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* --- FULL WHITE LOTTIE OVERLAY --- */}
      <Modal visible={loginSuccess} transparent={false} animationType="fade">
        <View style={styles.overlay}>
          <LottieView
            autoPlay
            ref={animation}
            style={styles.lottieFullscreen}
            source={require("../assets/Cred tick animation (2).json")}
            loop={false}
            speed={0.6} 
          />
        </View>
      </Modal>

      <View style={styles.card}>
        <Image
          source={require("../assets/bill-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.signInSub}>Sign in to continue</Text>

        {!!errorText && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            placeholder="Username"
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={onSignIn}
          disabled={loading || loginSuccess}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <Text style={styles.designedByText}>DESIGNED BY</Text>
          <Image
            source={require("../assets/Company- logo.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", justifyContent: "center", padding: 10 },
  overlay: {
    flex: 1,
    backgroundColor: "#FFFFFF", // ✅ Pure white solid background
    justifyContent: "center",
    alignItems: "center",
  },
  lottieFullscreen: {
    width: 350, // ✅ Slightly bigger as requested
    height: 350,
  },
  card: { backgroundColor: "white", borderRadius: 30, padding: 30, alignItems: "center" },
  logo: { width: 250, height: 100, marginBottom: 10 },
  welcomeText: { fontSize: 22, fontWeight: "bold", color: "#1e293b" },
  signInSub: { color: "#64748b", marginBottom: 20 },
  errorBox: { backgroundColor: "#FEF2F2", padding: 10, width: "100%", borderRadius: 12, marginBottom: 12 },
  errorText: { color: "#B91C1C", fontWeight: "600" },
  inputGroup: { width: "100%", marginBottom: 15 },
  label: { color: "#475569", fontWeight: "600", marginBottom: 5 },
  input: { backgroundColor: "#f1f5f9", padding: 15, borderRadius: 15 },
  button: { backgroundColor: "#58c058", padding: 18, borderRadius: 15, width: "100%", alignItems: "center" },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
  footerContainer: { marginTop: 30, alignItems: "center" },
  designedByText: { color: "#94a3b8", fontSize: 9, fontWeight: "700", marginBottom: 5 },
  footerLogo: { width: 120, height: 40 },
});