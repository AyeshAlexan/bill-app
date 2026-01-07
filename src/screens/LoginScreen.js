import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, SafeAreaView } from 'react-native';

export default function LoginScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../assets/bill-logo.png')} style={styles.logo} resizeMode="contain" />
        
        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.signInSub}>Sign in to continue bill collection</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput placeholder="Enter your username" style={styles.input} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput placeholder="Enter your password" secureTextEntry style={styles.input} />
        </View>

        <TouchableOpacity style={styles.button} onPress={() => navigation.replace('Dashboard')}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>Secure bill collection system</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', padding: 10 },
  card: { backgroundColor: 'white', borderRadius: 30, padding: 30, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10 },
  logo: { width: 250, height: 100, marginBottom: 10 },
  appName: { fontSize: 28, fontWeight: 'bold', color: '#004aad' },
  appSub: { color: '#94a3b8', fontSize: 12, marginBottom: 20 },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  signInSub: { color: '#64748b', marginBottom: 30 },
  inputGroup: { width: '100%', marginBottom: 15 },
  label: { color: '#475569', fontWeight: '600', marginBottom: 5, marginLeft: 5 },
  input: { backgroundColor: '#f1f5f9', padding: 15, borderRadius: 15, width: '100%' },
  button: { backgroundColor: '#10b981', padding: 18, borderRadius: 15, width: '100%', alignItems: 'center', marginTop: 20 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  footerText: { color: '#94a3b8', fontSize: 10, marginTop: 30, textTransform: 'uppercase' }
});