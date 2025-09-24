// src/screens/Mentor/MentorForwardedListScreen.js
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const db = getFirestore();
const auth = getAuth();

const fmt = (ts) => (ts?.toDate?.() ? ts.toDate().toLocaleString() : ts ?? "-");

// statuses we care about showing here so we can reflect HOD's decision immediately
// keep it minimal: pending_hod and HOD-level outcomes. We'll additionally filter out mentor rejections.
const VISIBLE_STATUSES = ["pending_hod", "approved", "rejected"];

export default function MentorForwardedListScreen() {
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
      // Try to use server-side 'in' filter (faster); fallback will filter client-side.
      q = query(
        collection(db, "gate_passes"),
        where("mentorUid", "==", user.uid),
        where("status", "in", VISIBLE_STATUSES),
        orderBy("updatedAt", "desc")
      );
    } catch (err) {
      // fallback: query by mentorUid only and filter on the client
      q = query(collection(db, "gate_passes"), where("mentorUid", "==", user.uid));
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));

        // Determine whether the server-side filters/order were actually applied.
        const usedServerFilter = (() => {
          try {
            return !!(q._queryOptions?.where || (snap.query && snap.query._queryOptions && snap.query._queryOptions.where));
          } catch (e) {
            return false;
          }
        })();

        let filtered = arr;

        if (!usedServerFilter) {
          // client-side filter:
          filtered = arr.filter((it) => {
            const status = (it.status || "").toString().toLowerCase();

            // Exclude mentor-level rejections (these should appear in Mentor Rejected tab)
            // Mentor rejection is stored either as mentorApproval.decision === 'rejected' OR status === 'rejected_mentor'
            const mentorRejected =
              (it.mentorApproval?.decision || "").toString().toLowerCase() === "rejected" ||
              status === "rejected_mentor";

            if (mentorRejected) return false;

            // Include if the status is one of visible statuses, or legacy forwarded flag is set
            const forwardedFlag = !!it.forwardedToHOD || status === "forwarded";

            return VISIBLE_STATUSES.includes(status) || forwardedFlag;
          });
        } else {
          // Server already filtered by status in ["pending_hod", "approved", "rejected"]
          // but some of those 'rejected' docs might be mentor-level rejections (status set differently).
          // Ensure we still remove mentor-level rejections here as a safety net.
          filtered = arr.filter((it) => {
            const status = (it.status || "").toString().toLowerCase();
            const mentorRejected =
              (it.mentorApproval?.decision || "").toString().toLowerCase() === "rejected" ||
              status === "rejected_mentor";
            return !mentorRejected;
          });
        }

        // client-side sort fallback if orderBy wasn't applied
        const usedServerOrder = (() => {
          try {
            return !!(q._queryOptions?.orderBy || (snap.query && snap.query._queryOptions && snap.query._queryOptions.orderBy));
          } catch (e) {
            return false;
          }
        })();

        if (!usedServerOrder) {
          filtered.sort((a, b) => {
            const aTime = a.updatedAt?.seconds || a.updatedAt || 0;
            const bTime = b.updatedAt?.seconds || b.updatedAt || 0;
            return bTime - aTime;
          });
        }

        setItems(filtered);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.warn("Mentor forwarded list error:", err);
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
    setTimeout(() => setRefreshing(false), 500);
  };

  const renderItem = ({ item, index }) => {
    const studentName = item.studentName || item.student?.name || "Unknown";
    const reason = item.reason || "No request reason";
    const photoURL = item.photoURL || item.student?.photoURL || null;
    const initial = studentName?.[0]?.toUpperCase?.() || "?";

    // determine HOD decision using hodApproval if present
    const hodDecision = (item.hodApproval?.decision || "").toString().toLowerCase();
    const status = (item.status || "").toString().toLowerCase();

    // badge defaults to forwarded; prefer HOD decision if present
    let badgeStyle = styles.badgeYellow;
    let badgeLabel = "Forwarded to HOD";
    let badgeTextStyle = styles.badgeTextBlack;

    // If hodApproval exists and has decision, use it
    if (hodDecision === "approved" || status === "approved") {
      badgeStyle = styles.badgeGreen;
      badgeLabel = "Approved by HOD";
      badgeTextStyle = styles.badgeTextWhite;
    } else if (hodDecision === "rejected" || status === "rejected") {
      // Only treat as HOD rejection if hodApproval indicates rejected (not mentor)
      // We already filtered out mentor-level rejections in load(), so this indicates HOD rejected.
      badgeStyle = styles.badgeRed;
      badgeLabel = "Rejected by HOD";
      badgeTextStyle = styles.badgeTextWhite;
    } else if (status === "pending_hod" || status === "forwarded" || !!item.forwardedToHOD) {
      badgeStyle = styles.badgeYellow;
      badgeLabel = "Forwarded to HOD";
      badgeTextStyle = styles.badgeTextBlack;
    } else {
      // fallback — keep forwarded label
      badgeStyle = styles.badgeYellow;
      badgeLabel = "Forwarded to HOD";
      badgeTextStyle = styles.badgeTextBlack;
    }

    return (
      <MotiView
        key={item.id}
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 45, type: "timing", duration: 260 }}
        style={{ width: "100%" }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate("MentorRequestView", { gatePassId: item.id })}
        >
          <View style={[styles.card, { padding: cardPadding }]}>
            {/* Avatar */}
            {photoURL ? (
              <Image
                source={{ uri: photoURL }}
                style={[
                  styles.avatarImg,
                  { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                ]}
              />
            ) : (
              <View
                style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
              >
                <Text style={[styles.avatarText, { fontSize: Math.max(14, scale(18)) }]}>{initial}</Text>
              </View>
            )}

            {/* Content */}
            <View style={styles.content}>
              <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1} ellipsizeMode="tail">
                {studentName}
              </Text>

              <Text style={[styles.sub, { fontSize: subSize }]} numberOfLines={2}>
                {reason}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Feather name="clock" size={12} color="#aaa" />
                  <Text style={styles.metaText}>{fmt(item.mentorApproval?.at)}</Text>
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
                <View style={[badgeStyle, { paddingHorizontal: Math.max(10, scale(10)), paddingVertical: 6 }]}>
                  <Text style={[badgeTextStyle, { fontSize: badgeFont }]}>{badgeLabel}</Text>
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
      <SafeAreaView edges={["top", "bottom"]} style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.headerTitle}>Forwarded Requests</Text>
        </View>

        <View style={styles.center}>
          <ActivityIndicator color="#aaa" />
          <Text style={{ color: "#888", marginTop: 8 }}>Loading forwarded requests…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Forwarded Requests</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={40} color="#666" />
          <Text style={styles.empty}>No forwarded requests yet.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 28, paddingHorizontal: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 28 },
  empty: { color: "#999", fontSize: 15, marginTop: 8 },

  header: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#0b0b0b",
    borderBottomWidth: 1,
    borderColor: "#1f1f1f",
    justifyContent: "flex-end",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },

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

  // Avatar styles
  avatar: { backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800" },
  avatarImg: { resizeMode: "cover" },

  // Content column: name, reason, meta, comment, badge
  content: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    minWidth: 0,
  },

  // Single-line name
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

  // Badge styles
  badgeContainer: { marginTop: 10 },
  badgeYellow: {
    backgroundColor: "#ffb84d",
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeGreen: {
    backgroundColor: "#16a34a",
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeRed: {
    backgroundColor: "#b91c1c",
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  badgeTextBlack: { color: "#000", fontWeight: "700", fontSize: 12 },
  badgeTextWhite: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
