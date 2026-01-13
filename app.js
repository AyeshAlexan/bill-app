import { registerRootComponent } from 'expo';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from "react-native-toast-message";

function App() {
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