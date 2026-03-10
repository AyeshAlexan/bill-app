import React, { useEffect, useRef } from "react";
import { View, Image, StyleSheet, Animated, Dimensions, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient"; // Ensure this is installed

const { width } = Dimensions.get("window");

export default function OpeningScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (value, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      animateDot(dot1, 0).start(),
      animateDot(dot2, 200).start(),
      animateDot(dot3, 400).start(),
    ]);

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace("Login");
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  const getDotStyle = (animValue) => ({
    opacity: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
    transform: [{
      translateY: animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -8],
      })
    }]
  });

  return (
    // Replaced View with LinearGradient for the background
    <LinearGradient
      colors={["#f8fafc", "#7bd099"]} 
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
        <View style={styles.centerContent}>
          <Image
            source={require("../assets/bill-logo1.png")} 
            style={styles.logo}
            resizeMode="contain"
          />
          
          <View style={styles.dotContainer}>
            <Animated.View style={[styles.dot, getDotStyle(dot1)]} />
            <Animated.View style={[styles.dot, getDotStyle(dot2)]} />
            <Animated.View style={[styles.dot, getDotStyle(dot3)]} />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.designByText}>DESIGN BY</Text>
          <Image
            source={require("../assets/Company- logo.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  logo: {
    width: width * 0.7,
    height: 180,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    marginTop: -10, // Pulls dots closer to the logo text
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#30a830', // Matches your WayBill Green
    marginHorizontal: 6,
  },
  footer: {
    paddingBottom: 50,
    alignItems: "center",
  },
  designByText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 2,
  },
  footerLogo: {
    width: 140,
    height: 45,
  },
});