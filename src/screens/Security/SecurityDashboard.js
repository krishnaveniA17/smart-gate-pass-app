// src/screens/Security/SecurityDashboard.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TextInput,
  Image,
  Platform,
  StatusBar,
  useWindowDimensions,
  PixelRatio,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { collection, getFirestore, onSnapshot, orderBy, query } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const db = getFirestore();

// Formatter safe for Hermes
const fmt = (ts) => {
  if (!ts?.toDate) return "-";
  return ts.toDate().toLocaleString("en-IN");
};

/* ---------- Responsive helpers ---------- */
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

function useResponsive() {
  const { width, height } = useWindowDimensions();

  const scale = (size) => Math.round((width / guidelineBaseWidth) * size);
  const verticalScale = (size) => Math.round((height / guidelineBaseHeight) * size);
  const moderateScale = (size, factor = 0.5) => Math.round(size + (scale(size) - size) * factor);

  const fontScale = (size) => {
    const newSize = moderateScale(size);
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  };

  return { width, height, scale, verticalScale, moderateScale, fontScale };
}

/* ---------------- SecurityDashboard ---------------- */
function SecurityDashboardScreen() {
  const auth = getAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { scale, fontScale, moderateScale } = useResponsive();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scans, setScans] = useState([]);
  const [search, setSearch] = useState("");

  const fetchProfile = useCallback(() => {
    // reserved for future profile fetches
    const user = auth.currentUser;
    if (user) {
      // no-op for now
    }
  }, [auth]);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.refresh) {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 500);
      }
      fetchProfile();
    }, [fetchProfile, route.params])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    const q = query(collection(db, "scan_history"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setScans(arr);
      setLoading(false);
      setRefreshing(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return scans;
    const s = search.toLowerCase();
    return scans.filter((it) => {
      return (
        (it.studentName || "").toLowerCase().includes(s) ||
        (it.usn || "").toLowerCase().includes(s) ||
        (it.status || "").toLowerCase().includes(s)
      );
    });
  }, [scans, search]);

  const renderItem = useCallback(
    ({ item, index }) => <ScanCard item={item} index={index} responsive={{ scale, fontScale, moderateScale }} />,
    [scale, fontScale, moderateScale]
  );

  // top inset for SafeArea (status bar / notch)
  const topInset = insets.top || (Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0);

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: topInset }]}>
      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: moderateScale(96), paddingTop: moderateScale(6) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={<Header search={search} setSearch={setSearch} responsive={{ scale, fontScale, moderateScale }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={[styles.center, { marginTop: moderateScale(28) }]}>
              <Text style={{ color: "#9a9a9a", fontSize: fontScale(14) }}>No scans yet.</Text>
            </View>
          ) : null
        }
        // small separator so items always have minimum spacing on some platforms
        ItemSeparatorComponent={() => <View style={{ height: moderateScale(10) }} />}
      />

      {loading && (
        <View style={[styles.center, { paddingTop: moderateScale(24) }]}>
          <ActivityIndicator />
          <Text style={{ color: "#bdbdbd", marginTop: moderateScale(8), fontSize: fontScale(13) }}>Loading scans…</Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.fab,
          {
            right: scale(16),
            bottom: scale(20),
            paddingVertical: scale(12),
            paddingHorizontal: scale(14),
            borderRadius: scale(16),
          },
        ]}
        onPress={() => navigation.navigate("SecurityScanner")}
      >
        <Feather name="camera" size={fontScale(16)} color="#fff" />
        <Text style={[styles.fabText, { fontSize: fontScale(14) }]}>Start Scanning</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ---------------- ScanCard ---------------- */
const ScanCard = React.memo(({ item, index, responsive }) => {
  const { scale, fontScale, moderateScale } = responsive;
  let badgeColor = "#facc15";
  let badgeLabel = item.status || "Pending";

  if (item.status === "approved") {
    badgeColor = "#16a34a";
    badgeLabel = "Verified";
  } else if (item.status === "expired") {
    badgeColor = "#9ca3af";
    badgeLabel = "Expired";
  } else if (item.status === "rejected") {
    badgeColor = "#dc2626";
    badgeLabel = "Rejected";
  }

  const studentName = item.studentName || "Unknown";
  const initial = studentName?.[0]?.toUpperCase?.() || "?";
  const avatarSize = scale(44);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 14, scale: 0.98 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 50, 300), type: "timing", duration: 300 }}
      // added vertical spacing to avoid overlap
      style={{ marginHorizontal: scale(16), marginBottom: moderateScale(14) }}
    >
      <View style={[styles.card, { padding: moderateScale(14), borderRadius: moderateScale(18) }]}>
        {item.photoURL ? (
          <Image
            source={{ uri: item.photoURL }}
            style={[styles.avatarImg, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
          />
        ) : (
          <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
            <Text style={[styles.avatarText, { fontSize: fontScale(16) }]}>{initial}</Text>
          </View>
        )}

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.cardTitle, { fontSize: fontScale(16) }]} numberOfLines={1} ellipsizeMode="tail">
            {studentName}
          </Text>
          <Text style={[styles.usnText, { fontSize: fontScale(13) }]} numberOfLines={1} ellipsizeMode="middle">
            USN: {item.usn || "-"}
          </Text>
          <View style={[styles.metaRow, { marginTop: moderateScale(6) }]}>
            <Meta icon="clock" value={fmt(item.createdAt)} responsive={{ fontScale }} />
          </View>
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: badgeColor,
              paddingVertical: moderateScale(6),
              paddingHorizontal: moderateScale(10),
              alignSelf: "flex-start",
              marginLeft: moderateScale(8),
            },
          ]}
        >
          <Text style={[styles.badgeText, { fontSize: fontScale(11) }]}>{badgeLabel}</Text>
        </View>
      </View>
    </MotiView>
  );
});

/* ---------------- Header + Meta ---------------- */
function Header({ search, setSearch, responsive }) {
  const { scale, fontScale, moderateScale } = responsive || useResponsive();

  return (
    <LinearGradient
      colors={["#0f1023", "#0b0b0b"]}
      style={[styles.headerGrad, { paddingHorizontal: scale(16), paddingTop: moderateScale(10), paddingBottom: moderateScale(14) }]}
    >
      <View style={styles.headerTopRow}>
        <Text style={[styles.headerTitle, { fontSize: fontScale(24) }]}>Scanned Passes</Text>
      </View>

      <View style={[styles.searchWrap, { marginTop: moderateScale(12), borderRadius: moderateScale(12), paddingVertical: moderateScale(2) }]}>
        <Feather name="search" size={fontScale(16)} color="#8a8a8a" style={{ marginHorizontal: scale(10) }} />
        <TextInput
          placeholder="Search by student, usn, status…"
          placeholderTextColor="#8a8a8a"
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { fontSize: fontScale(14), paddingVertical: moderateScale(10) }]}
        />
      </View>
    </LinearGradient>
  );
}

function Meta({ icon, value, responsive }) {
  const { fontScale } = responsive || useResponsive();
  return (
    <View style={[styles.metaChip, { paddingVertical: Math.round(fontScale(4)), paddingHorizontal: Math.round(fontScale(8)) }]}>
      <Feather name={icon} size={fontScale(12)} color="#a8a8a8" />
      <Text style={[styles.metaValue, { fontSize: fontScale(12) }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/* ---------------- Styles ---------------- */
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
  searchWrap: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: { flex: 1, color: "#fff", paddingRight: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
    backgroundColor: "#151515",
    // prevent collapse during animation and avoid overflow
    minHeight: 78,
    overflow: "hidden",
  },
  avatar: {
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontWeight: "800" },
  avatarImg: {
    resizeMode: "cover",
    marginRight: 12,
  },
  cardTitle: { color: "#fff", fontWeight: "800" },
  usnText: { color: "#cfcfcf", marginTop: 2 },
  metaRow: { flexDirection: "row" },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 999,
    marginRight: 8,
  },
  metaValue: { color: "#eaeaea", fontWeight: "600" },
  badge: {
    borderRadius: 999,
  },
  badgeText: { color: "#000", fontWeight: "800" },
  fab: {
    position: "absolute",
    backgroundColor: "#1f6feb",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: { color: "#fff", fontWeight: "800" },
});

export { SecurityDashboardScreen };
export default SecurityDashboardScreen;
