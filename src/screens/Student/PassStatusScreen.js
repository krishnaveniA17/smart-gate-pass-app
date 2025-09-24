// src/screens/Student/PassStatusScreen.js
import { Feather } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

const db = getFirestore();
const auth = getAuth();

// safe timestamp formatter
const fmt = (ts) => {
  if (!ts) return "-";
  if (ts?.toDate) return ts.toDate().toLocaleString();
  if (typeof ts === "object" && ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  try { return String(ts); } catch { return "-"; }
};

export default function PassStatusScreen() {
  const route = useRoute();
  const { gatePassId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [pass, setPass] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "gate_passes", gatePassId));
        if (snap.exists() && mounted) {
          setPass({ id: snap.id, ...snap.data() });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [gatePassId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4ade80" />
        <Text style={{ color: "#aaa", marginTop: 8 }}>Loading pass…</Text>
      </View>
    );
  }

  if (!pass) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#f87171" }}>Pass not found</Text>
      </View>
    );
  }

  // === Determine status visuals ===
  // We must consider both top-level status and nested mentor/hod decisions
  let statusColor = "#facc15";
  let statusIcon = "clock";
  let statusText = "Waiting for Mentor/HOD Approval";

  const s = (pass.status || "").toLowerCase();
  const rejectedByField = (pass.rejectedBy || "").toLowerCase();

  // also examine nested approval decisions
  const mentorDecision = (pass.mentorApproval?.decision || "").toLowerCase();
  const hodDecision = (pass.hodApproval?.decision || "").toLowerCase();

  // Priority: explicit nested rejections (mentor/hod) should be shown as rejected immediately
  if (mentorDecision === "rejected") {
    statusColor = "#dc2626";
    statusIcon = "x-circle";
    statusText = "Rejected by Mentor";
  } else if (hodDecision === "rejected") {
    statusColor = "#dc2626";
    statusIcon = "x-circle";
    statusText = "Rejected by HOD";
  } else if (s === "rejected" || rejectedByField === "mentor" || rejectedByField === "hod") {
    // fallback: top-level status or explicit rejectedBy field
    statusColor = "#dc2626";
    statusIcon = "x-circle";
    if (rejectedByField === "mentor") statusText = "Rejected by Mentor";
    else if (rejectedByField === "hod") statusText = "Rejected by HOD";
    else statusText = "Rejected";
  } else if (s === "approved") {
    statusColor = "#16a34a";
    statusIcon = "check-circle";
    statusText = "Approved";
  } else if (s === "pending_hod" || s === "forwarded" || s === "pending_hod_approval") {
    statusColor = "#facc15";
    statusIcon = "clock";
    statusText = "Waiting for HOD Approval";
  } else if (s === "pending_mentor") {
    statusColor = "#facc15";
    statusIcon = "clock";
    statusText = "Waiting for Mentor Approval";
  } else {
    // default fallback when status is something else/unexpected
    statusColor = "#facc15";
    statusIcon = "clock";
    statusText = "Waiting for decision";
  }

  // === Mentor card text & color ===
  let mentorCardText = "No mentor decision yet";
  let mentorCardColor = "#9ca3af";
  if (pass.mentorApproval) {
    const dec = (pass.mentorApproval.decision || "").toLowerCase();
    const name = pass.mentorApproval.displayName ? ` • ${pass.mentorApproval.displayName}` : "";
    const comment = pass.mentorApproval.comment ? `\n📝 ${pass.mentorApproval.comment}` : "";
    if (dec === "approved" || dec === "forwarded") {
      mentorCardText = `Approved by Mentor${name}${comment}`;
      mentorCardColor = "#16a34a";
    } else if (dec === "rejected") {
      mentorCardText = `Rejected by Mentor${name}${comment}`;
      mentorCardColor = "#dc2626";
    } else {
      mentorCardText = `${pass.mentorApproval.decision || "Mentor decision recorded"}${name}${comment}`;
      mentorCardColor = "#9ca3af";
    }
  } else if (s === "pending_mentor") {
    mentorCardText = "Awaiting mentor approval";
    mentorCardColor = "#facc15";
  }

  // === HOD card text & color ===
  let hodCardText = "Waiting for HOD approval";
  let hodCardColor = "#facc15";
  if (pass.hodApproval) {
    const dec = (pass.hodApproval.decision || "").toLowerCase();
    const name = pass.hodApproval.displayName ? ` • ${pass.hodApproval.displayName}` : "";
    const comment = pass.hodApproval.comment ? `\n📝 ${pass.hodApproval.comment}` : "";
    if (dec === "approved") {
      hodCardText = `Approved by HOD${comment}`;
      hodCardColor = "#16a34a";
    } else if (dec === "rejected") {
      hodCardText = `Rejected by HOD${comment}`;
      hodCardColor = "#dc2626";
    } else {
      hodCardText = `${pass.hodApproval.decision || "HOD decision recorded"}${comment}`;
      hodCardColor = "#9ca3af";
    }
  } else {
    if (s === "pending_mentor") {
      hodCardText = "Awaiting mentor approval first";
      hodCardColor = "#facc15";
    } else {
      hodCardText = "Waiting for HOD approval";
      hodCardColor = "#facc15";
    }
  }

  // === QR only for approved ===
  let qrValue = null;
  if (s === "approved") {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const expiryTimestamp = Math.floor(endOfDay.getTime() / 1000);

    const qrData = {
      passId: pass.id,
      studentUid: auth.currentUser?.uid || pass.studentUid,
      expiryTimestamp,
    };

    qrValue = JSON.stringify(qrData);

    // Persist qrData to Firestore once (best-effort; ignore errors)
    if (!pass.qrData || JSON.stringify(pass.qrData) !== qrValue) {
      updateDoc(doc(db, "gate_passes", pass.id), { qrData }).catch(() => {});
    }
  }

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Feather name={statusIcon} size={64} color={statusColor} />
        <Text style={styles.headerTitle}>Gate Pass Details</Text>
        <Text style={styles.subTitle}>{pass.studentName || "Student"}</Text>
        <Text style={[styles.subTitle, { color: statusColor }]}>{statusText}</Text>
      </View>

      <View style={styles.infoCard}>
        <Feather name="file-text" size={16} color="#9ca3af" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.infoLabel}>Reason</Text>
          <Text style={styles.infoValue}>{pass.reason || "—"}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Feather name="user" size={16} color="#9ca3af" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.infoLabel}>Mentor Decision</Text>
          <Text style={[styles.infoValue, { color: mentorCardColor }]}>{mentorCardText}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Feather name="user-check" size={16} color="#9ca3af" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.infoLabel}>HOD Decision</Text>
          <Text style={[styles.infoValue, { color: hodCardColor }]}>{hodCardText}</Text>
        </View>
      </View>

      {qrValue && (
        <View style={[styles.infoCard, { flexDirection: "column", alignItems: "center" }]}>
          <Text style={[styles.infoLabel, { marginBottom: 10 }]}>Your Gate Pass QR</Text>
          <QRCode value={qrValue} size={200} />
          <Text style={{ color: "#aaa", marginTop: 10, fontSize: 12 }}>
            Valid until end of today (11:59 PM). Show this QR to the security guard.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b", padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 20, marginTop: 20 },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 10,
  },
  subTitle: { color: "#aaa", fontSize: 14, marginTop: 4 },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#151515",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 14,
  },
  infoLabel: { color: "#aaa", fontSize: 12, marginBottom: 4 },
  infoValue: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
