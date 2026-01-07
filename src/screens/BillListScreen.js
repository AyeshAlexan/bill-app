import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function BillListScreen({ route, navigation }) {
  const { shop } = route.params || { shop: { name: 'Kandy City Store', location: 'Kandy' } };

  const bills = [
    { id: '1', billNo: 'INV-2026-001', date: '2026-01-05', total: '15,000', due: '15,000', status: 'Pending' },
    { id: '2', billNo: 'INV-2026-002', date: '2026-01-03', total: '8,500', due: '5,500', paid: '3,000', status: 'Partial' },
  ];

  return (
    <View style={styles.container}>
      {/* Header with Gradient Style */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialCommunityIcons name="arrow-left" size={24} color="white" /></TouchableOpacity>
        <Text style={styles.shopName}>{shop.name}</Text>
        <View style={styles.locRow}>
          <MaterialCommunityIcons name="map-marker" size={14} color="white" />
          <Text style={styles.shopLoc}>{shop.location}</Text>
        </View>
        
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.miniCard}><Text style={styles.miniLabel}>Total Bills</Text><Text style={styles.miniValue}>3</Text></View>
          <View style={styles.miniCard}><Text style={styles.miniLabel}>Pending</Text><Text style={styles.miniValue}>2</Text></View>
          <View style={styles.miniCard}><Text style={styles.miniLabel}>Paid</Text><Text style={styles.miniValue}>1</Text></View>
        </View>
      </View>

      {/* Status Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity style={[styles.toggleBtn, styles.activeBtn]}><Text style={styles.activeText}>Pending (2)</Text></TouchableOpacity>
        <TouchableOpacity style={styles.toggleBtn}><Text style={styles.inactiveText}>Paid (1)</Text></TouchableOpacity>
      </View>

      <FlatList
        data={bills}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.billCard} onPress={() => navigation.navigate('BillDetail', { bill: item })}>
            <View style={styles.billHeader}>
              <View style={styles.iconCircle}><MaterialCommunityIcons name="alert-circle-outline" size={24} color="#ef4444" /></View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.billNo}>Bill #{item.billNo}</Text>
                <Text style={styles.billDate}>{item.date}</Text>
              </View>
              <View style={styles.statusBadge}><Text style={styles.statusText}>{item.status}</Text></View>
            </View>
            <View style={styles.billDivider} />
            <View style={styles.amountRow}>
              <View><Text style={styles.amountLabel}>Total Amount</Text><Text style={styles.amountVal}>Rs.{item.total}</Text></View>
              <View style={{ alignItems: 'flex-end' }}><Text style={styles.amountLabel}>Due Amount</Text><Text style={[styles.amountVal, { color: '#ef4444' }]}>Rs.{item.due}</Text></View>
            </View>
            {item.paid && <Text style={styles.paidText}>Paid Amount: <Text style={{ color: '#10b981' }}>Rs.{item.paid}</Text></Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0061ff', padding: 25, paddingTop: 50, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  shopName: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  shopLoc: { color: 'white', opacity: 0.9, marginLeft: 5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  miniCard: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 15, width: '31%' },
  miniLabel: { color: 'white', fontSize: 10, textTransform: 'uppercase' },
  miniValue: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  toggleRow: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
  toggleBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 15, backgroundColor: 'white', marginHorizontal: 5, borderWidth: 1, borderColor: '#f1f5f9' },
  activeBtn: { backgroundColor: '#ff4757', borderColor: '#ff4757' },
  activeText: { color: 'white', fontWeight: 'bold' },
  inactiveText: { color: '#94a3b8', fontWeight: 'bold' },
  billCard: { backgroundColor: 'white', borderRadius: 25, padding: 20, marginBottom: 15, elevation: 3 },
  billHeader: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { backgroundColor: '#fee2e2', padding: 10, borderRadius: 15 },
  billNo: { fontSize: 16, fontWeight: 'bold' },
  billDate: { color: '#94a3b8', fontSize: 12 },
  statusBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#ef4444', fontSize: 10, fontWeight: 'bold' },
  billDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amountLabel: { color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' },
  amountVal: { fontSize: 16, fontWeight: 'bold', marginTop: 3 },
  paidText: { marginTop: 10, fontSize: 13, color: '#64748b' }
});