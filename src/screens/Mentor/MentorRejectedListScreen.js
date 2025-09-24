// src/screens/Mentor/MentorRejectedListScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  onSnapshot,
  query,
  where,
  getFirestore,
  orderBy,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { MotiView } from "moti";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const db = getFirestore();
const auth = getAuth();

const fmt = (ts) => {
  if (!ts) return "-";
  if (ts?.toDate) return ts.toDate().toLocaleString();
  if (typeof ts === "object" && ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  return String(ts);
};

export default function MentorRejectedListScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  const user = auth.currentUser;

  // responsive helpers (base width 375)
  const guidelineBaseWidth = 375;
  const scale = (size) => Math.round((width / guidelineBaseWidth) * size);
  const avatarSize = Math.max(42, Math.min(72, scale(52)));
  const cardPadding = Math.max(12, scale(14));
  const titleSize = Math.max(15, scale(17));
  const subSize = Math.max(12, scale(13));
  const badgeFont = Math.max(11, scale(12));

  const load = useCallback(() => {
    setLoading(true);
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    let q;
    try {
      q = query(
        collection(db, "gate_passes"),
        where("mentorUid", "==", user.uid),
        where("status", "==", "rejected"),
        orderBy("updatedAt", "desc")
      );
    } catch (err) {
      q = query(
        collection(db, "gate_passes"),
        where("mentorUid", "==", user.uid),
        where("status", "==", "rejected")
      );
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));

        // client-side sort fallback
        const needsClientSort = !q._queryOptions || !q._queryOptions.orderBy;
        if (needsClientSort) {
          arr.sort((a, b) => {
            const aTime = a.updatedAt?.seconds ?? a.updatedAt ?? 0;
            const bTime = b.updatedAt?.seconds ?? b.updatedAt ?? 0;
            return bTime - aTime;
          });
        }

        setItems(arr);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.warn("Mentor rejected list error:", err);
        setLoading(false);
        setRefreshing(false);
      }
    );
    return unsub;
  }, [user?.uid, width]);

  useEffect(() => {
    const unsub = load();
    return () => unsub && unsub();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const renderItem = ({ item, index }) => {
    const name = item.studentName || item.student?.name || "Unknown";
    const reason = item.reason || "No request reason";
    const studentPhoto = item.photoURL || item.student?.photoURL || null;
    const initial = name?.[0]?.toUpperCase?.() || "?";

    const displayTs = item.updatedAt ?? item.mentorApproval?.at ?? null;

    return (
      <MotiView
        from={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 45, type: "timing", duration: 300 }}
        style={{ width: "100%" }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            navigation.navigate("MentorRequestView", { gatePassId: item.id })
          }
        >
          <View style={[styles.card, { padding: cardPadding }]}>
            {/* Avatar */}
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
                <Text
                  style={[
                    styles.avatarText,
                    { fontSize: Math.max(14, scale(18)) },
                  ]}
                >
                  {initial}
                </Text>
              </View>
            )}

            {/* Details */}
            <View style={styles.content}>
              <Text
                style={[styles.title, { fontSize: titleSize }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {name}
              </Text>

              <Text style={[styles.sub, { fontSize: subSize }]} numberOfLines={2}>
                {reason}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Feather name="clock" size={12} color="#aaa" />
                  <Text style={styles.metaText}>{fmt(displayTs)}</Text>
                </View>

                {item.mentorApproval?.comment ? (
                  <View style={styles.metaChip}>
                    <Feather name="message-square" size={12} color="#aaa" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.mentorApproval.comment}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.badgeContainer}>
                <View
                  style={[
                    styles.badgeRed,
                    {
                      paddingHorizontal: Math.max(10, scale(10)),
                      paddingVertical: 6,
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { fontSize: badgeFont }]}>
                    Rejected by You
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={[styles.headerTitle, { fontSize: Math.max(18, scale(20)) }]}>
            Rejected Requests
          </Text>
        </View>

        <View style={styles.center}>
          <ActivityIndicator color="#aaa" />
          <Text style={{ color: "#888", marginTop: 8 }}>Loading rejected requests…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.headerTitle, { fontSize: Math.max(18, scale(20)) }]}>
          Rejected Requests
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={40} color="#666" />
          <Text style={styles.empty}>No rejected requests yet.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: insets.bottom + 28,
            paddingHorizontal: 16,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 28,
  },
  empty: { color: "#999", fontSize: 15, marginTop: 8 },

  header: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#0b0b0b",
    borderBottomWidth: 1,
    borderColor: "#1f1f1f",
    justifyContent: "flex-end",
  },
  headerTitle: { color: "#fff", fontWeight: "800" },

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
    elevation: 2,
    width: "100%",
  },

  avatar: {
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800" },
  avatarImg: { resizeMode: "cover" },

  content: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    minWidth: 0,
  },

  title: { color: "#fff", fontWeight: "800", flexShrink: 1 },
  sub: { color: "#ccc", marginTop: 6 },

  metaRow: { flexDirection: "row", marginTop: 10, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  metaText: { color: "#aaa", fontSize: 12, fontWeight: "600", marginLeft: 6 },

  badgeContainer: { marginTop: 10 },
  badgeRed: {
    backgroundColor: "#b91c1c",
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
