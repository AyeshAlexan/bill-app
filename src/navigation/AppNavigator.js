import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
// Remove NavigationContainer import from here if it is in App.js

import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ShopListScreen from "../screens/ShopListScreen";
import BillListScreen from "../screens/BillListScreen";
import BillDetailScreen from "../screens/BillDetailScreen";
import PaymentScreen from "../screens/PaymentScreen";
import PendingBillsScreen from "../screens/PendingBillsScreen";

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    // We removed NavigationContainer from here because it should be in App.js
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: { backgroundColor: "#4CAF50" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerTitleAlign: "center",
      }}
      
    >
  <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
  <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
  <Stack.Screen name="ShopList" component={ShopListScreen} options={{ headerShown: false }} /> 
  <Stack.Screen name="BillList" component={BillListScreen} options={{ headerShown: false }} />
  <Stack.Screen name="BillDetail" component={BillDetailScreen} options={{ headerShown: false }}/>
  <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: false }} />
  <Stack.Screen name="PendingBills" component={PendingBillsScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
  );
}