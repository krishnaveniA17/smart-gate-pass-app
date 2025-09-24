// src/utils/passlimit.js
import {
  getFirestore,
  doc,
  collection,
  runTransaction,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

const db = getFirestore();
const DAILY_LIMIT = 2;

/**
 * tryCreatePass(studentId, newPassData)
 * - Ensures student doc exists (creates minimal doc if missing)
 * - Enforces DAILY_LIMIT per IST day (Asia/Kolkata)
 * - Returns { id, newCount, remaining }
 * - Throws Error("Daily pass limit reached") if limit already reached
 */
export async function tryCreatePass(studentId, newPassData = {}) {
  if (!studentId) throw new Error("Missing studentId");
  if (typeof newPassData !== "object" || Array.isArray(newPassData)) {
    throw new Error("newPassData must be an object");
  }

  const studentRef = doc(db, "students", studentId);
  const passRef = doc(collection(db, "gate_passes")); // auto id

  try {
    return await runTransaction(db, async (tx) => {
      // --- ALL READS FIRST ---
      const studentSnap = await tx.get(studentRef);
      // (If you will need other reads, do them here BEFORE any tx.set/tx.update)

      // derive existing student data (may be empty if doc doesn't exist)
      const studentData = studentSnap.exists() ? studentSnap.data() : {};

      // Compute today's date string in IST (YYYY-MM-DD)
      const nowIST = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      const isoDate = nowIST.toISOString().slice(0, 10);

      // Normalize stored passCountDate (could be string, null, or Timestamp)
      let passCountDate = studentData.passCountDate ?? null;
      if (passCountDate && passCountDate.seconds !== undefined && typeof passCountDate.toDate === "function") {
        // It's a Firestore Timestamp-like object
        try {
          passCountDate = passCountDate.toDate().toISOString().slice(0, 10);
        } catch (e) {
          passCountDate = null;
        }
      } else if (typeof passCountDate === "string") {
        passCountDate = passCountDate.slice(0, 10);
      } else {
        passCountDate = null;
      }

      let passCount = Number(studentData.passCount ?? 0);
      if (passCountDate !== isoDate) {
        passCount = 0;
        passCountDate = isoDate;
      }

      if (passCount >= DAILY_LIMIT) {
        throw new Error("Daily pass limit reached");
      }

      const newCount = passCount + 1;

      // --- NOW ALL WRITES (no reads after this) ---
      // create/merge student counters
      tx.set(
        studentRef,
        {
          passCountDate: isoDate,
          passCount: newCount,
          // If you want to record createdAt when doc didn't exist, we can set it too
          createdAt: studentSnap.exists() ? studentData.createdAt || studentSnap.exists() && Timestamp.now() : Timestamp.now(),
        },
        { merge: true }
      );

      // create the gate pass doc with server timestamp for createdAt
      tx.set(passRef, {
        ...newPassData,
        studentId,
        createdAt: serverTimestamp(),
        status: "PENDING",
      });

      return {
        id: passRef.id,
        newCount,
        remaining: Math.max(0, DAILY_LIMIT - newCount),
      };
    });
  } catch (err) {
    // distinguish permission error to surface friendly message
    if (err?.code === "permission-denied" || (err?.message && err.message.toLowerCase().includes("permission"))) {
      throw new Error("Missing or insufficient permissions.");
    }
    if (err?.message?.includes("Daily pass limit reached")) {
      throw new Error("Daily pass limit reached");
    }
    throw new Error(`tryCreatePass failed: ${err?.message ?? err}`);
  }
}
