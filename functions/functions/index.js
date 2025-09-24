const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

/**
 * 🔔 Trigger: when a student creates a new gate pass with status = "pending_mentor"
 * Action: find mentor’s Expo push token and send them a push notification
 */
exports.notifyMentorOnRequest = functions.firestore
  .document("gate_passes/{docId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();

    // Only trigger if it's waiting for mentor approval
    if (data.status !== "pending_mentor") {
      console.log("Not a mentor-pending request, skipping.");
      return null;
    }

    try {
      // The student's request should include mentorUid (who should get notified)
      const mentorUid = data.mentorUid || null;
      if (!mentorUid) {
        console.log("No mentorUid found on request, skipping.");
        return null;
      }

      // Fetch mentor user doc from Firestore
      const userDoc = await db.collection("users").doc(mentorUid).get();
      if (!userDoc.exists) {
        console.log("Mentor user not found.");
        return null;
      }

      const expoPushToken = userDoc.data().expoPushToken;
      if (!expoPushToken) {
        console.log("Mentor has no Expo token saved.");
        return null;
      }

      // Build notification message
      const message = {
        to: expoPushToken,
        sound: "default",
        title: "New Gate Pass Request",
        body: `${data.studentName || "A student"} has submitted a new request.`,
      };

      // Send notification via Expo Push API
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      console.log("✅ Notification sent to mentor:", mentorUid);
      return null;
    } catch (err) {
      console.error("❌ Error sending notification:", err);
      return null;
    }
  });
