import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";

import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ShopListScreen from "../screens/ShopListScreen";
import BillListScreen from "../screens/BillListScreen";
import BillDetailScreen from "../screens/BillDetailScreen";
import PaymentScreen from "../screens/PaymentScreen";

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
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
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Dashboard" }} />
        <Stack.Screen name="Shops" component={ShopListScreen} options={{ title: "My Shops" }} />
        <Stack.Screen name="Bills" component={BillListScreen} options={{ title: "Bills" }} />
        <Stack.Screen name="BillDetails" component={BillDetailScreen} options={{ title: "Bill Details" }} />
        <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Collect Payment" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
