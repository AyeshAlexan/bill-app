import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function BillDetailScreen({ navigation }) {
  const [baseAmount, setBaseAmount] = useState('');
  const vat = baseAmount ? (parseFloat(baseAmount) * 0.15).toFixed(2) : '0.00';
  const totalPayable = baseAmount ? (parseFloat(baseAmount) + parseFloat(vat)).toFixed(2) : '0.00';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialCommunityIcons name="arrow-left" size={24} color="white" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Details</Text>
        <Text style={styles.headerSub}>Kandy City Store</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.billTop}>
            <View style={styles.iconBox}><MaterialCommunityIcons name="file-document" size={24} color="#3b82f6" /></View>
            <View style={{ flex: 1, marginLeft: 12 }}><Text style={styles.billNo}>Bill #INV-2026-001</Text><Text style={styles.date}>2026-01-05</Text></View>
            <View style={styles.statusBadge}><Text style={styles.statusText}>Pending</Text></View>
          </View>
          
          <Text style={styles.sectionLabel}>Items</Text>
          <View style={styles.itemRow}><View><Text style={styles.itemName}>Rice - 25kg</Text><Text style={styles.itemQty}>Qty: 2</Text></View><Text style={styles.itemPrice}>Rs.8,000</Text></View>
          <View style={styles.itemRow}><View><Text style={styles.itemName}>Sugar - 5kg</Text><Text style={styles.itemQty}>Qty: 3</Text></View><Text style={styles.itemPrice}>Rs.7,000</Text></View>
          
          <View style={styles.divider} />
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Total Amount</Text><Text style={styles.totalValue}>Rs.15,000</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Due Amount</Text><Text style={[styles.totalValue, { color: '#ef4444' }]}>Rs.15,000</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Collect Payment</Text>
          <Text style={styles.inputLabel}>Payment Amount (Base)</Text>
          <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={baseAmount} onChangeText={setBaseAmount} />
          
          <View style={styles.vatBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><MaterialCommunityIcons name="currency-usd" size={18} color="#3b82f6" /><Text style={styles.vatText}>Auto VAT (15%)</Text></View>
            <Text style={styles.vatAmount}>Rs.{vat}</Text>
          </View>

          <View style={styles.payableBox}>
            <Text style={styles.payableLabel}>Total Payable</Text>
            <Text style={styles.payableValue}>Rs.{totalPayable}</Text>
          </View>

          <TouchableOpacity style={styles.submitBtn}><Text style={styles.submitText}>Submit Payment</Text></TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#00b894', padding: 30, paddingTop: 50, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: 'white', opacity: 0.8 },
  content: { padding: 20 },
  card: { backgroundColor: 'white', borderRadius: 25, padding: 20, marginBottom: 20, elevation: 2 },
  billTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconBox: { backgroundColor: '#dbeafe', padding: 10, borderRadius: 15 },
  billNo: { fontSize: 16, fontWeight: 'bold' },
  date: { color: '#94a3b8', fontSize: 12 },
  statusBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#ef4444', fontSize: 10, fontWeight: 'bold' },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 15 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  itemName: { fontWeight: '500' },
  itemQty: { color: '#94a3b8', fontSize: 12 },
  itemPrice: { fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  totalLabel: { color: '#64748b' },
  totalValue: { fontWeight: 'bold', fontSize: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  inputLabel: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  input: { backgroundColor: '#f1f5f9', padding: 15, borderRadius: 15, marginBottom: 15 },
  vatBox: { backgroundColor: '#eff6ff', flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderRadius: 15, marginBottom: 20 },
  vatText: { color: '#3b82f6', marginLeft: 10, fontWeight: '600' },
  vatAmount: { color: '#3b82f6', fontWeight: 'bold' },
  payableBox: { backgroundColor: '#f0fdf4', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#bcfed3' },
  payableLabel: { color: '#10b981', fontWeight: 'bold' },
  payableValue: { color: '#10b981', fontSize: 32, fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#0061ff', padding: 18, borderRadius: 15, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});