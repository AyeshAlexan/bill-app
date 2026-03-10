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
import { LinearGradient } from "expo-linear-gradient"; // Ensure this is installed
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
    <LinearGradient
      // Deep Slate to your Brand Green
      colors={["#f8fafc", "#7bd099"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1, justifyContent: "center" }}>
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
              placeholderTextColor="#94a3b8"
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
              placeholderTextColor="#94a3b8"
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  lottieFullscreen: {
    width: 350,
    height: 350,
  },
  card: { 
    backgroundColor: "white", 
    borderRadius: 35, // More rounded for modern look
    padding: 30, 
    marginHorizontal: 20,
    alignItems: "center",
    // Adding shadow to lift the card off the gradient
    elevation: 15,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  logo: { width: 220, height: 80, marginBottom: 10 },
  welcomeText: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },
  signInSub: { color: "#64748b", marginBottom: 25 },
  errorBox: { backgroundColor: "#FEF2F2", padding: 10, width: "100%", borderRadius: 12, marginBottom: 12 },
  errorText: { color: "#B91C1C", fontWeight: "600", textAlign: 'center' },
  inputGroup: { width: "100%", marginBottom: 15 },
  label: { color: "#475569", fontWeight: "600", marginBottom: 8, fontSize: 13 },
  input: { backgroundColor: "#f8fafc", padding: 16, borderRadius: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  button: { backgroundColor: "#30a830", padding: 18, borderRadius: 15, width: "100%", alignItems: "center", marginTop: 10 },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
  footerContainer: { marginTop: 30, alignItems: "center" },
  designedByText: { color: "#94a3b8", fontSize: 9, fontWeight: "700", marginBottom: 5 },
  footerLogo: { width: 100, height: 35 },
});