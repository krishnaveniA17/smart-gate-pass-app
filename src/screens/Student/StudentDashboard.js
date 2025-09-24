// src/screens/Student/StudentDashboard.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Image,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { getUser } from "../../services/authStorage";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const db = getFirestore();
const auth = getAuth();

/* ---------- date+time format helper ---------- */
const fmt = (ts) => {
  if (!ts?.toDate) return "-";
  const d = ts.toDate();
  const date = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${date}  ${time}`; // single string
};

/* ---------- scaling helper ---------- */
const guidelineBaseWidth = 375;
const scale = (size, width = guidelineBaseWidth) =>
  Math.round((width / guidelineBaseWidth) * size);

export default function StudentDashboard({ navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Responsive tokens
  const H_PAD = Math.max(12, scale(16, width));
  const CARD_PADDING = Math.max(10, scale(14, width));
  const AVATAR_SIZE = Math.max(40, Math.min(72, scale(48, width)));
  const TITLE_SIZE = Math.max(16, scale(18, width));
  const SUB_SIZE = Math.max(12, scale(13, width));
  const META_FONT = Math.max(10, scale(12, width));
  const BADGE_FONT = Math.max(10, scale(11, width));
  const FAB_BOTTOM = Math.max(16, insets.bottom + 12);
  const BADGE_WIDTH = Math.max(84, scale(92, width));

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentPhoto, setStudentPhoto] = useState(null);

  // Fetch student profile
  const fetchProfile = useCallback(async () => {
    const storedUser = await getUser();
    if (storedUser) {
      setStudentEmail(storedUser.email || "");
      const snap = await getDoc(doc(db, "users", storedUser.uid));
      if (snap.exists()) {
        const data = snap.data();
        setStudentName(
          data.displayName ||
            auth.currentUser?.displayName ||
            storedUser.email?.split("@")[0] ||
            ""
        );
        setStudentPhoto(data.photoURL || null);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  // Load gate pass requests
  const load = useCallback(() => {
    if (!auth.currentUser?.uid) return;
    const q = query(
      collection(db, "gate_passes"),
      where("studentUid", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));
      setItems(arr);
      setLoading(false);
      setRefreshing(false);
    });
  }, []);

  useEffect(() => {
    const unsub = load();
    return () => unsub && unsub();
  }, [load]);

  // Filtered list
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter((it) => {
      const reason = (it.reason || "").toLowerCase();
      return reason.includes(s) || (it.id || "").toLowerCase().includes(s);
    });
  }, [items, search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    setTimeout(() => setRefreshing(false), 500);
  };

  const renderItem = ({ item, index }) => {
    const displayName = studentName || item.studentName || "Unknown";
    const initial = displayName?.[0]?.toUpperCase?.() || "?";
    const when = fmt(item.leaveAt);

    let badgeColor = "#facc15";
    let badgeLabel = "Pending";
    if (item.status === "approved") {
      badgeColor = "#16a34a";
      badgeLabel = "Approved";
    } else if (item.status === "rejected") {
      badgeColor = "#dc2626";
      badgeLabel = "Rejected";
    }

    // Expired check
    let isExpired = false;
    if (item.leaveAt?.toDate) {
      const leaveDate = item.leaveAt.toDate();
      const validUntil = new Date(leaveDate.setHours(23, 59, 59, 999));
      isExpired = new Date() > validUntil && item.status === "approved";
    }
    if (isExpired) {
      badgeColor = "#9ca3af";
      badgeLabel = "Expired";
    }

    const avatarPhoto = item.photoURL || studentPhoto;

    return (
      <MotiView
        from={{ opacity: 0, translateY: 14, scale: 0.98 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        transition={{ delay: index * 60, type: "timing", duration: 280 }}
        style={{ marginHorizontal: H_PAD, marginTop: 10 }}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() =>
            navigation.navigate("PassStatus", { gatePassId: item.id })
          }
        >
          <LinearGradient
            colors={["#1c1c2e", "#141414"]}
            style={[
              styles.card,
              {
                padding: CARD_PADDING,
                borderRadius: Math.max(12, scale(16, width)),
                alignItems: "center",
              },
            ]}
          >
            {avatarPhoto ? (
              <Image
                source={{ uri: avatarPhoto }}
                style={[
                  styles.avatarImg,
                  {
                    width: AVATAR_SIZE,
                    height: AVATAR_SIZE,
                    borderRadius: AVATAR_SIZE / 2,
                  },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  {
                    width: AVATAR_SIZE,
                    height: AVATAR_SIZE,
                    borderRadius: AVATAR_SIZE / 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.avatarText,
                    { fontSize: Math.max(14, scale(16, width)) },
                  ]}
                >
                  {initial}
                </Text>
              </View>
            )}

            {/* Text column */}
            <View style={styles.cardContent}>
              <Text
                style={[styles.cardTitle, { fontSize: TITLE_SIZE }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {displayName}
              </Text>

              <Text
                style={[styles.cardReason, { fontSize: SUB_SIZE }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.reason || "No reason provided"}
              </Text>

              {/* Date+Time pill */}
              <View style={{ marginTop: Math.max(8, scale(8, width)) }}>
                <Meta icon="calendar" value={when} metaFont={META_FONT} />
              </View>
            </View>

            {/* Badge column */}
            <View
              style={{
                width: BADGE_WIDTH,
                alignItems: "flex-end",
                justifyContent: "flex-start",
                marginLeft: Math.max(10, scale(10, width)),
              }}
            >
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: badgeColor,
                    paddingHorizontal: Math.max(8, scale(8, width)),
                    paddingVertical: Math.max(6, scale(6, width)),
                  },
                ]}
              >
                <Text style={[styles.badgeText, { fontSize: BADGE_FONT }]}>
                  {badgeLabel}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </MotiView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <Header
          search={search}
          setSearch={setSearch}
          studentEmail={studentEmail}
          studentName={studentName}
          width={width}
          insets={insets}
        />
        <View style={[styles.center, { paddingTop: 24 }]}>
          <ActivityIndicator />
          <Text style={{ color: "#bdbdbd", marginTop: 8 }}>
            Loading requests…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: FAB_BOTTOM + 72,
          paddingTop: 6,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Header
            search={search}
            setSearch={setSearch}
            studentEmail={studentEmail}
            studentName={studentName}
            width={width}
            insets={insets}
          />
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            right: H_PAD,
            bottom: FAB_BOTTOM,
            paddingVertical: Math.max(10, scale(12, width)),
            paddingHorizontal: Math.max(12, scale(14, width)),
            borderRadius: Math.max(12, scale(16, width)),
          },
        ]}
        onPress={() => navigation.navigate("RequestGatePass")}
      >
        <Feather
          name="plus"
          size={Math.max(16, scale(18, width))}
          color="#fff"
        />
        <Text
          style={[
            styles.fabText,
            { fontSize: Math.max(12, scale(13, width)) },
          ]}
        >
          Request Pass
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ------------------ Header ------------------ */
function Header({
  search,
  setSearch,
  studentEmail,
  studentName,
  width,
  insets,
}) {
  const H_PAD = Math.max(12, scale(16, width));
  const TITLE_SIZE = Math.max(20, scale(24, width));
  const SUB_SIZE = Math.max(12, scale(13, width));
  const headerPaddingTop =
    (insets?.top || 0) + Math.max(10, scale(10, width));

  return (
    <LinearGradient
      colors={["#0f1023", "#0b0b0b"]}
      style={[
        styles.headerGrad,
        {
          paddingHorizontal: H_PAD,
          paddingTop: headerPaddingTop,
          paddingBottom: Math.max(10, scale(12, width)),
        },
      ]}
    >
      <View style={styles.headerTopRow}>
        <Text style={[styles.headerTitle, { fontSize: TITLE_SIZE }]}>
          My Gate Passes
        </Text>
      </View>

      <Text style={[styles.emailText, { fontSize: SUB_SIZE, marginTop: 6 }]}>
        {studentName} {studentEmail ? `(${studentEmail})` : ""}
      </Text>

      <View
        style={[styles.searchWrap, { marginTop: Math.max(12, scale(12, width)) }]}
      >
        <Feather
          name="search"
          size={Math.max(14, scale(16, width))}
          color="#8a8a8a"
          style={{ marginHorizontal: 10 }}
        />
        <TextInput
          placeholder="Search by reason or ID…"
          placeholderTextColor="#8a8a8a"
          value={search}
          onChangeText={setSearch}
          style={[
            styles.searchInput,
            { paddingVertical: Math.max(8, scale(10, width)) },
          ]}
        />
      </View>
    </LinearGradient>
  );
}

/* ------------------ Meta ------------------ */
function Meta({ icon, value, metaFont }) {
  return (
    <View
      style={[
        styles.metaChip,
        {
          paddingVertical: Math.max(6, scale(6)),
          paddingHorizontal: Math.max(10, scale(12)),
        },
      ]}
    >
      <Feather name={icon} size={Math.max(12, metaFont)} color="#9ca3af" />
      <Text style={[styles.metaValue, { fontSize: metaFont }]}>{value}</Text>
    </View>
  );
}

/* ------------------ Styles ------------------ */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },
  center: { alignItems: "center", justifyContent: "center" },

  headerGrad: {
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#fff", fontWeight: "800" },
  emailText: { color: "#bbb" },

  searchWrap: {
    marginTop: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: { flex: 1, color: "#fff", paddingRight: 12 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222",
    gap: 12,
    backgroundColor: "transparent",
  },

  avatar: {
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800" },
  avatarImg: {
    resizeMode: "cover",
  },

  cardContent: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    minWidth: 0,
  },
  cardTitle: {
    color: "#fff",
    fontWeight: "800",
    flexShrink: 1,
    flexWrap: "nowrap",
  },
  cardReason: {
    color: "#cfcfcf",
    marginTop: 4,
  },

  metaRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0f1724",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 999,
  },
  metaValue: {
    color: "#e6eef8",
    marginLeft: 6,
    fontWeight: "600",
  },

  badge: {
    borderRadius: 999,
    alignSelf: "flex-start",
    marginLeft: 8,
  },
  badgeText: { color: "#000", fontWeight: "800" },

  fab: {
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1f6feb",
  },
  fabText: { color: "#fff", fontWeight: "800" },
});
