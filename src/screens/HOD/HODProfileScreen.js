// src/screens/HOD/HODProfileScreen.js
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState, useCallback } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { clearUser } from "../../services/authStorage";
import { useFocusEffect } from "@react-navigation/native";

const auth = getAuth();
const db = getFirestore();

// ⚠️ Replace with your PC’s IP when testing
const BACKEND_URL = "http://172.31.146.176:5000/upload";

export default function HODProfileScreen() {
  const user = auth.currentUser;
  const [udoc, setUdoc] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset edit mode on blur
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
    "H";

  const pickImage = async () => {
    if (!editing) return;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setUdoc((prev) => ({ ...prev, photoURL: uri })); // local preview
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

      // 🔹 If it's a local file → upload to backend
      if (finalPhotoURL && finalPhotoURL.startsWith("file://")) {
        const formData = new FormData();
        formData.append("file", {
          uri: finalPhotoURL,
          type: "image/jpeg",
          name: "hod-profile.jpg",
        });

        // 🔑 Get Firebase ID token
        const token = await auth.currentUser.getIdToken();

        const response = await fetch(BACKEND_URL, {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Send token
          },
        });

        const text = await response.text();
        console.log("📌 Upload response:", text);

        if (!response.ok) throw new Error("Upload failed: " + text);

        const data = JSON.parse(text);
        finalPhotoURL = data.url; // Google Drive public URL
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
    <View style={styles.safe}>
      <LinearGradient
        colors={["#0f1023", "#0b0b0b"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          disabled={!editing}
          onPress={pickImage}
          style={styles.avatarWrapper}
        >
          {udoc?.photoURL ? (
            <Image source={{ uri: udoc.photoURL }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          {editing && (
            <View style={styles.cameraIcon}>
              <Feather name="camera" size={18} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.name}>
          {udoc?.displayName || "Head of Department"}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
      </LinearGradient>

      <View style={styles.card}>
        <Row
          label="Name"
          value={udoc?.displayName}
          editable={editing}
          onChangeText={(val) =>
            setUdoc((prev) => ({ ...prev, displayName: val }))
          }
        />
        <Row
          label="Department"
          value={udoc?.department}
          editable={editing}
          onChangeText={(val) =>
            setUdoc((prev) => ({ ...prev, department: val }))
          }
        />
      </View>

      {editing && (
        <TouchableOpacity style={styles.removeBtn} onPress={removeImage}>
          <Feather name="trash-2" size={16} color="#fff" />
          <Text style={styles.removeText}>Remove Profile Picture</Text>
        </TouchableOpacity>
      )}

      {editing ? (
        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.6 }]}
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
          style={styles.editBtn}
          onPress={() => setEditing(true)}
        >
          <Feather name="edit-3" size={16} color="#fff" />
          <Text style={styles.editText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Feather name="log-out" size={18} color="#fff" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

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
        />
      ) : (
        <Text style={styles.rowValue}>{value || "—"}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },
  header: {
    paddingVertical: 28,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "#4f46e5",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 12,
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%", resizeMode: "cover" },
  avatar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f46e5",
  },
  avatarText: { color: "#fff", fontSize: 36, fontWeight: "900" },
  cameraIcon: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#111827cc",
    borderRadius: 20,
    padding: 6,
  },
  name: { color: "#fff", fontSize: 20, fontWeight: "800" },
  email: { color: "#cfcfcf", marginTop: 4 },
  card: {
    backgroundColor: "#141414",
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#232323",
    padding: 14,
  },
  row: {
    paddingVertical: 10,
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
    marginLeft: 10,
    paddingVertical: 2,
  },
  editBtn: {
    marginHorizontal: 16,
    marginTop: 10,
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
    marginHorizontal: 16,
    marginTop: 10,
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
    marginHorizontal: 16,
    marginTop: 6,
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
    marginHorizontal: 16,
    marginTop: 14,
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
