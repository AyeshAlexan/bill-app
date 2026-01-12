import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Switch, Modal, FlatList, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AddBillScreen({ navigation }) {
  const [shops] = useState([
    { id: '1', name: 'Kandy City Store' },
    { id: '2', name: 'Katugastota Super' },
    { id: '3', name: 'Peradeniya Market' },
  ]);

  const [selectedShop, setSelectedShop] = useState(null);
  const [showShopModal, setShowShopModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsList, setItemsList] = useState([{ id: Date.now(), name: '', price: '' }]);
  const [isTaxEnabled, setIsTaxEnabled] = useState(false);
  const [additionalTax, setAdditionalTax] = useState('0');

  const filteredShops = shops.filter(shop => shop.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Math Logic
  const baseAmount = itemsList.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  const vat = baseAmount * 0.15;
  const extraTax = isTaxEnabled ? parseFloat(additionalTax || 0) : 0;
  const total = (baseAmount + vat + extraTax).toFixed(2);

  const addNewItem = () => setItemsList([...itemsList, { id: Date.now(), name: '', price: '' }]);

  // DELETE ITEM FUNCTION
  const deleteItem = (id) => {
    if (itemsList.length > 1) {
      setItemsList(itemsList.filter(item => item.id !== id));
    } else {
      Alert.alert("Notice", "A bill must have at least one item.");
    }
  };

  const updateItem = (id, field, value) => {
    setItemsList(itemsList.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><MaterialCommunityIcons name="close" size={24} color="white" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Bill</Text>
      </View>

      <ScrollView style={styles.form}>
        <Text style={styles.label}>Shop Name</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowShopModal(true)}>
          <Text style={selectedShop ? styles.selectedText : styles.placeholderText}>{selectedShop ? selectedShop.name : "Select Shop"}</Text>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748b" />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Items & Prices</Text>
          <TouchableOpacity onPress={addNewItem} style={styles.addBtn}>
            <MaterialCommunityIcons name="plus-circle" size={20} color="#10b981" />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {itemsList.map((item) => (
          <View key={item.id} style={styles.itemRowContainer}>
            <View style={styles.itemRow}>
              <TextInput style={[styles.input, { flex: 2 }]} placeholder="Item Name" value={item.name} onChangeText={(t) => updateItem(item.id, 'name', t)} />
              <TextInput style={[styles.input, { flex: 1, marginLeft: 10 }]} placeholder="Price" keyboardType="numeric" value={item.price} onChangeText={(t) => updateItem(item.id, 'price', t)} />
              
              {/* DELETE BUTTON */}
              <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.summaryBox}>
          <View style={styles.calcRow}><Text style={styles.calcLabel}>Subtotal</Text><Text style={styles.calcValue}>Rs. {baseAmount.toFixed(2)}</Text></View>
          <View style={styles.calcRow}><Text style={styles.calcLabel}>VAT (15%)</Text><Text style={styles.calcValue}>Rs. {vat.toFixed(2)}</Text></View>
          
          <View style={styles.taxToggleRow}>
            <Text style={styles.label}>Extra Tax?</Text>
            <Switch value={isTaxEnabled} onValueChange={setIsTaxEnabled} trackColor={{ true: '#2563eb' }} />
          </View>

          {isTaxEnabled && (
            <TextInput style={styles.input} placeholder="Tax Amount" keyboardType="numeric" value={additionalTax} onChangeText={setAdditionalTax} />
          )}
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Grand Total</Text>
          <Text style={styles.totalValue}>Rs. {total}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, !selectedShop && { backgroundColor: '#cbd5e1' }]} 
          disabled={!selectedShop}
          onPress={() => { Alert.alert("Success", "Bill Added!"); navigation.navigate("ShopList"); }}
        >
          <Text style={styles.submitText}>Save & Create Bill</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* SHOP MODAL */}
      <Modal visible={showShopModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput style={styles.searchBar} placeholder="Search shops..." value={searchQuery} onChangeText={setSearchQuery} />
            <FlatList
              data={filteredShops}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.shopItem} onPress={() => { setSelectedShop(item); setShowShopModal(false); }}>
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={{ padding: 15, alignItems: 'center' }} onPress={() => setShowShopModal(false)}>
              <Text style={{ color: '#ef4444' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#2563eb', padding: 25, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 15 },
  form: { padding: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 5 },
  dropdown: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 15, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  selectedText: { color: '#1e293b', fontWeight: '500' },
  placeholderText: { color: '#94a3b8' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center' },
  addBtnText: { color: '#10b981', fontWeight: 'bold', marginLeft: 5 },
  itemRowContainer: { marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10 },
  deleteBtn: { marginLeft: 10, padding: 5 },
  summaryBox: { backgroundColor: '#f1f5f9', padding: 15, borderRadius: 15, marginTop: 10 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  calcLabel: { color: '#64748b' },
  calcValue: { fontWeight: 'bold' },
  taxToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  totalCard: { backgroundColor: '#2563eb', padding: 20, borderRadius: 20, alignItems: 'center', marginVertical: 20 },
  totalLabel: { color: 'white', opacity: 0.8 },
  totalValue: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#10b981', padding: 18, borderRadius: 15, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '70%' },
  searchBar: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, marginBottom: 15 },
  shopItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }
});