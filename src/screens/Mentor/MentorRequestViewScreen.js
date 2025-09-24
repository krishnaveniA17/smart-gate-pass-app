// src/screens/Mentor/MentorRequestViewScreen.js
import { useRoute } from "@react-navigation/native";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const db = getFirestore();
const fmt = (ts) =>
  ts?.toDate?.() ? ts.toDate().toLocaleString() : ts ?? "—";

export default function MentorRequestViewScreen() {
  const route = useRoute();
  const { gatePassId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [gatePass, setGatePass] = useState(null);
  const [student, setStudent] = useState(null);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // responsive helper
  const guidelineBaseWidth = 375;
  const scale = (size) => Math.round((width / guidelineBaseWidth) * size);

  const avatarSize = Math.max(60, scale(70));
  const headerTitleSize = Math.max(20, scale(22));
  const subtitleSize = Math.max(14, scale(15));
  const labelSize = Math.max(12, scale(13));
  const valueSize = Math.max(15, scale(16));

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "gate_passes", gatePassId));
        if (snap.exists()) {
          const pass = { id: snap.id, ...snap.data() };
          setGatePass(pass);

          if (pass.studentUid) {
            const stuSnap = await getDoc(doc(db, "users", pass.studentUid));
            if (stuSnap.exists()) {
              setStudent({ id: stuSnap.id, ...stuSnap.data() });
            }
          }
        }
      } catch (e) {
        console.warn("View load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [gatePassId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={{ color: "#aaa", marginTop: 8 }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!gatePass) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={{ color: "#f87171" }}>Pass not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const studentName =
    student?.displayName || gatePass.studentName || "Unknown Student";
  const studentPhoto = student?.photoURL || gatePass?.photoURL || null;
  const studentInitial = studentName?.[0]?.toUpperCase?.() || "?";

  const statusColor =
    gatePass.status === "approved"
      ? "#4ade80"
      : gatePass.status === "rejected"
      ? "#ef4444"
      : "#facc15";

  const statusIcon =
    gatePass.status === "approved"
      ? "check-circle"
      : gatePass.status === "rejected"
      ? "x-circle"
      : "clock";

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0b0b0b"
        translucent={false}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
      >
        {/* Header Section */}
        <LinearGradient colors={["#1f1f33", "#0b0b0b"]} style={styles.headerCard}>
          {studentPhoto ? (
            <Image
              source={{ uri: studentPhoto }}
              style={[
                styles.avatarImg,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            >
              <Text style={[styles.avatarText, { fontSize: scale(26) }]}>
                {studentInitial}
              </Text>
            </View>
          )}
          <Feather
            name={statusIcon}
            size={scale(40)}
            color={statusColor}
            style={{ marginTop: 12 }}
          />
          <Text style={[styles.headerTitle, { fontSize: headerTitleSize }]}>
            Gate Pass Details
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: subtitleSize }]}>
            {studentName}
          </Text>
        </LinearGradient>

        {/* Core Info */}
        <InfoCard
          icon="file-text"
          label="Reason"
          value={gatePass.reason || "No reason given"}
          labelSize={labelSize}
          valueSize={valueSize}
        />

        <InfoCard
          icon={statusIcon}
          label="Status"
          value={gatePass.status}
          valueStyle={{ color: statusColor }}
          labelSize={labelSize}
          valueSize={valueSize}
        />

        {/* Student academic info */}
        <InfoCardFA
          icon="id-card"
          label="USN"
          value={gatePass.usn || "—"}
          labelSize={labelSize}
          valueSize={valueSize}
        />
        <InfoCard
          icon="layers"
          label="Year"
          value={gatePass.year || "—"}
          labelSize={labelSize}
          valueSize={valueSize}
        />
        <InfoCard
          icon="users"
          label="Section"
          value={gatePass.section || "—"}
          labelSize={labelSize}
          valueSize={valueSize}
        />

        {/* Contact info */}
        <InfoCard
          icon="phone"
          label="Student Mobile"
          value={gatePass.studentMobile || "—"}
          labelSize={labelSize}
          valueSize={valueSize}
        />
        <InfoCard
          icon="phone"
          label="Parent Mobile"
          value={gatePass.parentMobile || "—"}
          labelSize={labelSize}
          valueSize={valueSize}
        />

        {/* Leave Date & Time */}
        <InfoCard
          icon="clock"
          label="Leave Date & Time"
          value={fmt(gatePass.leaveAt)}
          labelSize={labelSize}
          valueSize={valueSize}
        />

        {/* Mentor Decision */}
        {gatePass.mentorApproval && (
          <InfoCard
            icon="user-check"
            label="Mentor Decision"
            value={`${gatePass.mentorApproval.displayName} — ${
              gatePass.mentorApproval.decision || "—"
            }`}
            subValue={
              gatePass.mentorApproval.comment
                ? `📝 ${gatePass.mentorApproval.comment}`
                : null
            }
            labelSize={labelSize}
            valueSize={valueSize}
          />
        )}

        {/* HOD Approval */}
        {gatePass.hodApproval && (
          <InfoCard
            icon="briefcase"
            label="HOD Decision"
            value={`${gatePass.hodApproval.displayName} — ${
              gatePass.hodApproval.decision || "—"
            }`}
            subValue={
              (gatePass.hodApproval.comment
                ? `📝 ${gatePass.hodApproval.comment}\n`
                : "") +
              (gatePass.hodApproval.at
                ? `🕒 ${fmt(gatePass.hodApproval.at)}`
                : "")
            }
            valueStyle={{
              color:
                gatePass.hodApproval.decision === "approved"
                  ? "#4ade80"
                  : gatePass.hodApproval.decision === "rejected"
                  ? "#ef4444"
                  : "#facc15",
            }}
            labelSize={labelSize}
            valueSize={valueSize}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ✅ Feather InfoCard */
function InfoCard({ icon, label, value, subValue, valueStyle, labelSize, valueSize }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Feather name={icon} size={18} color="#888" style={{ marginRight: 8 }} />
        <Text style={[styles.label, { fontSize: labelSize }]}>{label}</Text>
      </View>
      {value !== undefined && (
        <Text style={[styles.value, { fontSize: valueSize }, valueStyle]}>
          {String(value)}
        </Text>
      )}
      {subValue ? (
        <Text style={[styles.subValue, { fontSize: labelSize }]}>{String(subValue)}</Text>
      ) : null}
    </View>
  );
}

/* ✅ FontAwesome5 InfoCard */
function InfoCardFA({ icon, label, value, subValue, valueStyle, labelSize, valueSize }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <FontAwesome5 name={icon} size={18} color="#888" style={{ marginRight: 8 }} />
        <Text style={[styles.label, { fontSize: labelSize }]}>{label}</Text>
      </View>
      {value !== undefined && (
        <Text style={[styles.value, { fontSize: valueSize }, valueStyle]}>
          {String(value)}
        </Text>
      )}
      {subValue ? (
        <Text style={[styles.subValue, { fontSize: labelSize }]}>{String(subValue)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },
  container: { flex: 1, backgroundColor: "#0b0b0b" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerCard: {
    borderRadius: 18,
    paddingVertical: 26,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  avatar: {
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800" },
  avatarImg: { resizeMode: "cover" },

  headerTitle: {
    color: "#fff",
    fontWeight: "800",
    marginTop: 12,
  },
  headerSubtitle: { color: "#bbb", marginTop: 4 },

  card: {
    backgroundColor: "#151515",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#232323",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  label: { color: "#aaa" },
  value: { color: "#fff", fontWeight: "600", marginTop: 2 },
  subValue: { color: "#bbb", marginTop: 8, lineHeight: 18 },
});
