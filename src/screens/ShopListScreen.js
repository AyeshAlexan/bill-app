import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const shops = [
  { id: 1, name: 'Kandy City Store', location: 'Kandy', pending: 3, amount: '25,000' },
  { id: 2, name: 'Katugastota Super', location: 'Katugastota', pending: 2, amount: '18,500' },
  { id: 3, name: 'Peradeniya Market', location: 'Peradeniya', pending: 1, amount: '12,000' },
];

export default function ShopListScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialCommunityIcons name="arrow-left" size={24} color="white" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Shops</Text>
        <Text style={styles.headerSub}>Manage your assigned shops</Text>
      </View>

      <FlatList
        data={shops}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.shopCard} onPress={() => navigation.navigate('BillList', { shop: item })}>
            <View style={styles.shopTop}>
               <View style={styles.iconBox}><MaterialCommunityIcons name="store" size={24} color="#3b82f6" /></View>
               <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.shopName}>{item.name}</Text>
                  <Text style={styles.shopLoc}>{item.location}</Text>
               </View>
               <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
            </View>
            <View style={styles.shopBottom}>
                <Text style={styles.pendingText}>{item.pending} pending bills</Text>
                <View style={styles.amtBadge}><Text style={styles.amtText}>Rs.{item.amount}</Text></View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#00b894', padding: 30, paddingTop: 50, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  headerSub: { color: 'white', opacity: 0.8 },
  shopCard: { backgroundColor: 'white', borderRadius: 25, padding: 20, marginBottom: 15, elevation: 2 },
  shopTop: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { backgroundColor: '#dbeafe', padding: 10, borderRadius: 15 },
  shopName: { fontSize: 18, fontWeight: 'bold' },
  shopLoc: { color: '#94a3b8' },
  shopBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  pendingText: { color: '#64748b' },
  amtBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  amtText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 }
});