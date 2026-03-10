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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons"; // Modern Icons
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
      colors={["#f8fafc", "#7bd099"]} 
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "center" }}
        >
          {/* --- FIXED SUCCESS MODAL --- */}
          {/* 1. Set transparent={true} so the modal can have a custom background */}
          <Modal visible={loginSuccess} transparent={true} animationType="fade">
            {/* 2. Replace View with LinearGradient to match the main screen */}
            <LinearGradient 
              colors={["#f8fafc", "#7bd099"]} 
              style={styles.overlay}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            >
              <LottieView
                autoPlay
                ref={animation}
                style={styles.lottieFullscreen}
                source={require("../assets/Cred tick animation (2).json")}
                loop={false}
                speed={0.6} 
              />
            </LinearGradient>
          </Modal>

          <View style={styles.glassWrapper}>
            <View style={styles.card}>
              <Image
                source={require("../assets/bill-logo1.png")}
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

              {/* USERNAME FIELD WITH ICON */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="account-outline" size={20} color="#64748b" style={styles.fieldIcon} />
                  <TextInput
                    placeholder="Username"
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              {/* PASSWORD FIELD WITH ICON */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="lock-outline" size={20} color="#64748b" style={styles.fieldIcon} />
                  <TextInput
                    placeholder="Password"
                    secureTextEntry
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
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
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    flex: 1,
    // Background is now handled by the LinearGradient inside the Modal
    justifyContent: "center",
    alignItems: "center",
  },
  lottieFullscreen: { width: 350, height: 350 },
  glassWrapper: {
    marginHorizontal: 25,
    borderRadius: 35,
    padding: 1.5, 
    backgroundColor: "rgba(255, 255, 255, 0.4)", // Edge highlight
    overflow: 'hidden',
  },
  card: { 
    // FIX: Significant drop in opacity to reveal the background
    backgroundColor: "rgba(255, 255, 255, 0.25)", 
    borderRadius: 34, 
    padding: 25, 
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  logo: { width: 180, height: 60, marginBottom: 10 },
  welcomeText: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },
  signInSub: { color: "#475569", marginBottom: 20, fontWeight: "500" },
  errorBox: { backgroundColor: "rgba(254, 242, 242, 0.8)", padding: 10, width: "100%", borderRadius: 12, marginBottom: 12 },
  errorText: { color: "#B91C1C", fontWeight: "600", textAlign: 'center' },
  inputGroup: { width: "100%", marginBottom: 15 },
  label: { color: "#1e293b", fontWeight: "700", marginBottom: 6, fontSize: 13 },
  
  // NEW: Modern Input Styling with Icons
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255, 255, 255, 0.5)", 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 12,
  },
  fieldIcon: { marginRight: 8 },
  input: { 
    flex: 1,
    paddingVertical: 14, 
    color: "#1e293b",
    fontSize: 15,
  },

  button: { 
    backgroundColor: "#30a830", 
    padding: 16, 
    borderRadius: 15, 
    width: "100%", 
    alignItems: "center", 
    marginTop: 10,
    elevation: 4, // Button pop
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
  footerContainer: { marginTop: 25, alignItems: "center" },
  designedByText: { color: "#64748b", fontSize: 9, fontWeight: "800", marginBottom: 5 },
  footerLogo: { width: 100, height: 35, opacity: 0.8 },
});