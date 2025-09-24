import admin from "firebase-admin";
import fs from "fs";

// Load Firebase Admin SDK credentials
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function backfillMentorUidAndName() {
  console.log("🔄 Starting mentorUid + mentorName backfill...");

  const snap = await db
    .collection("gate_passes")
    .where("status", "in", ["pending_hod", "approved", "rejected"])
    .get();

  if (snap.empty) {
    console.log("No documents found to update.");
    return;
  }

  let count = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();

    const mentorUid = data.mentorUid || data.mentorApproval?.uid;
    if (!mentorUid) continue;

    try {
      const mentorSnap = await db.collection("users").doc(mentorUid).get();
      let mentorName = "Mentor";
      if (mentorSnap.exists && mentorSnap.data().displayName) {
        mentorName = mentorSnap.data().displayName;
      }

      const updates = {};
      if (!data.mentorUid) {
        updates.mentorUid = mentorUid;
      }
      if (
        !data.mentorApproval?.displayName ||
        data.mentorApproval.displayName === "Mentor"
      ) {
        updates["mentorApproval.displayName"] = mentorName;
      }

      if (Object.keys(updates).length > 0) {
        await docSnap.ref.update(updates);
        count++;
        console.log(
          `✅ Updated: ${docSnap.id} → mentorUid=${mentorUid}, displayName=${mentorName}`
        );
      }
    } catch (e) {
      console.warn(`⚠️ Could not update ${docSnap.id}`, e);
    }
  }

  console.log(`🎉 Backfill complete. Updated ${count} documents.`);
  process.exit(0);
}

backfillMentorUidAndName().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
