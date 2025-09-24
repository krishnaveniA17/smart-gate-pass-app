// src/screens/Mentor/MentorProfileScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  TextInput,
  ScrollView,
  useWindowDimensions,
  StatusBar,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { clearUser } from "../../services/authStorage";

const auth = getAuth();
const db = getFirestore();

// Replace with your upload backend if used
const BACKEND_URL = "http://172.31.146.176:5000/upload";

const guidelineBaseWidth = 375;
const scale = (size, width = guidelineBaseWidth) =>
  Math.round((width / guidelineBaseWidth) * size);

export default function MentorProfileScreen() {
  const navigation = useNavigation();
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [udoc, setUdoc] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Responsive tokens
  const AVATAR_SIZE = Math.max(88, Math.min(140, scale(110, width)));
  const AVATAR_BORDER = Math.max(3, Math.round(AVATAR_SIZE * 0.018));
  const TITLE_SIZE = Math.max(18, scale(20, width));
  const SUB_SIZE = Math.max(13, scale(14, width));
  const CONTROL_MARGIN = Math.max(12, scale(16, width));

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
    "M";

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
        setUdoc((prev) => ({ ...prev, photoURL: uri })); // local preview
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
      let finalPhotoURL = udoc?.photoURL || null;

      // Upload local file if exists
      if (finalPhotoURL && finalPhotoURL.startsWith("file://")) {
        const formData = new FormData();
        formData.append("file", {
          uri: finalPhotoURL,
          type: "image/jpeg",
          name: "mentor-profile.jpg",
        });

        const token = await auth.currentUser.getIdToken();
        const response = await fetch(BACKEND_URL, {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const text = await response.text();
        if (!response.ok) throw new Error("Upload failed: " + text);
        const data = JSON.parse(text);
        finalPhotoURL = data.url;
      }

      await updateDoc(doc(db, "users", user.uid), {
        displayName: udoc?.displayName || user.displayName,
        department: udoc?.department || "—",
        photoURL: finalPhotoURL,
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

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <StatusBar barStyle="light-content" translucent={false} />

      {/* Gradient header + centered avatar/title like HOD profile */}
      <LinearGradient
        colors={["#0f1023", "#0b0b0b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 12), paddingBottom: 12 }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={20} color="#eaeaea" />
        </TouchableOpacity>

        <View style={{ alignItems: "center", width: "100%" }}>
          <TouchableOpacity
            disabled={!editing}
            onPress={pickImage}
            activeOpacity={editing ? 0.8 : 1}
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
              <Image source={{ uri: udoc.photoURL }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: "#4f46e5" }]}>
                <Text style={[styles.avatarText, { fontSize: Math.max(24, Math.round(AVATAR_SIZE * 0.32)) }]}>
                  {initial}
                </Text>
              </View>
            )}

            {editing && (
              <View style={[styles.cameraIcon, { right: Math.max(8, AVATAR_BORDER) }]}>
                <Feather name="camera" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.name, { fontSize: TITLE_SIZE, marginTop: 10 }]}>
            {udoc?.displayName || "Mentor"}
          </Text>
          <Text style={[styles.email, { fontSize: SUB_SIZE }]}>{user?.email}</Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 28, 48) }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { marginHorizontal: CONTROL_MARGIN, marginTop: 14 }]}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Name</Text>
            {editing ? (
              <TextInput
                style={styles.rowInput}
                value={udoc?.displayName}
                onChangeText={(val) => setUdoc((prev) => ({ ...prev, displayName: val }))}
                placeholder="Enter name"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.rowValue}>{udoc?.displayName || "—"}</Text>
            )}
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Department</Text>
            {editing ? (
              <TextInput
                style={styles.rowInput}
                value={udoc?.department}
                onChangeText={(val) => setUdoc((prev) => ({ ...prev, department: val }))}
                placeholder="Department"
                placeholderTextColor="#666"
              />
            ) : (
              <Text style={styles.rowValue}>{udoc?.department || "—"}</Text>
            )}
          </View>
        </View>

        {editing && (
          <TouchableOpacity
            style={[styles.removeBtn, { marginHorizontal: CONTROL_MARGIN }]}
            onPress={removeImage}
          >
            <Feather name="trash-2" size={16} color="#fff" />
            <Text style={styles.removeText}>Remove Profile Picture</Text>
          </TouchableOpacity>
        )}

        {/* actions */}
        <View style={{ marginHorizontal: CONTROL_MARGIN, marginTop: 12 }}>
          {editing ? (
            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.7 }]}
              onPress={saveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="save" size={16} color="#fff" />
                  <Text style={styles.saveText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Feather name="edit-3" size={16} color="#fff" />
              <Text style={styles.editText}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.addStudentBtn} onPress={() => navigation.navigate("AddStudent")}>
            <Feather name="user-plus" size={18} color="#fff" />
            <Text style={styles.addStudentText}>Add Student</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Feather name="log-out" size={18} color="#fff" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },

  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
  },

  backBtn: {
    position: "absolute",
    left: 12,
    top: Platform.OS === "android" ? 12 : 12,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#161616",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#262626",
    zIndex: 10,
  },

  avatarWrapper: {
    borderColor: "#4f46e5",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "900" },
  cameraIcon: {
    position: "absolute",
    bottom: 8,
    backgroundColor: "#111827cc",
    borderRadius: 20,
    padding: 6,
  },

  name: { color: "#fff", fontWeight: "800" },
  email: { color: "#cfcfcf" },

  card: {
    backgroundColor: "#141414",
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
  rowLabel: { color: "#a8a8a8", width: 120 },
  rowValue: { color: "#fff", fontWeight: "700" },
  rowInput: {
    flex: 1,
    color: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    marginLeft: 12,
    paddingVertical: Platform.OS === "ios" ? 6 : 2,
  },

  editBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  editText: { color: "#fff", fontWeight: "800" },

  saveBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  saveText: { color: "#fff", fontWeight: "800" },

  addStudentBtn: {
    backgroundColor: "#5b4dfc",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  addStudentText: { color: "#fff", fontWeight: "800" },

  removeBtn: {
    marginTop: 8,
    backgroundColor: "#b91c1c",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  removeText: { color: "#fff", fontWeight: "700" },

  signOutBtn: {
    marginTop: 12,
    backgroundColor: "#7f1d1d",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  signOutText: { color: "#fff", fontWeight: "800" },
});
