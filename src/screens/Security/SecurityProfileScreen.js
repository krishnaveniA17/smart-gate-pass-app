// src/screens/Security/SecurityProfileScreen.js
import React, { useEffect, useState, useCallback } from "react";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  PixelRatio,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { clearUser } from "../../services/authStorage";
import { useFocusEffect } from "@react-navigation/native";

const auth = getAuth();
const db = getFirestore();

/* ---------- responsive helpers ---------- */
// baseline: 375 width (iPhone 8). Adjusts based on screen width; tablets get larger caps.
const guidelineBaseWidth = 375;
function scale(size, width) {
  return Math.round((width / guidelineBaseWidth) * size);
}
function moderateScale(size, width, factor = 0.5) {
  const scaled = scale(size, width);
  return Math.round(size + (scaled - size) * factor);
}
function fontScale(size, width) {
  const s = moderateScale(size, width);
  return Math.round(PixelRatio.roundToNearestPixel(s));
}

export default function SecurityProfileScreen() {
  const user = auth.currentUser;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [udoc, setUdoc] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset edit mode when leaving screen
  useFocusEffect(
    useCallback(() => {
      return () => setEditing(false);
    }, [])
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!user?.uid) return;
        const snap = await getDoc(doc(db, "users", user.uid));
        if (active) setUdoc(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.warn("Profile load error:", e);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const initial =
    user?.displayName?.[0]?.toUpperCase?.() ||
    user?.email?.[0]?.toUpperCase?.() ||
    "S";

  const pickImage = async () => {
    if (!editing) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setUdoc((prev) => ({ ...prev, photoURL: uri }));
      }
    } catch (e) {
      console.warn("Image pick error:", e);
      Alert.alert("Error", "Could not pick image.");
    }
  };

  const removeImage = () => {
    if (!editing) return;
    setUdoc((prev) => ({ ...prev, photoURL: null }));
  };

  const saveProfile = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: udoc?.displayName || user.displayName,
        role: "security",
        photoURL: udoc?.photoURL || null,
      });
      Alert.alert("Profile Updated", "Your changes have been saved.");
      setEditing(false);
    } catch (e) {
      console.warn("Profile update error:", e);
      Alert.alert("Error", "Could not update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      await clearUser();
    } catch (e) {
      Alert.alert("Error", "Could not sign out. Try again.");
    }
  };

  // responsive tokens
  const isTablet = width >= 768;
  const AVATAR_SIZE = Math.round(Math.max(96, Math.min(isTablet ? 220 : 140, scale(110, width))));
  const AVATAR_BORDER = Math.max(2, Math.round(AVATAR_SIZE * 0.03));
  const HEADER_EXTRA_TOP = Math.round(insets.top + (isTablet ? 32 : 28));
  const TITLE_SIZE = fontScale(22, width);
  const SUB_SIZE = fontScale(14, width);
  const CONTROL_PADDING = Math.max(12, scale(16, width));
  const BUTTON_PADDING = Math.max(12, moderateScale(14, width));
  const ICON_SIZE = Math.max(16, fontScale(16, width));
  const HEADER_MIN_HEIGHT = Math.round(AVATAR_SIZE + 120);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b0b" />
      <LinearGradient
        colors={["#0f1023", "#0b0b0b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: HEADER_EXTRA_TOP, paddingBottom: CONTROL_PADDING, minHeight: HEADER_MIN_HEIGHT }]}
      >
        <TouchableOpacity
          disabled={!editing}
          onPress={pickImage}
          activeOpacity={editing ? 0.85 : 1}
          style={[
            styles.avatarWrapper,
            {
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2,
              borderWidth: AVATAR_BORDER,
            },
          ]}
        >
          {udoc?.photoURL ? (
            <Image
              source={{ uri: udoc.photoURL }}
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
            />
          ) : (
            <View style={[styles.avatar, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}>
              <Text style={[styles.avatarText, { fontSize: fontScale(36, width) }]}>{initial}</Text>
            </View>
          )}

          {editing && (
            <View style={[styles.cameraIcon, { padding: Math.round(AVATAR_SIZE * 0.04) }]}>
              <Feather name="camera" size={Math.round(ICON_SIZE)} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={[styles.name, { fontSize: TITLE_SIZE, marginTop: isTablet ? 12 : 8 }]} numberOfLines={1} ellipsizeMode="tail">
          {udoc?.displayName || "Security Guard"}
        </Text>
        <Text style={[styles.email, { fontSize: SUB_SIZE }]} numberOfLines={1} ellipsizeMode="middle">
          {user?.email}
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 28, 40) }}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { marginHorizontal: CONTROL_PADDING, padding: Math.max(12, moderateScale(14, width)), borderRadius: isTablet ? 18 : 14 }]}>
            <Row
              label="Name"
              value={udoc?.displayName}
              editable={editing}
              onChangeText={(val) => setUdoc((prev) => ({ ...prev, displayName: val }))}
              width={width}
            />
          </View>

          {editing && (
            <TouchableOpacity
              style={[
                styles.removeBtn,
                {
                  marginHorizontal: CONTROL_PADDING,
                  marginTop: 12,
                  paddingVertical: BUTTON_PADDING,
                  borderRadius: isTablet ? 12 : 10,
                  minHeight: isTablet ? 50 : 44,
                },
              ]}
              onPress={removeImage}
            >
              <Feather name="trash-2" size={ICON_SIZE} color="#fff" />
              <Text style={[styles.removeText, { fontSize: fontScale(14, width), marginLeft: 10 }]}>Remove Profile Picture</Text>
            </TouchableOpacity>
          )}

          {editing ? (
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  marginHorizontal: CONTROL_PADDING,
                  marginTop: 12,
                  paddingVertical: BUTTON_PADDING,
                  borderRadius: isTablet ? 12 : 10,
                },
                loading && { opacity: 0.7 },
              ]}
              onPress={saveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="save" size={ICON_SIZE} color="#fff" />
                  <Text style={[styles.saveText, { fontSize: fontScale(15, width), marginLeft: 10 }]}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.editBtn,
                { marginHorizontal: CONTROL_PADDING, marginTop: 12, paddingVertical: BUTTON_PADDING, borderRadius: isTablet ? 12 : 10 },
              ]}
              onPress={() => setEditing(true)}
            >
              <Feather name="edit-3" size={ICON_SIZE} color="#fff" />
              <Text style={[styles.editText, { fontSize: fontScale(15, width), marginLeft: 10 }]}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.signOutBtn,
              { marginHorizontal: CONTROL_PADDING, marginTop: 12, paddingVertical: BUTTON_PADDING, borderRadius: isTablet ? 12 : 10 },
            ]}
            onPress={handleSignOut}
          >
            <Feather name="log-out" size={Math.max(18, ICON_SIZE)} color="#fff" />
            <Text style={[styles.signOutText, { fontSize: fontScale(15, width), marginLeft: 10 }]}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------- Row ---------------- */
function Row({ label, value, editable, onChangeText, width = 375 }) {
  const labelWidth = Math.min(140, Math.round(width * 0.32));
  const inputFont = fontScale(14, width);
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { fontSize: inputFont, width: labelWidth }]}>{label}</Text>
      {editable ? (
        <TextInput
          style={[styles.rowInput, { fontSize: inputFont }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={`Enter ${label}`}
          placeholderTextColor="#666"
          autoCapitalize="words"
        />
      ) : (
        <Text style={[styles.rowValue, { fontSize: inputFont }]} numberOfLines={1} ellipsizeMode="tail">
          {value || "—"}
        </Text>
      )}
    </View>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },

  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
  },

  avatarWrapper: {
    borderColor: "#4f46e5",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 6,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f46e5",
  },
  avatarText: { color: "#fff", fontWeight: "900" },
  avatarImg: { width: "100%", height: "100%", resizeMode: "cover" },

  cameraIcon: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#111827cc",
    borderRadius: 20,
  },

  name: { color: "#fff", fontWeight: "800" },
  email: { color: "#cfcfcf", marginTop: 4 },

  card: {
    backgroundColor: "#141414",
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#232323",
    padding: 14,
  },

  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: { color: "#a8a8a8" },
  rowValue: { color: "#fff", fontWeight: "700" },
  rowInput: {
    flex: 1,
    color: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    marginLeft: 12,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
  },

  editBtn: {
    backgroundColor: "#2563eb",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  editText: { color: "#fff", fontWeight: "800" },

  saveBtn: {
    backgroundColor: "#16a34a",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  saveText: { color: "#fff", fontWeight: "800" },

  removeBtn: {
    backgroundColor: "#b91c1c",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  removeText: { color: "#fff", fontWeight: "700" },

  signOutBtn: {
    backgroundColor: "#7f1d1d",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  signOutText: { color: "#fff", fontWeight: "800" },
});
