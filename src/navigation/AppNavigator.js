import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ShopListScreen from "../screens/ShopListScreen";
import BillListScreen from "../screens/BillListScreen";
import BillDetailScreen from "../screens/BillDetailScreen";
import ViewBillScreen from "../screens/ViewBillScreen";
import AddBillScreen  from "../screens/AddBillScreen";
import AddShopScreen  from "../screens/AddShopScreen";
import PaymentScreen from "../screens/PaymentScreen";
import PendingBillsScreen from "../screens/PendingBillsScreen";


const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="ShopList" component={ShopListScreen} />
      <Stack.Screen name="BillList" component={BillListScreen} />
      <Stack.Screen name="BillDetail" component={BillDetailScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="PendingBills" component={PendingBillsScreen} />
      <Stack.Screen name="ViewBill" component={ViewBillScreen} />

      <Stack.Screen name="AddBill" component={AddBillScreen} />
      <Stack.Screen name="AddShop" component={AddShopScreen} />

    </Stack.Navigator>
  );
}