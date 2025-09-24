// src/screens/Auth/LoginScreen.js
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { saveUser } from "../../services/authStorage";
import { auth, db } from "../../services/firebaseConfig";

import logo from "../../assets/logo.png";

/* ---------- scaling helper (375 baseline) ---------- */
const guidelineBaseWidth = 375;
const scale = (size, width = guidelineBaseWidth) =>
  Math.round((width / guidelineBaseWidth) * size);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // responsive tokens
  const H_PAD = Math.max(12, scale(18, width));
  const CONTAINER_MAX_WIDTH = Math.min(640, Math.round(width * 0.94));
  const LOGO_SIZE = Math.max(64, Math.round(scale(88, width)));
  const BRAND_SIZE = Math.max(16, scale(18, width));
  const BOX_PADDING = Math.max(16, scale(20, width));
  const TITLE_SIZE = Math.max(18, scale(20, width));
  const INPUT_FONT = Math.max(14, scale(15, width));
  const INPUT_PADDING = Math.max(10, scale(12, width));
  const SHOW_BTN_PAD = Math.max(8, scale(10, width));
  const CTA_PAD_VERT = Math.max(12, scale(14, width));
  const CTA_FONT = Math.max(15, scale(16, width));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  const validEmail = EMAIL_REGEX.test(email.trim());
  const canSubmit = validEmail && password.trim().length >= 6 && !loading;

  const mapFirebaseError = (code, fallback) => {
    switch (code) {
      case "auth/user-not-found":
        return "No account found for this email.";
      case "auth/wrong-password":
        return "Incorrect password. Try again.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a minute and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your internet connection.";
      default:
        return fallback || "Something went wrong. Please try again.";
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!validEmail) {
      Alert.alert("Validation Error", "Enter a valid email address.");
      return;
    }
    if (trimmedPassword.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );
      const user = userCredential.user;

      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) {
        Alert.alert("Login Error", "No user data found in Firestore.");
        return;
      }

      const data = snap.data();
      const role = data?.role || "student";

      await saveUser({ uid: user.uid, email: user.email, role });
      Alert.alert("Login Success", `Welcome ${user.email}`);
    } catch (err) {
      const message = mapFirebaseError(err?.code, err?.message);
      Alert.alert("Login Error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert("Invalid Email", "Please enter your registered email first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        "Password Reset",
        `We’ve sent a reset link to ${trimmedEmail}. Check your inbox.`
      );
    } catch (err) {
      Alert.alert("Error", mapFirebaseError(err?.code, err?.message));
    }
  };

  return (
    <View style={[styles.appBg, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.root, { paddingHorizontal: H_PAD }]}>
            <View style={[styles.card, { maxWidth: CONTAINER_MAX_WIDTH, padding: BOX_PADDING }]}>
              <View style={styles.headerRow}>
                <Image source={logo} style={{ width: LOGO_SIZE, height: LOGO_SIZE }} resizeMode="contain" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.brand, { fontSize: BRAND_SIZE }]}>@eGatePro</Text>
                  <Text style={[styles.title, { fontSize: TITLE_SIZE }]}>Smart Gate Pass</Text>
                </View>
              </View>

              <TextInput
                placeholder="Email"
                placeholderTextColor="#6b7280"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                style={[
                  styles.input,
                  {
                    padding: INPUT_PADDING,
                    fontSize: INPUT_FONT,
                    borderColor:
                      email.length === 0 ? "#e5e7eb" : validEmail ? "#84cc16" : "#ef4444",
                  },
                ]}
                textContentType="username"
              />

              <View style={[styles.passwordRow, { marginTop: scale(8, width) }]}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#6b7280"
                  secureTextEntry={secure}
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="go"
                  onSubmitEditing={canSubmit ? handleLogin : undefined}
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      marginBottom: 0,
                      padding: INPUT_PADDING,
                      fontSize: INPUT_FONT,
                    },
                  ]}
                  textContentType="password"
                />
                <TouchableOpacity
                  onPress={() => setSecure((s) => !s)}
                  style={[
                    styles.showBtn,
                    {
                      paddingHorizontal: SHOW_BTN_PAD,
                      paddingVertical: Math.max(8, scale(10, width)),
                      borderColor: "#e5e7eb",
                    },
                  ]}
                  accessibilityLabel={secure ? "Show password" : "Hide password"}
                >
                  <Text style={[styles.showText, { fontSize: Math.max(13, scale(13, width)) }]}>
                    {secure ? "Show" : "Hide"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: scale(12, width) }} />

              {loading ? (
                <ActivityIndicator size="large" color="#0ea5a0" />
              ) : (
                <TouchableOpacity
                  onPress={handleLogin}
                  activeOpacity={0.9}
                  disabled={!canSubmit}
                  style={[
                    styles.cta,
                    {
                      paddingVertical: CTA_PAD_VERT,
                      opacity: canSubmit ? 1 : 0.6,
                    },
                  ]}
                >
                  <Text style={[styles.ctaText, { fontSize: CTA_FONT }]}>Login</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={handleForgotPassword} style={{ marginTop: 12 }}>
                <Text style={[styles.forgotPassword, { fontSize: Math.max(12, scale(13, width)) }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Optional footer - small helper text */}
            <View style={{ marginTop: 18, alignItems: "center" }}>
              <Text style={styles.footerText}>Need help? Contact your administrator.</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  appBg: { flex: 1, backgroundColor: "#f5f7fb" }, // neutral professional background
  root: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    alignSelf: "center",
    // subtle elevation for android + ios
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  brand: { fontWeight: "700", color: "#111" },
  title: { color: "#111", fontWeight: "700", marginTop: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: "#fff",
    color: "#111",
    marginBottom: 12,
  },
  passwordRow: { flexDirection: "row", alignItems: "center" },
  showBtn: {
    marginLeft: 8,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  showText: { fontWeight: "700", color: "#111" },
  cta: {
    backgroundColor: "#0ea5a0", // teal-ish professional CTA
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  ctaText: { color: "#fff", fontWeight: "800" },
  forgotPassword: { color: "#2563eb", textAlign: "center", textDecorationLine: "underline" },
  footerText: { color: "#6b7280", fontSize: 13 },
});
