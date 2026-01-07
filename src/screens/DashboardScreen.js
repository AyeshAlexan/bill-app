import React from 'react';
import ShopList from "../screens/ShopListScreen"
import PendingBills from "../screens/PaymentScreen"
import Payment from "../screens/PaymentScreen"
// 1. Add Image to imports
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DashboardScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSub}>Hello, ayesh!</Text>
      </View>

      <View style={styles.statGrid}>
        <StatCard color="#10b981" icon="store" label="Shops" value="3" />
        <StatCard color="#ef4444" icon="clock-outline" label="Pending Bills" value="5" />
        <StatCard color="#f97316" icon="trending-up" label="Collected" value="Rs.4,500" />
        <StatCard color="#3b82f6" icon="check-all" label="Paid Bills" value="1" />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionRow}>
        <ActionBtn 
    isCustomImage 
    imageSource={require('../assets/shop.jpg')} 
    label="Shops" 
    onPress={() => navigation.navigate("ShopList")} // Matches name in Navigator
  />
  
  <ActionBtn 
    isCustomImage 
    imageSource={require('../assets/pending.png')} 
    label="Pending Bills" 
    onPress={() => navigation.navigate("BillList", { filter: 'pending' })} // Navigates to the list
  />
  
  <ActionBtn 
    isCustomImage 
    imageSource={require('../assets/payment-icon.png')} 
    label="Payments" 
    onPress={() => navigation.navigate("Payment")} // Matches name in Navigator
  />
      </View>
    </ScrollView>
  );
}

const StatCard = ({ color, icon, label, value }) => (
  <View style={[styles.statCard, { backgroundColor: color }]}>
    <MaterialCommunityIcons name={icon} size={24} color="white" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// Updated ActionBtn to handle both Icons and Images
const ActionBtn = ({ icon, label, onPress, isCustomImage, imageSource }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
    {isCustomImage ? (
      <Image source={imageSource} style={styles.customIcon} />
    ) : (
      <MaterialCommunityIcons name={icon} size={28} color="#3b82f6" />
    )}
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#2563eb', padding: 40, paddingTop: 60, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: '#bfdbfe', fontSize: 16 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, justifyContent: 'space-between' },
  statCard: { width: '47%', padding: 20, borderRadius: 20, margin: 5, height: 150, justifyContent: 'space-between' },
  statValue: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: 'white', opacity: 0.9 },
  sectionTitle: { padding: 20, fontSize: 18, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', paddingHorizontal: 15, justifyContent: 'space-around' },
  actionBtn: { backgroundColor: 'white', padding: 20, borderRadius: 20, width: '30%', alignItems: 'center', elevation: 2 },
  actionLabel: { fontSize: 10, marginTop: 5, textAlign: 'center', fontWeight: 'bold' },
  // Added style for the custom image
  customIcon: { width: 28, height: 28, resizeMode: 'contain' }
});