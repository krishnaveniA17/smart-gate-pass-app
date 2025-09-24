// src/screens/Student/StudentProfileScreen.js
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
} from "react-native";
import { clearUser } from "../../services/authStorage";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const auth = getAuth();
const db = getFirestore();

// ⚠️ Change this to your PC's IP when testing on a real device
const BACKEND_URL = "http://172.31.146.176:5000/upload";

/* ---------- scale helper (375 baseline) ---------- */
const guidelineBaseWidth = 375;
const scale = (size, width = guidelineBaseWidth) =>
  Math.round((width / guidelineBaseWidth) * size);

export default function StudentProfileScreen() {
  const user = auth.currentUser;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [udoc, setUdoc] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Responsive tokens (similar approach used in HODProfileScreen)
  const AVATAR_SIZE = Math.max(88, Math.min(128, scale(110, width)));
  const AVATAR_BORDER = Math.max(3, Math.round(AVATAR_SIZE * 0.018));
  const TITLE_SIZE = Math.max(18, scale(20, width));
  const SUB_SIZE = Math.max(13, scale(14, width));
  const CONTROL_PADDING = Math.max(12, scale(16, width));

  // Reset edit mode when leaving the screen
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
        setUdoc((prev) => ({ ...prev, photoURL: uri })); // local preview before upload
      }
    } catch (e) {
      console.warn("Image picker error:", e);
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

      // If local file (file://), upload to backend → Drive
      if (finalPhotoURL && finalPhotoURL.startsWith("file://")) {
        const formData = new FormData();
        formData.append("file", {
          uri: finalPhotoURL,
          type: "image/jpeg",
          name: "profile.jpg",
        });

        // Get Firebase ID token for secure upload
        const token = await getAuth().currentUser.getIdToken();

        const response = await fetch(BACKEND_URL, {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const txt = await response.text().catch(() => "");
          throw new Error("Upload failed " + txt);
        }

        const data = await response.json();
        finalPhotoURL = data.url; // Google Drive public URL
      }

      await updateDoc(doc(db, "users", user.uid), {
        displayName: udoc?.displayName || user.displayName,
        department: udoc?.department || "—",
        year: udoc?.year || "—",
        section: udoc?.section || "—",
        usn: udoc?.usn || "",
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
      <LinearGradient
        colors={["#0f1023", "#0b0b0b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 12), paddingBottom: CONTROL_PADDING },
        ]}
      >
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
            <Image source={{ uri: udoc.photoURL }} style={[styles.avatarImg]} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: "#4f46e5" }]}>
              <Text style={[styles.avatarText, { fontSize: Math.max(24, scale(36, width)) }]}>
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

        <Text style={[styles.name, { fontSize: TITLE_SIZE, marginTop: 8 }]}>
          {udoc?.displayName || "Student"}
        </Text>
        <Text style={[styles.email, { fontSize: SUB_SIZE, marginTop: 6 }]}>{user?.email}</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 28, 40),
        }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { marginHorizontal: CONTROL_PADDING }]}>
          <Row
            label="Name"
            editable={editing}
            value={udoc?.displayName}
            onChangeText={(val) => setUdoc((prev) => ({ ...prev, displayName: val }))}
          />
          <Row
            label="USN"
            editable={editing}
            value={udoc?.usn}
            onChangeText={(val) => setUdoc((prev) => ({ ...prev, usn: val }))}
          />
          <Row
            label="Department"
            editable={editing}
            value={udoc?.department}
            onChangeText={(val) => setUdoc((prev) => ({ ...prev, department: val }))}
          />
          <Row
            label="Year"
            editable={editing}
            value={udoc?.year}
            onChangeText={(val) => setUdoc((prev) => ({ ...prev, year: val }))}
          />
          <Row
            label="Section"
            editable={editing}
            value={udoc?.section}
            onChangeText={(val) => setUdoc((prev) => ({ ...prev, section: val }))}
          />
        </View>

        {editing && (
          <TouchableOpacity
            style={[styles.removeBtn, { marginHorizontal: CONTROL_PADDING, marginTop: 12 }]}
            onPress={removeImage}
          >
            <Feather name="trash-2" size={16} color="#fff" />
            <Text style={styles.removeText}>Remove Profile Picture</Text>
          </TouchableOpacity>
        )}

        {editing ? (
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { marginHorizontal: CONTROL_PADDING, marginTop: 12 },
              loading && { opacity: 0.7 },
            ]}
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
          <TouchableOpacity
            style={[styles.editBtn, { marginHorizontal: CONTROL_PADDING, marginTop: 12 }]}
            onPress={() => setEditing(true)}
          >
            <Feather name="edit-3" size={16} color="#fff" />
            <Text style={styles.editText}>Edit Profile</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.signOutBtn, { marginHorizontal: CONTROL_PADDING, marginTop: 12 }]}
          onPress={handleSignOut}
        >
          <Feather name="log-out" size={18} color="#fff" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Row component ---------- */
function Row({ label, value, editable, onChangeText }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {editable ? (
        <TextInput
          style={styles.rowInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={`Enter ${label}`}
          placeholderTextColor="#666"
          keyboardType={label === "USN" ? "default" : "default"}
          autoCapitalize="words"
        />
      ) : (
        <Text style={styles.rowValue}>{value || "—"}</Text>
      )}
    </View>
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

  removeBtn: {
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
