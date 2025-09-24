// src/screens/Mentor/MentorDashboardScreen.js
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const db = getFirestore();
const auth = getAuth();

const fmt = (ts) => (ts?.toDate?.() ? ts.toDate().toLocaleString() : ts ?? "-");

// scale helper (375 baseline)
const guidelineBaseWidth = 375;
const scale = (size, width = guidelineBaseWidth) =>
  Math.round((width / guidelineBaseWidth) * size);

const STATUS_TO_QUERY = "pending_mentor";

/* Header component */
const Header = memo(function Header({
  itemsCount,
  filteredCount,
  search,
  setSearch,
  topInset = 0,
}) {
  const user = auth.currentUser;
  const { width } = useWindowDimensions();

  return (
    <LinearGradient
      colors={["#0f1023", "#0b0b0b"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.headerGrad, { paddingTop: 12 + topInset }]}
    >
      <View style={styles.headerTopRow}>
        <Text style={[styles.headerTitle, { fontSize: scale(24, width) }]}>
          Pass Requests
        </Text>

        <View style={[styles.profileChip, { maxWidth: Math.max(120, width * 0.36) }]}>
          <Feather name="user" size={14} color="#dcdcdc" />
          <Text style={styles.profileText} numberOfLines={1}>
            {user?.displayName || "Mentor"}
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color="#8a8a8a" style={{ marginHorizontal: 10 }} />
        <TextInput
          placeholder="Search student, reason, or ID…"
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
        <Stat label="Assigned" value={itemsCount} />
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

function MetaChip({ icon, value }) {
  return (
    <View style={styles.metaChip}>
      <Feather name={icon} size={12} color="#a8a8a8" />
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/* Screen */
export default function MentorDashboardScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return () => {};
    }

    let q;
    try {
      q = query(
        collection(db, "gate_passes"),
        where("mentorUid", "==", user.uid),
        where("status", "==", STATUS_TO_QUERY),
        orderBy("createdAt", "desc")
      );
    } catch (err) {
      q = query(
        collection(db, "gate_passes"),
        where("mentorUid", "==", user.uid),
        where("status", "==", STATUS_TO_QUERY)
      );
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));
        if (!q._queryOptions || !q._queryOptions.orderBy) {
          // fallback client-side sort
          arr.sort((a, b) => {
            const aT = a.createdAt?.seconds || a.createdAt || 0;
            const bT = b.createdAt?.seconds || b.createdAt || 0;
            return bT - aT;
          });
        }
        setItems(arr);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.warn("mentor dashboard load error:", err);
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
    // keep existing behavior — you can trigger load() again if needed
    setTimeout(() => setRefreshing(false), 500);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter((it) => {
      const name = (it.studentName || it.student?.name || "").toLowerCase();
      const reason = (it.reason || "").toLowerCase();
      return (
        name.includes(s) ||
        reason.includes(s) ||
        (it.id || "").toLowerCase().includes(s)
      );
    });
  }, [items, search]);

  const renderItem = ({ item, index }) => {
    const studentName = item.studentName || item.student?.name || "Unknown";
    const reason = item.reason || "No reason provided";
    const when = fmt(item.createdAt || item.updatedAt || item.mentorApproval?.at);
    const photo = item.photoURL || item.student?.photoURL || null;
    const initial = studentName?.[0]?.toUpperCase?.() || "?";

    // responsive sizing
    const avatarSize = Math.max(48, Math.min(72, scale(56, width)));
    const padding = Math.max(12, scale(14, width));
    const badgeFont = Math.max(11, scale(12, width));

    const statusLabel = item.status === "pending_mentor" ? "Pending" : (item.status || "Pending");

    return (
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 30, type: "timing", duration: 260 }}
        style={{ width: "100%" }}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => navigation.navigate("MentorRequestDetails", { gatePassId: item.id })}
        >
          <View style={[styles.card, { padding }]}>
            {/* Avatar */}
            {photo ? (
              <Image
                source={{ uri: photo }}
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                  marginRight: 12,
                  resizeMode: "cover",
                }}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, marginRight: 12 },
                ]}
              >
                <Text style={[styles.avatarText, { fontSize: Math.max(16, scale(18, width)) }]}>{initial}</Text>
              </View>
            )}

            {/* Main content */}
            <View style={{ flex: 1, minWidth: 0 }}>
              {/* Name */}
              <Text
                style={[styles.cardTitle, { fontSize: Math.max(15, scale(17, width)) }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {studentName}
              </Text>

              {/* Reason + Status pill row */}
              <View style={styles.reasonRow}>
                <Text
                  style={[styles.cardReason, { fontSize: Math.max(12, scale(13, width)), flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {reason}
                </Text>

                <View style={[styles.badgePending, { paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 }]}>
                  <Feather name="clock" size={12} color="#000" />
                  <Text style={[styles.badgePendingText, { fontSize: badgeFont }]}>{statusLabel}</Text>
                </View>
              </View>

              {/* Time chip below */}
              <View style={[styles.metaRow, { marginTop: 10 }]}>
                <MetaChip icon="clock" value={when} />
                {(item.mentorName || item.mentor?.name) ? (
                  <MetaChip icon="user" value={`Mentor: ${item.mentorName || item.mentor?.name}`} />
                ) : null}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
        <Header itemsCount={items.length} filteredCount={items.length} search={search} setSearch={setSearch} topInset={insets.top} />
        <View style={[styles.center, { paddingTop: 24 }]}>
          <ActivityIndicator />
          <Text style={{ color: "#bdbdbd", marginTop: 8 }}>Loading mentor requests…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <Header itemsCount={items.length} filteredCount={filtered.length} search={search} setSearch={setSearch} topInset={insets.top} />

      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 16,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={() => (
          <View style={styles.center}>
            <Feather name="inbox" size={40} color="#666" />
            <Text style={styles.empty}>No requests assigned to you.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

/* styles */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },

  headerGrad: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#fff", fontWeight: "800" },

  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  profileText: { color: "#e6e6e6", maxWidth: 140, fontWeight: "600", marginLeft: 6 },

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
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    paddingRight: 12,
  },

  statRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#232323",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  statValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#bdbdbd", marginTop: 2, fontSize: 12 },

  center: { alignItems: "center", justifyContent: "center" },
  empty: { color: "#999", fontSize: 15, marginTop: 8 },

  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    backgroundColor: "#151515",
    borderWidth: 1,
    borderColor: "#222",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    width: "100%",
  },

  avatar: {
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800" },

  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },

  cardTitle: { color: "#fff", fontWeight: "800", marginRight: 8, flex: 1 },
  cardReason: { color: "#ccc" },

  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginRight: 8,
  },
  metaValue: { color: "#aaa", fontSize: 12, fontWeight: "600", marginLeft: 8 },

  badgePending: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffb84d",
    borderRadius: 999,
  },
  badgePendingText: { color: "#000", fontWeight: "800", marginLeft: 8 },

  metaChipText: { color: "#aaa", marginLeft: 8 },
});
