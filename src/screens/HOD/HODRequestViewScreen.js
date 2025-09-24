// src/screens/HOD/HODRequestDetailsScreen.js
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
  doc,
  getDoc,
  getFirestore,
} from "firebase/firestore";
import { MotiView } from "moti";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const db = getFirestore();
const fmt = (ts) => (ts?.toDate?.() ? ts.toDate().toLocaleString() : ts ?? "-");

export default function HODRequestDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { gatePassId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [gatePass, setGatePass] = useState(null);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    let active = true;
    async function fetchDetails() {
      try {
        const passRef = doc(db, "gate_passes", gatePassId);
        const passSnap = await getDoc(passRef);
        if (!passSnap.exists()) {
          Alert.alert("Not found", "Gate pass not found or deleted.");
          navigation.goBack();
          return;
        }
        const pass = { id: passSnap.id, ...passSnap.data() };

        let stu = null;
        if (pass.studentUid) {
          const userRef = doc(db, "users", pass.studentUid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) stu = { id: userSnap.id, ...userSnap.data() };
        }

        if (active) {
          setGatePass(pass);
          setStudent(stu);
          setLoading(false);
        }
      } catch (e) {
        console.warn("Details load error:", e);
        Alert.alert("Error", "Failed to load details.");
        navigation.goBack();
      }
    }
    fetchDetails();
    return () => {
      active = false;
    };
  }, [gatePassId, navigation]);

  const studentName = useMemo(
    () => student?.name || gatePass?.studentName || "Unknown",
    [student, gatePass]
  );

  const studentPhoto = student?.photoURL || gatePass?.photoURL || null;
  const studentInitial = studentName?.[0]?.toUpperCase?.() || "?";

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.center, { paddingTop: 24 }]}>
          <ActivityIndicator />
          <Text style={{ color: "#bdbdbd", marginTop: 8 }}>
            Loading details…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ Use createdAt instead of requestedDepartureAt
  const requestedAt = fmt(gatePass?.createdAt);
  const mentorName = gatePass?.mentorApproval?.displayName || "—";
  const mentorNote = gatePass?.mentorApproval?.comment || null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <LinearGradient colors={["#0f1023", "#0b0b0b"]} style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={20} color="#eaeaea" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Request Details</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Student Info */}
          <Card>
            <Label>Student</Label>
            <View style={styles.studentRow}>
              {studentPhoto ? (
                <Image source={{ uri: studentPhoto }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{studentInitial}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Value>{studentName}</Value>
                {/* ✅ USN */}
                {student?.usn && (
                  <Text style={styles.usnText}>USN: {student.usn}</Text>
                )}
                {/* ✅ Year */}
                {student?.year && <Sub>Year: {student.year}</Sub>}
                {/* ✅ Section */}
                {student?.section && <Sub>Section: {student.section}</Sub>}
                {student?.phone && <Sub>Phone: {student.phone}</Sub>}
              </View>
            </View>
          </Card>

          {/* Reason */}
          <Card>
            <Label>Reason</Label>
            <Value>{gatePass?.reason || "No reason provided"}</Value>
          </Card>

          {/* Departure */}
          <Card>
            <Label>Request Time</Label>
            <Chip icon="clock" text={requestedAt} />
          </Card>

          {/* Mentor Info */}
          <Card>
            <Label>Forwarded By</Label>
            <Value>{mentorName}</Value>
            {mentorNote && <Sub>Note: {mentorNote}</Sub>}
          </Card>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

/* --- UI Helpers --- */
function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}
function Value({ children }) {
  return <Text style={styles.value}>{children}</Text>;
}
function Sub({ children }) {
  return <Text style={styles.subValue}>{children}</Text>;
}
function Chip({ icon, text }) {
  return (
    <View style={styles.chip}>
      <Feather name={icon} size={12} color="#a8a8a8" />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

/* --- Styles --- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },
  center: { alignItems: "center", justifyContent: "center" },

  topBar: {
    height: 56,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
  },
  backBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#161616",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#262626",
  },
  topTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
  },

  scroll: { flex: 1 },

  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#232323",
  },

  studentRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 22 },
  avatarImg: { width: 64, height: 64, borderRadius: 32, resizeMode: "cover" },

  label: { color: "#c9c9c9", fontSize: 12, marginBottom: 6 },
  value: { color: "#fff", fontSize: 16, fontWeight: "700" },

  subValue: { color: "#bdbdbd", marginTop: 6, fontSize: 12, lineHeight: 18 },

  // ✅ Bigger and bolder USN
  usnText: {
    color: "#fff",
    marginTop: 6,
    fontSize: 14, // ~15% bigger
    fontWeight: "700",
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipText: { color: "#eaeaea", fontSize: 12, fontWeight: "600" },
});
