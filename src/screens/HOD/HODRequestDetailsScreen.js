// src/screens/HOD/HODRequestDetailsScreen.js
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { MotiView } from "moti";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const db = getFirestore();
const auth = getAuth();

const fmt = (ts) =>
  ts?.toDate?.() ? ts.toDate().toLocaleString() : ts ?? "-";

export default function HODRequestDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { gatePassId } = route.params || {};

  const insets = useSafeAreaInsets();
  // fallback for Android status bar if insets.top is 0
  const topInset =
    insets.top || (Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0);

  const [loading, setLoading] = useState(true);
  const [gatePass, setGatePass] = useState(null);
  const [student, setStudent] = useState(null);
  const [comment, setComment] = useState("");

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
    () =>
      student?.displayName ||
      student?.name ||
      gatePass?.studentName ||
      "Unknown",
    [student, gatePass]
  );

  const studentPhoto = student?.photoURL || gatePass?.photoURL || null;
  const studentInitial = studentName?.[0]?.toUpperCase?.() || "?";

  const confirm = (title, onYes) =>
    Alert.alert(title, "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: onYes },
    ]);

  const approve = async () => {
    confirm("Approve gate pass", async () => {
      const user = auth.currentUser;
      try {
        await updateDoc(doc(db, "gate_passes", gatePassId), {
          status: "approved",
          hodApproval: {
            uid: user?.uid || null,
            displayName: user?.displayName || "HOD",
            comment: comment || null,
            decision: "approved",
            at: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        });
        Alert.alert("Approved", "Gate pass approved.");
        navigation.navigate("HODTabs", { screen: "HODDashboard" });
      } catch (e) {
        console.warn("Approve error:", e);
        Alert.alert("Error", "Could not approve. Check permissions/rules.");
      }
    });
  };

  const reject = async () => {
    if (!comment.trim()) {
      Alert.alert("Reason required", "Please add a rejection reason.");
      return;
    }
    confirm("Reject gate pass", async () => {
      const user = auth.currentUser;
      try {
        await updateDoc(doc(db, "gate_passes", gatePassId), {
          status: "rejected",
          hodApproval: {
            uid: user?.uid || null,
            displayName: user?.displayName || "HOD",
            comment: comment,
            decision: "rejected",
            at: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        });
        Alert.alert("Rejected", "Gate pass rejected.");
        navigation.navigate("HODTabs", { screen: "HODDashboard" });
      } catch (e) {
        console.warn("Reject error:", e);
        Alert.alert("Error", "Could not reject. Check permissions/rules.");
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
        <LinearGradient
          colors={["#0f1023", "#0b0b0b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.topBar, { paddingTop: topInset + 10 }]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="chevron-left" size={20} color="#eaeaea" />
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>
            Request Details
          </Text>
          <View style={{ width: 28 }} />
        </LinearGradient>

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

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <LinearGradient
        colors={["#0f1023", "#0b0b0b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.topBar, { paddingTop: topInset + 10 }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={20} color="#eaeaea" />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          Request Details
        </Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
      >
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Student Info */}
          <Card>
            <View style={styles.studentRow}>
              {studentPhoto ? (
                <Image source={{ uri: studentPhoto }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{studentInitial}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Label>Student</Label>
                <Value>{studentName}</Value>
                {/* ✅ Show USN/Year/Section/Phone coming from user doc when available */}
                {student?.usn && (
                  <Text style={styles.usnText}>USN: {student.usn}</Text>
                )}
                {student?.year && <Sub>Year: {student.year}</Sub>}
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

          {/* Departure & Mentor */}
          <Row>
            <Card style={{ flex: 1 }}>
              <Label>Request Time</Label>
              <Chip icon="clock" text={requestedAt} />
            </Card>
            <Card style={{ flex: 1 }}>
              <Label>Mentor Approval</Label>
              <Chip
                icon="user-check"
                text={gatePass?.mentorApproval?.displayName || "Mentor"}
              />
              {gatePass?.mentorApproval?.comment ? (
                <Sub numberOfLines={3}>
                  Note: {gatePass.mentorApproval.comment}
                </Sub>
              ) : null}
            </Card>
          </Row>

          {/* HOD Comment */}
          <Card>
            <Label>HOD Comment</Label>
            <TextInput
              placeholder="Add a note or reason…"
              placeholderTextColor="#8d8d8d"
              value={comment}
              onChangeText={setComment}
              style={styles.input}
              multiline
            />
          </Card>
        </MotiView>
      </ScrollView>

      {/* Approve/Reject Actions */}
      <MotiView
        from={{ translateY: 40, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: "timing", duration: 240 }}
        style={[
          styles.actionsBar,
          { paddingBottom: (insets.bottom || 0) + 12 },
        ]}
      >
        <TouchableOpacity style={[styles.actBtn, styles.reject]} onPress={reject}>
          <Feather name="x-circle" size={16} color="#fff" />
          <Text style={styles.actText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actBtn, styles.approve]} onPress={approve}>
          <Feather name="check-circle" size={16} color="#fff" />
          <Text style={styles.actText}>Approve</Text>
        </TouchableOpacity>
      </MotiView>
    </SafeAreaView>
  );
}

/* ------------------ Helpers ------------------ */
function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
function Row({ children }) {
  return <View style={styles.row}>{children}</View>;
}
function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}
function Value({ children }) {
  return <Text style={styles.value}>{children}</Text>;
}
function Sub({ children, numberOfLines }) {
  return (
    <Text style={styles.subValue} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}
function Chip({ icon, text }) {
  return (
    <View style={styles.chip}>
      <Feather name={icon} size={12} color="#a8a8a8" />
      <Text style={styles.chipText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },
  center: { alignItems: "center", justifyContent: "center" },

  topBar: {
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
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  studentRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  avatarImg: { width: 54, height: 54, borderRadius: 27, resizeMode: "cover" },

  row: { flexDirection: "row", gap: 12 },

  label: { color: "#c9c9c9", fontSize: 12, marginBottom: 6 },
  value: { color: "#fff", fontSize: 16, fontWeight: "700" },

  subValue: { color: "#bdbdbd", marginTop: 6, fontSize: 12, lineHeight: 18 },

  // Bigger and bolder USN
  usnText: {
    color: "#fff",
    marginTop: 6,
    fontSize: 14,
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

  input: {
    backgroundColor: "#0f0f0f",
    color: "#fff",
    borderRadius: 12,
    padding: 12,
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#272727",
    marginTop: 6,
  },

  actionsBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    backgroundColor: "rgba(11,11,11,0.94)",
    borderTopWidth: 1,
    borderTopColor: "#1e1e1e",
    flexDirection: "row",
    gap: 10,
  },
  actBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  approve: { backgroundColor: "#166534" },
  reject: { backgroundColor: "#7f1d1d" },
  actText: { color: "#fff", fontWeight: "800", letterSpacing: 0.3 },
});
