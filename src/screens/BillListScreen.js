import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';

const BILLS_URL = 'http://127.0.0.1:8000/api/bills';
const SHOPS_URL = 'http://127.0.0.1:8000/api/shops';

export default function BillListScreen({ route, navigation }) {
  const { shopId } = route.params;

  const [shop, setShop] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('Pending'); // Pending | Paid

  useEffect(() => {
    fetchShopAndBills();
  }, []);

  // ✅ Auto refresh when coming back from BillDetail (after payment, status change etc.)
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchShopAndBills(false);
    });
    return unsub;
  }, [navigation]);

  const fetchShopAndBills = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [billRes, shopRes] = await Promise.all([
        axios.get(BILLS_URL),
        axios.get(SHOPS_URL),
      ]);

      const allBills = billRes.data || [];
      const normalizedShopId = Number(shopId);

      const shopBills = allBills.filter((b) => Number(b.shop_id) === normalizedShopId);
      setBills(shopBills);

      const shops = shopRes.data?.shops || [];
      const foundShop = shops.find((s) => Number(s.id) === normalizedShopId);
      setShop(foundShop || null);
    } catch (e) {
      console.log('FETCH SHOP/BILLS ERROR:', e?.response?.data || e.message);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShopAndBills(false);
  };

  const summary = useMemo(() => {
    const total = bills.length;
    const pending = bills.filter((b) => b.status !== 'Paid').length;
    const paid = bills.filter((b) => b.status === 'Paid').length;
    return { total, pending, paid };
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (filter === 'Pending') return b.status !== 'Paid';
      return b.status === 'Paid';
    });
  }, [bills, filter]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0061ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>

        {/* ✅ SHOP NAME + LOCATION */}
        <Text style={styles.shopName}>{shop?.name || 'Shop'}</Text>

        <View style={styles.locRow}>
          <MaterialCommunityIcons name="map-marker" size={14} color="white" />
          <Text style={styles.shopLoc}>{shop?.location || '—'}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Total Bills</Text>
            <Text style={styles.miniValue}>{summary.total}</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Pending</Text>
            <Text style={styles.miniValue}>{summary.pending}</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Paid</Text>
            <Text style={styles.miniValue}>{summary.paid}</Text>
          </View>
        </View>
      </View>

      {/* FILTER */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, filter === 'Pending' && styles.activeBtn]}
          onPress={() => setFilter('Pending')}
        >
          <Text style={filter === 'Pending' ? styles.activeText : styles.inactiveText}>
            Pending ({summary.pending})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, filter === 'Paid' && styles.activeBtn]}
          onPress={() => setFilter('Paid')}
        >
          <Text style={filter === 'Paid' ? styles.activeText : styles.inactiveText}>
            Paid ({summary.paid})
          </Text>
        </TouchableOpacity>
      </View>

      {/* BILL LIST */}
      <FlatList
        data={filteredBills}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 30, alignItems: 'center' }}>
            <Text style={{ color: '#94a3b8', fontWeight: 'bold' }}>
              No bills found
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          // ✅ FIX: Make the whole card clickable
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('BillDetails', {
                billId: item.id,
                shopId: shopId,
              })
            }
          >
            <View style={styles.billCard}>
              <View style={styles.billHeader}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={24}
                    color={item.status === 'Paid' ? '#10b981' : '#ef4444'}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.billNo}>Bill #{item.bill_number}</Text>
                  <Text style={styles.billDate}>{item.bill_date}</Text>
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.billDivider} />

              <View style={styles.amountRow}>
                <View>
                  <Text style={styles.amountLabel}>Total Amount</Text>
                  <Text style={styles.amountVal}>
                    Rs.{Number(item.total_amount).toLocaleString()}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amountLabel}>Due Amount</Text>
                  <Text style={[styles.amountVal, { color: '#ef4444' }]}>
                    Rs.{Number(item.due_amount).toLocaleString()}
                  </Text>
                </View>
              </View>

              {Number(item.total_amount) > Number(item.due_amount) && (
                <Text style={styles.paidText}>
                  Paid Amount:{' '}
                  <Text style={{ color: '#10b981' }}>
                    Rs.
                    {(
                      Number(item.total_amount) - Number(item.due_amount)
                    ).toLocaleString()}
                  </Text>
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

/* ✅ STYLES — NOT REMOVED (ONLY locRow + shopLoc WERE ADDED IN YOUR VERSION) */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#0061ff',
    padding: 25,
    paddingTop: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
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
  paidText: { marginTop: 10, fontSize: 13, color: '#64748b' },
});
