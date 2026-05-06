import { createStackNavigator } from "@react-navigation/stack";

import AddBillScreen from "../screens/AddBillScreen";
import AddShopScreen from "../screens/AddShopScreen";
import BillDetailScreen from "../screens/BillDetailScreen";
import BillListScreen from "../screens/BillListScreen";
import DailyReportScreen from "../screens/DailyReportScreen";
import DashboardScreen from "../screens/DashboardScreen";
import LoginScreen from "../screens/LoginScreen";
import OpeningScreen from "../screens/openingscreen";
import PaymentScreen from "../screens/PaymentScreen";
import PendingBillsScreen from "../screens/PendingBillsScreen";
import ShopListScreen from "../screens/ShopListScreen";
import SummaryScreen from "../screens/SummaryScreen";
import ViewBillScreen from "../screens/ViewBillScreen";
import PaymentVoucherScreen from "../screens/PaymentVoucherScreen";

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Opening" // ✅ Set this as the starting point
      screenOptions={{ headerShown: false }}
    >
      {/* --- Splash / Opening Screen --- */}
      <Stack.Screen name="Opening" component={OpeningScreen} />

      {/* --- Auth & Main Screens --- */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Summary" component={SummaryScreen} />
      <Stack.Screen name="DailyReport" component={DailyReportScreen} />
      <Stack.Screen name="ShopList" component={ShopListScreen} />
      <Stack.Screen name="BillList" component={BillListScreen} />
      <Stack.Screen name="BillDetail" component={BillDetailScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="PaymentVoucher" component={PaymentVoucherScreen} />
      <Stack.Screen name="PendingBills" component={PendingBillsScreen} />
      <Stack.Screen name="ViewBill" component={ViewBillScreen} />
      <Stack.Screen name="AddBill" component={AddBillScreen} />
      <Stack.Screen name="AddShop" component={AddShopScreen} />
    </Stack.Navigator>
  );
}
