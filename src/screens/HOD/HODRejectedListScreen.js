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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  getFirestore,
} from "firebase/firestore";
import { MotiView } from "moti";
import { Feather } from "@expo/vector-icons";

const db = getFirestore();

const fmt = (ts) =>
  ts?.toDate?.() ? ts.toDate().toLocaleString() : ts ?? "-";

export default function HODRejectedListScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    const q = query(
      collection(db, "gate_passes"),
      where("status", "==", "rejected"),
      orderBy("updatedAt", "desc")
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
        console.warn("HOD rejected list error:", err);
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

  const renderItem = ({ item, index }) => {
    const studentName = item.studentName || item.student?.name || "Unknown";
    const reason = item.reason || "No request reason";
    const hodNote = item.hodApproval?.comment || "No comment";

    const photoURL = item.photoURL || item.student?.photoURL || null;
    const initial = studentName?.[0]?.toUpperCase?.() || "?";

    return (
      <MotiView
        from={{ opacity: 0, translateY: 15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 60, damping: 15 }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            navigation.navigate("HODRequestView", { gatePassId: item.id })
          }
          style={{ marginHorizontal: 16 }}
        >
          <View style={styles.card}>
            {/* Avatar */}
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}

            {/* Details */}
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{studentName}</Text>
              <Text style={styles.sub} numberOfLines={2}>
                {reason}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Feather name="clock" size={12} color="#aaa" />
                  <Text style={styles.metaText}>
                    {fmt(item.hodApproval?.at)}
                  </Text>
                </View>
                <View style={styles.metaChip}>
                  <Feather name="message-square" size={12} color="#aaa" />
                  <Text style={styles.metaText}>Note: {hodNote}</Text>
                </View>
              </View>
            </View>

            {/* Badge */}
            <View style={styles.badgeRed}>
              <Feather name="x-circle" size={12} color="#fff" />
              <Text style={styles.badgeText}>Rejected</Text>
            </View>
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#aaa" />
        <Text style={{ color: "#888", marginTop: 8 }}>
          Loading rejected requests…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rejected Requests</Text>
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
          contentContainerStyle={{ paddingBottom: 80, paddingTop: 8, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  empty: { color: "#999", fontSize: 15, marginTop: 8 },

  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#0b0b0b",
    borderBottomWidth: 1,
    borderColor: "#1f1f1f",
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },

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

  title: { color: "#fff", fontSize: 17, fontWeight: "800" },
  sub: { color: "#ccc", marginTop: 4, fontSize: 13 },

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
  metaText: { color: "#aaa", fontSize: 12, fontWeight: "600" },

  badgeRed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#b91c1c", // ✅ your original red
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
