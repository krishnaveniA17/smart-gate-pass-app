import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../services/firebaseConfig";

const TASK_NAME = "PENDING_REQUEST_REMINDER";

// 🛡️ Expo Go: use a dummy fallback
if (Constants.appOwnership === "expo") {
  console.log("⚠️ Skipping background task setup in Expo Go");

  export async function registerBackgroundTask() {
    console.log("⏩ Background tasks are disabled in Expo Go.");
  }
} else {
  // ✅ Custom dev build / production: use expo-background-task
  const BackgroundTask = require("expo-background-task");

  // Define the background task
  BackgroundTask.defineTask(TASK_NAME, async () => {
    try {
      const user = getAuth().currentUser;
      if (!user) return BackgroundTask.Result.NoData;

      // Find pending requests for mentor
      const q = query(
        collection(db, "gate_passes"),
        where("status", "==", "pending_mentor")
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Pending Requests Reminder",
            body: `You have ${snap.size} request(s) waiting for your review.`,
            sound: "default",
          },
          trigger: null, // immediate
        });
      }

      return BackgroundTask.Result.NewData;
    } catch (error) {
      console.error("Background task failed:", error);
      return BackgroundTask.Result.Failed;
    }
  });

  // Register the background task
  export async function registerBackgroundTask() {
    try {
      const isRegistered = await BackgroundTask.isRegisteredAsync(TASK_NAME);
      if (!isRegistered) {
        await BackgroundTask.registerTaskAsync(TASK_NAME, {
          minimumInterval: 600, // every 10 minutes
        });
        console.log("✅ Background reminder registered");
      }
    } catch (err) {
      console.error("Failed to register background task:", err);
    }
  }
}
