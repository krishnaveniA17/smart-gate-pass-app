// src/screens/AddStudentScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const db = getFirestore();
const auth = getAuth();

// scale helper (baseline 375px width)
const guidelineBaseWidth = 375;
const scale = (size, width) => Math.round((width / guidelineBaseWidth) * size);

export default function AddStudentScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roll, setRoll] = useState("");
  const [dept, setDept] = useState("");
  const [phone, setPhone] = useState("");

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const addStudent = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert("Missing Fields", "Name and Email are required.");
      return;
    }
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "users"), {
        uid: null, // student will fill this when they log in
        email,
        displayName: name,
        role: "student",
        department: dept || "—",
        rollNumber: roll || "—",
        phone: phone || "—",
        createdBy: user?.uid || null,
        createdAt: serverTimestamp(),
      });
      Alert.alert("✅ Success", "Student added successfully.");
      navigation.goBack();
    } catch (err) {
      console.error("Error adding student:", err);
      Alert.alert("Error", "Could not add student.");
    }
  };

  return (
    <ScrollView
      style={[styles.safe]}
      contentContainerStyle={{
        padding: Math.max(16, scale(20, width)),
        paddingBottom: insets.bottom + 24,
      }}
    >
      <Text style={[styles.header, { fontSize: Math.max(20, scale(22, width)) }]}>
        Add New Student
      </Text>

      <TextInput
        style={[styles.input, { fontSize: Math.max(14, scale(15, width)) }]}
        placeholder="Full Name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, { fontSize: Math.max(14, scale(15, width)) }]}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, { fontSize: Math.max(14, scale(15, width)) }]}
        placeholder="Roll Number"
        placeholderTextColor="#888"
        value={roll}
        onChangeText={setRoll}
      />
      <TextInput
        style={[styles.input, { fontSize: Math.max(14, scale(15, width)) }]}
        placeholder="Department"
        placeholderTextColor="#888"
        value={dept}
        onChangeText={setDept}
      />
      <TextInput
        style={[styles.input, { fontSize: Math.max(14, scale(15, width)) }]}
        placeholder="Phone Number"
        placeholderTextColor="#888"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <TouchableOpacity style={styles.btn} onPress={addStudent} activeOpacity={0.85}>
        <Feather name="user-plus" size={scale(18, width)} color="#fff" />
        <Text style={[styles.btnText, { fontSize: Math.max(14, scale(15, width)) }]}>
          Add Student
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "#555", marginTop: 12 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
      >
        <Feather name="x-circle" size={scale(18, width)} color="#fff" />
        <Text style={[styles.btnText, { fontSize: Math.max(14, scale(15, width)) }]}>
          Cancel
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b0b0b" },
  header: {
    color: "#fff",
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1c1c1c",
    color: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  btn: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 6,
  },
  btnText: { color: "#fff", fontWeight: "800" },
});
