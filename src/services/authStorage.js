// src/services/authStorage.js
import * as SecureStore from "expo-secure-store";

const USER_KEY = "smartGatePassUser";

/**
 * Save a user object securely
 * @param {{ uid: string, email?: string, role: string }} user
 * @returns {Promise<boolean>}
 */
export async function saveUser(user) {
  if (!user?.uid || !user?.role) {
    console.warn("saveUser: missing uid or role");
    return false;
  }
  try {
    const payload = JSON.stringify({
      uid: user.uid,
      email: user.email || null,
      role: user.role,
    });
    await SecureStore.setItemAsync(USER_KEY, payload, {
      keychainService: "smartgatepass_keychain", // iOS
      accessible: SecureStore.AFTER_FIRST_UNLOCK, // Android/iOS
    });
    return true;
  } catch (err) {
    console.error("saveUser error:", err);
    return false;
  }
}

/**
 * Retrieve the cached user
 * @returns {Promise<{ uid: string, email?: string, role: string } | null>}
 */
export async function getUser() {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.uid || !parsed?.role) return null;
    return parsed;
  } catch (err) {
    console.error("getUser error:", err);
    return null;
  }
}

/**
 * Clear the cached user (logout)
 * @returns {Promise<boolean>}
 */
export async function clearUser() {
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
    return true;
  } catch (err) {
    console.error("clearUser error:", err);
    return false;
  }
}
