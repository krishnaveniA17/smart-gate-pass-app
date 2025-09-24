// src/screens/HOD/HODDashboardScreen.js
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { getAuth } from "firebase/auth";
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";

const db = getFirestore();
const auth = getAuth();

const fmt = (ts) =>
  ts?.toDate?.() ? ts.toDate().toLocaleString() : ts ?? "-";

/* ------------------ Memoized Header ------------------ */
const Header = memo(function Header({
  itemsCount,
  filteredCount,
  search,
  setSearch,
}) {
  const user = auth.currentUser;

  return (
    <LinearGradient
      colors={["#0f1023", "#0b0b0b"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGrad}
    >
      <View style={styles.headerTopRow}>
        <Text style={styles.headerTitle}>Pass Requests</Text>
        <View style={styles.profileChip}>
          <Feather name="user" size={14} color="#dcdcdc" />
          <Text style={styles.profileText} numberOfLines={1}>
            {user?.displayName || "HOD"}
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Feather
          name="search"
          size={16}
          color="#8a8a8a"
          style={{ marginHorizontal: 10 }}
        />
        <TextInput
          placeholder="Search student, reason, mentor, or ID…"
          placeholderTextColor="#8a8a8a"
          value={search}
          onChangeText={(t) => setSearch(t)}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.statRow}>
        <Stat label="Waiting" value={itemsCount} />
        <Stat label="Filtered" value={filteredCount} />
      </View>
    </LinearGradient>
  );
});

function Stat({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Meta({ icon, value }) {
  return (
    <View style={styles.metaChip}>
      <Feather name={icon} size={12} color="#a8a8a8" />
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/* ------------------ Screen ------------------ */
export default function HODDashboardScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const q = query(
      collection(db, "gate_passes"),
      where("status", "==", "pending_hod"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));
        setItems(arr);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.warn("HOD list error:", err);
        setLoading(false);
        setRefreshing(false);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = load();
    return () => unsub && unsub();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter((it) => {
      const name = (it.studentName || it.student?.name || "").toLowerCase();
      const reason = (it.reason || "").toLowerCase();
      const mentor = (it.mentorApproval?.displayName || "").toLowerCase();
      return (
        name.includes(s) ||
        reason.includes(s) ||
        mentor.includes(s) ||
        it.id.toLowerCase().includes(s)
      );
    });
  }, [items, search]);

  const renderItem = ({ item, index }) => {
    const studentName = item.studentName || item.student?.name || "Unknown";
    const mentorName =
      item.mentorApproval?.displayName || item.mentorName || "—";
    const when = fmt(item.createdAt); // ✅ fixed time field

    const avatarPhoto = item.photoURL || item.student?.photoURL || null;
    const initial = studentName?.[0]?.toUpperCase?.() || "?";

    return (
      <MotiView
        from={{ opacity: 0, translateY: 14, scale: 0.98 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        transition={{ delay: index * 70, type: "timing", duration: 300 }}
        style={{ marginHorizontal: 16 }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            navigation.navigate("HODRequestDetails", { gatePassId: item.id })
          }
        >
          <View style={styles.card}>
            {avatarPhoto ? (
              <Image source={{ uri: avatarPhoto }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {studentName}
              </Text>
              <Text style={styles.cardReason} numberOfLines={2}>
                {item.reason || "No reason provided"}
              </Text>

              <View style={styles.metaRow}>
                <Meta icon="clock" value={when} />
                <Meta icon="user-check" value={`Mentor: ${mentorName}`} />
              </View>
            </View>

            <View style={styles.badgeYellow}>
              <Feather name="clock" size={12} color="#000" />
              <Text style={styles.badgeText}>Pending</Text>
            </View>
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header
          itemsCount={items.length}
          filteredCount={items.length}
          search={search}
          setSearch={setSearch}
        />
        <View style={[styles.center, { paddingTop: 24 }]}>
          <ActivityIndicator />
          <Text style={{ color: "#bdbdbd", marginTop: 8 }}>
            Loading gate pass requests…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 96, paddingTop: 6, gap: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Header
            itemsCount={items.length}
            filteredCount={filtered.length}
            search={search}
            setSearch={setSearch}
          />
        }
      />
    </SafeAreaView>
  );
}

/* ------------------ styles ------------------ */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },

  headerGrad: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  profileText: { color: "#e6e6e6", maxWidth: 140, fontWeight: "600" },

  searchWrap: {
    marginTop: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    paddingVertical: 10,
    paddingRight: 12,
  },

  statRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#232323",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#bdbdbd", marginTop: 2, fontSize: 12 },

  center: { alignItems: "center", justifyContent: "center" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "#222",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    gap: 12,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    resizeMode: "cover",
  },

  cardTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cardReason: { color: "#ccc", fontSize: 13, marginTop: 2 },

  metaRow: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  metaValue: { color: "#aaa", fontSize: 12, fontWeight: "600" },

  badgeYellow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffb84d", // pending yellow/orange
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeText: { color: "#000", fontWeight: "700", fontSize: 12 },
});
