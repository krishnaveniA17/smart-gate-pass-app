// src/screens/Mentor/MentorRequestDetailsScreen.js
import { Feather, FontAwesome5 } from "@expo/vector-icons";
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
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const db = getFirestore();
const auth = getAuth();

const fmt = (ts) =>
  ts?.toDate?.() ? ts.toDate().toLocaleString() : ts ?? "-";

export default function MentorRequestDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { gatePassId } = route.params || {};
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [gatePass, setGatePass] = useState(null);
  const [student, setStudent] = useState(null);
  const [comment, setComment] = useState("");

  // responsive helpers
  const guidelineBaseWidth = 375;
  const scale = (size) => Math.round((width / guidelineBaseWidth) * size);

  const avatarSize = Math.max(48, scale(54));
  const titleSize = Math.max(16, scale(18));
  const labelSize = Math.max(12, scale(13));
  const valueSize = Math.max(16, scale(17));
  const chipFont = Math.max(12, scale(13));

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
          if (userSnap.exists())
            stu = { id: userSnap.id, ...userSnap.data() };
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
      { text: "Yes", onPress: onYes },
    ]);

  async function getMentorName(user) {
    try {
      const mentorSnap = await getDoc(doc(db, "users", user.uid));
      if (mentorSnap.exists() && mentorSnap.data().displayName) {
        return mentorSnap.data().displayName;
      }
      return user.email || "Mentor";
    } catch {
      return user.email || "Mentor";
    }
  }

  // Forward to HOD: set status = "pending_hod"
  const approve = async () => {
    confirm("Forward to HOD", async () => {
      const user = auth.currentUser;
      try {
        const mentorName = await getMentorName(user);

        await updateDoc(doc(db, "gate_passes", gatePassId), {
          status: "pending_hod",
          mentorUid: user?.uid || null,
          mentorApproval: {
            uid: user?.uid || null,
            displayName: mentorName,
            comment: comment || null,
            decision: "forwarded",
            at: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        });

        Alert.alert("Forwarded", "Gate pass forwarded to HOD.");
        navigation.navigate("MentorTabs", { screen: "MentorDashboard" });
      } catch (e) {
        console.warn("Approve error:", e);
        Alert.alert("Error", "Could not forward. Check permissions/rules.");
      }
    });
  };

  // Reject: set status = "rejected"
  const reject = async () => {
    if (!comment.trim()) {
      Alert.alert("Reason required", "Please add a rejection reason.");
      return;
    }
    confirm("Reject gate pass", async () => {
      const user = auth.currentUser;
      try {
        const mentorName = await getMentorName(user);

        await updateDoc(doc(db, "gate_passes", gatePassId), {
          // standard rejected status
          status: "rejected",
          mentorUid: user?.uid || null,
          mentorApproval: {
            uid: user?.uid || null,
            displayName: mentorName,
            comment: comment,
            decision: "rejected",
            at: serverTimestamp(),
          },
          // clear forwarded flag if any legacy boolean exists
          forwardedToHOD: false,
          updatedAt: serverTimestamp(),
        });

        Alert.alert("Rejected", "Gate pass rejected.");
        navigation.navigate("MentorTabs", { screen: "MentorDashboard" });
      } catch (e) {
        console.warn("Reject error:", e);
        Alert.alert("Error", "Could not reject. Check permissions/rules.");
      }
    });
  };

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

  const requestedAt = fmt(
    gatePass?.requestedDepartureAt ||
      gatePass?.departureTime ||
      gatePass?.createdAt ||
      gatePass?.updatedAt
  );

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#0f1023", "#0b0b0b"]} style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={20} color="#eaeaea" />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { fontSize: titleSize }]}>
          Request Details
        </Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
      >
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Student Card */}
          <View style={styles.card}>
            <View style={styles.studentRow}>
              {studentPhoto ? (
                <Image
                  source={{ uri: studentPhoto }}
                  style={[
                    styles.avatarImg,
                    { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                  ]}
                />
              ) : (
                <View
                  style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                >
                  <Text style={[styles.avatarText, { fontSize: scale(18) }]}>
                    {studentInitial}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { fontSize: labelSize }]}>Student</Text>
                <Text style={[styles.value, { fontSize: valueSize }]}>{studentName}</Text>
                {gatePass?.usn && <View style={styles.chip}><FontAwesome5 name="id-card" size={12} color="#a8a8a8" /><Text style={[styles.chipText, { fontSize: chipFont }]}>{gatePass.usn}</Text></View>}
                {gatePass?.studentMobile && <View style={styles.chip}><Feather name="phone" size={12} color="#a8a8a8" /><Text style={[styles.chipText, { fontSize: chipFont }]}>Student: {gatePass.studentMobile}</Text></View>}
                {gatePass?.parentMobile && <View style={styles.chip}><Feather name="phone" size={12} color="#a8a8a8" /><Text style={[styles.chipText, { fontSize: chipFont }]}>Parent: {gatePass.parentMobile}</Text></View>}
                {(gatePass?.year || gatePass?.section) && <View style={styles.chip}><Feather name="book" size={12} color="#a8a8a8" /><Text style={[styles.chipText, { fontSize: chipFont }]}>Year: {gatePass.year || "—"}, Sec: {gatePass.section || "—"}</Text></View>}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={[styles.label, { fontSize: labelSize }]}>Reason</Text>
            <Text style={[styles.value, { fontSize: valueSize }]}>{gatePass?.reason || "No reason provided"}</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={[styles.label, { fontSize: labelSize }]}>Request Time</Text>
              <View style={styles.chip}><Feather name="clock" size={12} color="#a8a8a8" /><Text style={[styles.chipText, { fontSize: chipFont }]}>{requestedAt}</Text></View>
            </View>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={[styles.label, { fontSize: labelSize }]}>Mentor Comment</Text>
              <TextInput
                placeholder="Add a note or reason…"
                placeholderTextColor="#8d8d8d"
                value={comment}
                onChangeText={setComment}
                style={[styles.input, { fontSize: chipFont }]}
                multiline
              />
            </View>
          </View>
        </MotiView>
      </ScrollView>

      {/* Sticky actions */}
      <MotiView
        from={{ translateY: 40, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: "timing", duration: 240 }}
        style={styles.actionsBar}
      >
        <TouchableOpacity style={[styles.actBtn, styles.reject]} onPress={reject}>
          <Feather name="x-circle" size={16} color="#fff" />
          <Text style={[styles.actText, { fontSize: chipFont }]}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actBtn, styles.approve]} onPress={approve}>
          <Feather name="send" size={16} color="#fff" />
          <Text style={[styles.actText, { fontSize: chipFont }]}>Forward to HOD</Text>
        </TouchableOpacity>
      </MotiView>
    </SafeAreaView>
  );
}

/* styles (same as before) */
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
  topTitle: { color: "#fff", fontWeight: "800", flex: 1, textAlign: "center" },
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
  avatar: { backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800" },
  avatarImg: { resizeMode: "cover" },
  row: { flexDirection: "row", gap: 12 },
  label: { color: "#c9c9c9", marginBottom: 6 },
  value: { color: "#fff", fontWeight: "700" },
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
    marginTop: 4,
  },
  chipText: { color: "#eaeaea", fontWeight: "600" },
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
    padding: 12,
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
  actText: { color: "#fff", fontWeight: "800" },
});
