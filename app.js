import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { registerRootComponent } from "expo";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";
import AppNavigator from "./src/navigation/AppNavigator";
import { setAuthToken } from "./src/services/Api";

function App() {
  useEffect(() => {
    const restoreToken = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          setAuthToken(token);
        }
      } catch (e) {
        console.error("Failed to restore token:", e);
      }
    };
    restoreToken();
  }, []);

  return (
    <View style={styles.container}>
      <NavigationContainer>
        <AppNavigator />
        <Toast />
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

registerRootComponent(App);
