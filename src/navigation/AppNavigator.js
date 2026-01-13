import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ShopListScreen from "../screens/ShopListScreen";
import BillListScreen from "../screens/BillListScreen";
import BillDetailScreen from "../screens/BillDetailScreen";
import PaymentScreen from "../screens/PaymentScreen";
import PendingBillsScreen from "../screens/PendingBillsScreen";
import AddBillScreen from "../screens/AddBillScreen";
import AddShopScreen from "../screens/AddShopScreen";

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false, // Since you are using custom headers in every screen
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="ShopList" component={ShopListScreen} /> 
      <Stack.Screen name="BillList" component={BillListScreen} />
      {/* Changed name to BillDetails to match your button logic */}
      <Stack.Screen name="BillDetails" component={BillDetailScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="PendingBills" component={PendingBillsScreen} />
      <Stack.Screen name="AddBill" component={AddBillScreen} />
      <Stack.Screen name= "AddShop" component={AddShopScreen}/>
      
    </Stack.Navigator>
  );
}