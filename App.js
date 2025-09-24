import "react-native-reanimated";

import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppNavigator from "./src/navigation/AppNavigator";

import * as Notifications from "expo-notifications";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect } from "react";
import { db } from "./src/services/firebaseConfig";

const auth = getAuth();

// Configure how notifications are displayed when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  useEffect(() => {
    async function registerForPushNotifications() {
      // ✅ Ask for notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.log("Notification permission not granted");
        return;
      }

      // ✅ Get Expo push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("Expo push token:", token);

      // ✅ Save token to Firestore for the logged-in user
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            await updateDoc(doc(db, "users", user.uid), {
              expoPushToken: token,
            });
            console.log("Expo token saved to Firestore ✅");
          } catch (err) {
            console.warn("Could not save expo token:", err);
          }
        }
      });
    }

    registerForPushNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
