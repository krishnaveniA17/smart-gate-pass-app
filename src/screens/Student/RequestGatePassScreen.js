// src/screens/Student/RequestGatePassScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  useWindowDimensions,
  Modal,
  FlatList,
} from "react-native";
import {
  collection,
  addDoc,
  getDocs,
  getFirestore,
  query,
  where,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Provider as PaperProvider } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const db = getFirestore();
const auth = getAuth();

/* ---------- scaling helper (375 baseline) ---------- */
const guidelineBaseWidth = 375;
const scale = (size, width = guidelineBaseWidth) =>
  Math.round((width / guidelineBaseWidth) * size);

export default function RequestGatePassScreen({ navigation }) {
  const user = auth.currentUser;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // responsive tokens (derived each render so they adapt to rotation / tablets)
  const H_PADDING = Math.max(12, scale(16, width));
  const HEADING_SIZE = Math.max(18, scale(22, width));
  const LABEL_SIZE = Math.max(12, scale(14, width));
  const INPUT_PADDING = Math.max(10, scale(14, width));
  const BTN_VERTICAL = Math.max(12, scale(14, width));
  const BTN_FONT = Math.max(14, scale(15, width));
  const MENU_BTN_PAD_V = Math.max(8, scale(10, width));
  const GUTTER = Math.max(12, scale(16, width));

  // 🔹 Form states
  const [reason, setReason] = useState("");
  const [leaveAt] = useState(new Date());

  // 🔹 Mentor states
  const [mentors, setMentors] = useState([]);
  const [mentorUid, setMentorUid] = useState(null);
  const [mentorName, setMentorName] = useState("Select Mentor");
  const [mentorModal, setMentorModal] = useState(false);

  // 🔹 Student info
  const [studentName, setStudentName] = useState("Student");
  const [usn, setUsn] = useState("");
  const [studentMobile, setStudentMobile] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [photoURL, setPhotoURL] = useState(null); // ✅ storage URL

  // ✅ Fetch student profile (including HTTPS photoURL)
  useEffect(() => {
    (async () => {
      if (!user?.uid) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setStudentName(data.displayName || "Student");
        setUsn(data.usn || "");
        setStudentMobile(data.mobile || "");
        setParentMobile(data.parentMobile || "");
        setDepartment(data.department || "");
        setYear(data.year || "");
        setSection(data.section || "");
        setPhotoURL(data.photoURL || null); // ✅ get HTTPS URL
      }
    })();
  }, [user?.uid]);

  // ✅ Fetch mentors
  useEffect(() => {
    (async () => {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "mentor"))
      );
      const arr = [];
      snap.forEach((d) => arr.push({ uid: d.id, ...d.data() }));
      setMentors(arr);
    })();
  }, []);

  // digit-only setter with limit 10 (visible while typing)
  const handleStudentMobileChange = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setStudentMobile(digits);
  };
  const handleParentMobileChange = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setParentMobile(digits);
  };

  // ✅ Submit gate pass request (logic unchanged)
  const submit = async () => {
    if (
      !reason.trim() ||
      !mentorUid ||
      !studentMobile.trim() ||
      !parentMobile.trim() ||
      !department.trim() ||
      !year.trim() ||
      !section.trim()
    ) {
      return Alert.alert("Missing info", "Please fill all fields.");
    }

    try {
      await addDoc(collection(db, "gate_passes"), {
        studentUid: user.uid,
        studentName,
        usn,
        studentMobile,
        parentMobile,
        department,
        year,
        section,
        mentorUid,
        reason,
        leaveAt,
        photoURL: photoURL || null, // ✅ only HTTPS URL is saved now
        status: "pending_mentor",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Request Sent", "Your gate pass request was submitted.", [
        {
          text: "OK",
          onPress: () =>
            navigation.navigate("StudentTabs", { screen: "StudentDashboard" }),
        },
      ]);
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", "Could not submit request.");
    }
  };

  return (
    <PaperProvider>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={[styles.safe, { paddingHorizontal: H_PADDING, paddingTop: Math.max(insets.top + 8, 12) }]}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 28, 40) }}
        >
          <Text style={[styles.heading, { fontSize: HEADING_SIZE, marginBottom: GUTTER }]}>
            New Gatepass Request
          </Text>

          {/* Auto-filled student info */}
          <Text style={[styles.label, { fontSize: LABEL_SIZE, marginTop: 0 }]}>Name</Text>
          <Text style={[styles.readonly, { padding: INPUT_PADDING }]} numberOfLines={1} ellipsizeMode="tail">
            {studentName}
          </Text>

          <Text style={[styles.label, { fontSize: LABEL_SIZE }]}>USN</Text>
          <Text style={[styles.readonly, { padding: INPUT_PADDING }]} numberOfLines={1}>
            {usn}
          </Text>

          <Text style={[styles.label, { fontSize: LABEL_SIZE }]}>Department</Text>
          <Text style={[styles.readonly, { padding: INPUT_PADDING }]} numberOfLines={1}>
            {department}
          </Text>

          <Text style={[styles.label, { fontSize: LABEL_SIZE }]}>Year</Text>
          <Text style={[styles.readonly, { padding: INPUT_PADDING }]} numberOfLines={1}>
            {year}
          </Text>

          <Text style={[styles.label, { fontSize: LABEL_SIZE }]}>Section</Text>
          <Text style={[styles.readonly, { padding: INPUT_PADDING }]} numberOfLines={1}>
            {section}
          </Text>

          {/* Reason */}
          <Text style={[styles.label, { fontSize: LABEL_SIZE }]}>Reason</Text>
          <TextInput
            style={[styles.input, { height: Math.max(80, scale(90, width)), padding: INPUT_PADDING }]}
            value={reason}
            onChangeText={setReason}
            placeholder="Enter reason for gate pass"
            placeholderTextColor="#777"
            multiline
          />

          {/* Leave Date & Time */}
          <Text style={[styles.label, { fontSize: LABEL_SIZE }]}>Leave Date & Time</Text>
          <Text style={[styles.readonly, { padding: INPUT_PADDING }]} numberOfLines={1}>
            {leaveAt.toLocaleString("en-IN")}
          </Text>

          {/* Mentor (touchable + modal) */}
          <Text style={[styles.label, { fontSize: LABEL_SIZE }]}>Mentor</Text>

          <TouchableOpacity
            style={[styles.dropdownBtn, { paddingVertical: MENU_BTN_PAD_V }]}
            onPress={() => {
              Keyboard.dismiss();
              setMentorModal(true);
            }}
            activeOpacity={0.9}
          >
            <Text style={[styles.dropdownText, { fontSize: Math.max(13, scale(14, width)) }]} numberOfLines={1}>
              {mentorName}
            </Text>
            <Text style={[styles.chev, { fontSize: Math.max(16, scale(18, width)) }]}>▾</Text>
          </TouchableOpacity>

          <Modal visible={mentorModal} transparent animationType="slide" onRequestClose={() => setMentorModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { maxHeight: "70%" }]}>
                <Text style={[styles.modalTitle, { fontSize: Math.max(16, scale(17, width)) }]}>Select Mentor</Text>

                <FlatList
                  data={mentors}
                  keyExtractor={(item) => item.uid}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setMentorUid(item.uid);
                        setMentorName(item.displayName || "Mentor");
                        setMentorModal(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{item.displayName}</Text>
                    </TouchableOpacity>
                  )}
                  ListHeaderComponent={
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setMentorUid(null);
                        setMentorName("Select Mentor");
                        setMentorModal(false);
                      }}
                    >
                      <Text style={[styles.modalItemText, { color: "#f87171" }]}>Clear Selection</Text>
                    </TouchableOpacity>
                  }
                  ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#2a2a2a" }} />}
                />

                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setMentorModal(false)}>
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Student Mobile */}
          <Text style={[styles.label, { fontSize: LABEL_SIZE }]}>Student Mobile</Text>
          <TextInput
            style={[styles.input, { padding: INPUT_PADDING }]}
            value={studentMobile}
            onChangeText={handleStudentMobileChange}
            keyboardType="phone-pad"
            placeholder="Enter your mobile number"
            placeholderTextColor="#777"
            maxLength={10}
          />

          {/* Parent Mobile */}
          <Text style={[styles.label, { fontSize: LABEL_SIZE }]}>Parent Mobile</Text>
          <TextInput
            style={[styles.input, { padding: INPUT_PADDING }]}
            value={parentMobile}
            onChangeText={handleParentMobileChange}
            keyboardType="phone-pad"
            placeholder="Enter parent's mobile number"
            placeholderTextColor="#777"
            maxLength={10}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, { paddingVertical: BTN_VERTICAL, marginTop: Math.max(18, scale(20, width)) }]}
            onPress={submit}
            activeOpacity={0.9}
          >
            <Text style={[styles.btnText, { fontSize: BTN_FONT }]}>Submit Request</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },
  heading: {
    fontWeight: "800",
    color: "#fff",
  },
  label: {
    color: "#bbb",
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#151515",
    borderRadius: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 12,
  },
  readonly: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    color: "#aaa",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#2f2f2f",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  dropdownText: {
    color: "#f3f4f6",
    fontWeight: "600",
    flexShrink: 1,
  },
  chev: {
    color: "#9ca3af",
  },
  menuBtn: {
    backgroundColor: "#2563eb",
    marginVertical: 6,
    borderRadius: 12,
  },
  btn: {
    marginTop: 28,
    backgroundColor: "#2563eb",
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },

  /* modal styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#1c1c1c",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  modalTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
    marginBottom: 8,
    textAlign: "center",
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  modalItemText: {
    color: "#e5e7eb",
    fontSize: 15,
  },
  modalCloseBtn: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2563eb",
  },
  modalCloseText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});