import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  UIManager,
  Dimensions,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchSummary } from "../services/dashboardApi";
import Animated, { 
  FadeInUp, 
  FadeIn, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  useSharedValue,
  withDelay
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Internal Component: Animated Progress Bar ---
const AnimatedBar = ({ width: targetWidth, color = "#3b82f6", delay = 0 }) => {
  const widthShared = useSharedValue(0);

  useEffect(() => {
    widthShared.value = withDelay(delay, withTiming(targetWidth, { duration: 1000 }));
  }, [targetWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthShared.value}%`,
  }));

  return (
    <View style={styles.chartBarBg}>
      <Animated.View style={[styles.chartBarFill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
};

// --- Internal Component: Summary Skeleton Loader ---
const SkeletonLoader = () => {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.7, { duration: 800 }), withTiming(0.3, { duration: 800 })), -1);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.content}>
      {[1, 2, 3].map((i) => (
        <Animated.View key={i} style={[styles.summaryCard, animStyle, { height: 150, backgroundColor: '#e2e8f0' }]} />
      ))}
    </View>
  );
};

export default function SummaryScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("targets");
  const [mode, setMode] = useState("monthly");
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetchSummary();
      setData(res);
    } catch (e) {
      console.log("Summary error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) =>
    `Rs.${Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.greenHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="white" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.headerTitle}>Summary</Text>
        <Text style={styles.headerSub}>All Performance Metrics</Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'targets' && styles.activeTabBtn]} 
            onPress={() => setActiveTab('targets')}
          >
            <Text style={[styles.tabText, activeTab === 'targets' && styles.activeTabText]}>Targets</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'visits' && styles.activeTabBtn]} 
            onPress={() => setActiveTab('visits')}
          >
            <Text style={[styles.tabText, activeTab === 'visits' && styles.activeTabText]}>Visits</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <SkeletonLoader />
      ) : !data ? (
        <View style={styles.center}><Text>No data available</Text></View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* ================= TARGETS TAB ================= */}
          {activeTab === "targets" && (
            <Animated.View entering={FadeIn.duration(600)}>
              <View style={styles.summaryCard}>
                <Text style={styles.cardMonthTitle}>{data.targets.current.month_label}</Text>
                <Text style={styles.cardBigAmount}>{formatMoney(data.targets.current.collected)}</Text>
                <Text style={styles.cardTargetLabel}>Target: {formatMoney(data.targets.current.target_amount)}</Text>
                
                <AnimatedBar width={Math.min(data.targets.current.progress_percentage, 100)} color="#3b82f6" />
                <Text style={styles.percentText}>{data.targets.current.progress_percentage}%</Text>

                <View style={styles.cardFooter}>
                   <View>
                      <Text style={styles.footerLabel}>Collected</Text>
                      <Text style={styles.footerVal}>{formatMoney(data.targets.current.collected)}</Text>
                   </View>
                   <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.footerLabel}>Target</Text>
                      <Text style={styles.footerVal}>{formatMoney(data.targets.current.target_amount)}</Text>
                   </View>
                </View>

                <TouchableOpacity style={styles.allMonthsBtn} onPress={() => setShowAllMonths(!showAllMonths)}>
                  <Text style={styles.allMonthsText}>All months</Text>
                  <MaterialCommunityIcons name={showAllMonths ? "chevron-up" : "chevron-down"} size={20} color="#2563eb" />
                </TouchableOpacity>
              </View>

              {showAllMonths && data.targets.all_months.map((m, i) => (
                 <Animated.View entering={FadeInUp.delay(i * 100)} key={i} style={styles.summaryCard}>
                    <Text style={styles.cardMonthTitle}>{m.label}</Text>
                    <Text style={styles.cardBigAmount}>{formatMoney(m.collected || 0)}</Text>
                    <Text style={styles.cardTargetLabel}>Target: {formatMoney(m.target_amount)}</Text>
                    <AnimatedBar 
                        width={Math.min((m.collected/(m.target_amount || 1))*100, 100)} 
                        color="#22c55e" 
                        delay={200}
                    />
                    <Text style={styles.percentText}>{Math.round((m.collected/(m.target_amount || 1))*100)}%</Text>
                 </Animated.View>
              ))}

              <View style={styles.sectionHeaderRow}>
                 <Text style={styles.sectionTitle}>Performance Chart</Text>
                 <View style={styles.miniToggle}>
                    <TouchableOpacity onPress={() => setMode('monthly')} style={[styles.miniBtn, mode === 'monthly' && styles.miniBtnActive]}>
                      <Text style={[styles.miniText, mode === 'monthly' && styles.miniTextActive]}>Monthly</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMode('daily')} style={[styles.miniBtn, mode === 'daily' && styles.miniBtnActive]}>
                      <Text style={[styles.miniText, mode === 'daily' && styles.miniTextActive]}>Daily</Text>
                    </TouchableOpacity>
                 </View>
              </View>

              <View style={styles.chartCard}>
                {mode === 'monthly' ? (
                  data.targets.all_months.map((m, i) => (
                    <Animated.View entering={FadeInUp.delay(i * 50)} key={`month-${i}`} style={styles.chartRow}>
                      <View style={styles.chartLabelRow}>
                        <Text style={styles.chartMonthLabel}>{m.label.substring(0,3)}</Text>
                        <Text style={styles.chartValueLabel}>{formatMoney(m.collected || 0)}</Text>
                      </View>
                      <AnimatedBar width={Math.min((m.collected/(m.target_amount || 1))*100, 100)} delay={i * 100} />
                    </Animated.View>
                  ))
                ) : (
                  data.targets.daily && data.targets.daily.length > 0 ? (
                    data.targets.daily.map((d, i) => {
                      const maxDaily = Math.max(...data.targets.daily.map(o => parseFloat(o.total)), 1);
                      const barWidth = (parseFloat(d.total) / maxDaily) * 100;
                      return (
                        <Animated.View entering={FadeInUp.delay(i * 30)} key={`daily-${i}`} style={styles.chartRow}>
                          <View style={styles.chartLabelRow}>
                            <Text style={styles.chartMonthLabel}>{d.date.split('-')[2]}</Text>
                            <Text style={styles.chartValueLabel}>{formatMoney(d.total)}</Text>
                          </View>
                          <AnimatedBar width={barWidth} color="#10b981" delay={i * 50} />
                        </Animated.View>
                      );
                    })
                  ) : (
                    <Text style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>No daily data available</Text>
                  )
                )}
              </View>

              <Text style={styles.sectionTitle}>Smart Insight</Text>
              <Animated.View entering={FadeInUp} style={styles.chartCard}>
                 <View style={styles.insightRow}>
                    <Text style={styles.insightLabel}>Target Achievement</Text>
                    <Text style={styles.insightValue}>{data.targets.insight.current_progress}%</Text>
                 </View>
                 <View style={styles.insightRow}>
                    <Text style={styles.insightLabel}>Growth Status</Text>
                    <Text style={[styles.insightValue, { color: data.targets.insight.status === 'on_track' ? '#22c55e' : '#ef4444' }]}>
                      {data.targets.insight.status === 'on_track' ? 'On Track' : 'Behind Schedule'}
                    </Text>
                 </View>
              </Animated.View>
            </Animated.View>
          )}

          {/* ================= VISITS TAB ================= */}
          {activeTab === "visits" && (
            <Animated.View entering={FadeIn.duration(600)}>
              <Animated.View entering={FadeInUp.delay(100)} style={styles.summaryCard}>
                <Text style={styles.visitLabel}>Monthly Visits</Text>
                <Text style={styles.visitBigCount}>{data.visits.monthly_total}</Text>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(200)} style={styles.summaryCard}>
                <Text style={styles.visitLabel}>Visit Efficiency</Text>
                <Text style={styles.visitBigAmount}>{formatMoney(data.visits.efficiency)}<Text style={styles.perVisit}>/visit</Text></Text>
              </Animated.View>

              <Text style={styles.sectionTitle}>Daily Visit History</Text>
              <View style={styles.chartCard}>
                 {data.visits.daily.length > 0 ? (
                   data.visits.daily.map((d, i) => (
                    <Animated.View entering={FadeInUp.delay(i * 100)} key={i} style={styles.dailyVisitRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.shopNameRow}>
                          <MaterialCommunityIcons name="storefront-outline" size={16} color="#22c55e" style={{ marginRight: 6 }} />
                          <Text style={styles.dailyShopName}>{d.shop_name || "General Visit"}</Text>
                        </View>
                        <Text style={styles.dailyDate}>{d.date}</Text>
                      </View>
                      <View style={styles.visitBadge}>
                        <Text style={styles.visitBadgeText}>{d.visits} {d.visits > 1 ? 'Shops' : 'Shop'}</Text>
                      </View>
                    </Animated.View>
                  ))
                 ) : (
                   <Text style={{textAlign: 'center', color: '#64748b', paddingVertical: 20}}>No visits recorded</Text>
                 )}
              </View>
            </Animated.View>
          )}

          <View style={{ height: 50 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f1f5f9" },
  greenHeader: {
    backgroundColor: "#22c55e",
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  headerTitle: { color: "white", fontSize: 28, fontWeight: "bold" },
  headerSub: { color: "#dcfce7", fontSize: 14, marginBottom: 20 },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 15,
    padding: 5,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12 },
  activeTabBtn: { backgroundColor: "white" },
  tabText: { color: "#dcfce7", fontWeight: "600" },
  activeTabText: { color: "#22c55e" },
  
  content: { flex: 1, paddingHorizontal: 20 },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardMonthTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 },
  cardBigAmount: { fontSize: 32, fontWeight: '800', color: '#0f172a' },
  cardTargetLabel: { fontSize: 14, color: '#3b82f6', marginTop: 5, marginBottom: 15 },
  
  percentText: { textAlign: 'right', fontSize: 12, fontWeight: 'bold', color: '#22c55e', marginTop: 5 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
  footerLabel: { fontSize: 12, color: '#64748b' },
  footerVal: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  
  allMonthsBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  allMonthsText: { color: '#2563eb', fontWeight: 'bold', marginRight: 5 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 25, marginBottom: 15 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25 },
  
  miniToggle: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 10, padding: 3 },
  miniBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  miniBtnActive: { backgroundColor: '#22c55e' },
  miniText: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
  miniTextActive: { color: 'white' },

  chartCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 1 },
  chartRow: { marginBottom: 15 },
  chartLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  chartMonthLabel: { fontSize: 14, color: '#64748b' },
  chartValueLabel: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  chartBarBg: { height: 12, backgroundColor: '#f1f5f9', borderRadius: 6, overflow: 'hidden' },
  chartBarFill: { height: '100%', borderRadius: 6 },

  insightRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  insightLabel: { color: '#64748b', fontSize: 14 },
  insightValue: { fontWeight: 'bold', color: '#0f172a' },

  visitLabel: { fontSize: 16, color: '#0f172a', fontWeight: '700', marginBottom: 10 },
  visitBigCount: { fontSize: 40, fontWeight: '800', color: '#0f172a' },
  visitBigAmount: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  perVisit: { fontSize: 14, color: '#64748b', fontWeight: 'normal' },

  dailyVisitRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  shopNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dailyShopName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  dailyDate: { color: '#64748b', fontSize: 13, marginLeft: 22 },
  visitBadge: { 
    backgroundColor: '#dcfce7', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  visitBadgeText: { color: '#166534', fontSize: 12, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});