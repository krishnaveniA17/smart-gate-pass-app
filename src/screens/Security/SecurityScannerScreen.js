// src/screens/Security/SecurityScannerScreen.js
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Platform,
} from "react-native";

const db = getFirestore();

export default function SecurityScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const navigation = useNavigation();
  const hasScanned = useRef(false); // track if a scan is already processed

  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const saveHistory = async (entry) => {
    try {
      await addDoc(collection(db, "scan_history"), {
        ...entry,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.log("❌ Failed to save history:", e);
    }
  };

  const goToHistory = () => {
    setTimeout(() => {
      try {
        navigation.navigate("SecurityTabs", {
          screen: "SecurityDashboard",
          params: { refresh: true },
        });
      } catch (err) {
        console.log("⚠️ Navigation error:", err);
      }
    }, 300);
  };

  const handleScanned = async ({ data }) => {
    // Prevent multiple triggers
    if (hasScanned.current) return;
    hasScanned.current = true;
    setScanning(false);

    try {
      const qrData = JSON.parse(data);
      const now = Math.floor(Date.now() / 1000);

      if (now > qrData.expiryTimestamp) {
        Alert.alert("❌ QR Expired", "This gate pass has expired.", [
          {
            text: "OK",
            onPress: () => {
              hasScanned.current = false; // reset after dismiss
              goToHistory();
            },
          },
        ]);

        await saveHistory({
          studentName: "Unknown",
          usn: "-",
          photoURL: null,
          status: "expired",
          time: new Date().toLocaleString(),
        });
        return;
      }

      const snap = await getDoc(doc(db, "gate_passes", qrData.passId));
      if (!snap.exists()) {
        Alert.alert("❌ Invalid", "Pass not found in system.", [
          {
            text: "OK",
            onPress: () => {
              hasScanned.current = false;
              goToHistory();
            },
          },
        ]);

        await saveHistory({
          studentName: "Unknown",
          usn: "-",
          photoURL: null,
          status: "rejected",
          time: new Date().toLocaleString(),
        });
        return;
      }

      const pass = snap.data();
      if (pass.status !== "approved") {
        Alert.alert("❌ Invalid", "This pass is not approved anymore.", [
          {
            text: "OK",
            onPress: () => {
              hasScanned.current = false;
              goToHistory();
            },
          },
        ]);

        await saveHistory({
          studentName: pass.studentName || "Unknown",
          usn: pass.usn || "-",
          photoURL: pass.photoURL || null,
          status: "rejected",
          time: new Date().toLocaleString(),
        });
        return;
      }

      // Success
      Alert.alert(
        "✅ Pass Verified",
        `Student: ${pass.studentName || "Unknown"}\nUSN: ${pass.usn || "-"}`,
        [
          {
            text: "OK",
            onPress: () => {
              hasScanned.current = false;
              goToHistory();
            },
          },
        ]
      );

      await saveHistory({
        studentName: pass.studentName || "Unknown",
        usn: pass.usn || "-",
        photoURL: pass.photoURL || null,
        status: "approved",
        time: new Date().toLocaleString(),
      });
    } catch (err) {
      console.log("⚠️ QR scan error:", err);
      Alert.alert("⚠️ Error", "Invalid QR code format.", [
        {
          text: "OK",
          onPress: () => {
            hasScanned.current = false;
            goToHistory();
          },
        },
      ]);

      await saveHistory({
        studentName: "Unknown",
        usn: "-",
        photoURL: null,
        status: "error",
        time: new Date().toLocaleString(),
      });
    }
  };

  // Square scanning box: size is based on the smallest screen dimension.
  const squareSize = Math.round(Math.min(width, height) * 0.62); // ~62% of smallest dimension
  const squareHalf = Math.round(squareSize / 2);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>No access to camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.scanButton}>
          <Text style={styles.scanText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanning ? (
        <View style={styles.center}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => {
              hasScanned.current = false; // reset before new scan
              setScanning(true);
            }}
          >
            <Text style={styles.scanText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            // pass handler only while scanning true (extra safety)
            onBarcodeScanned={scanning ? handleScanned : undefined}
          />

          {/* Overlay mask: top / left / right / bottom */}
          <View style={[styles.overlay]}>
            {/* top mask */}
            <View style={[styles.maskRow, { height: (height - squareSize) / 2 }]} pointerEvents="none" />
            <View style={styles.middleRow} pointerEvents="none">
              {/* left mask */}
              <View style={[styles.maskCol, { width: (width - squareSize) / 2 }]} />
              {/* center: transparent square with border */}
              <View
                style={[
                  styles.scanBox,
                  {
                    width: squareSize,
                    height: squareSize,
                    borderRadius: 8,
                  },
                ]}
              >
                {/* corner accents */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              {/* right mask */}
              <View style={[styles.maskCol, { width: (width - squareSize) / 2 }]} />
            </View>
            {/* bottom mask */}
            <View style={[styles.maskRow, { height: (height - squareSize) / 2 }]} pointerEvents="none" />
          </View>

          {/* Instruction text */}
          <View style={[styles.instructionWrap, { top: Math.round((height / 2) + squareHalf + 12) }]}>
            <Text style={styles.instructionText}>Align the QR code inside the box</Text>
          </View>

          {/* Cancel / Toggle button */}
          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setScanning(false);
                hasScanned.current = false;
              }}
            >
              <Text style={styles.cancelTxt}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanButton: {
    backgroundColor: "#1f6feb",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  scanText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },

  maskRow: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  middleRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },

  maskCol: {
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  scanBox: {
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },

  // corner accent styles (small L shapes)
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
  },
  topLeft: {
    left: -2,
    top: -2,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: "#1f6feb",
  },
  topRight: {
    right: -2,
    top: -2,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderColor: "#1f6feb",
  },
  bottomLeft: {
    left: -2,
    bottom: -2,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: "#1f6feb",
  },
  bottomRight: {
    right: -2,
    bottom: -2,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: "#1f6feb",
  },

  instructionWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  instructionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  bottomControls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: Platform.OS === "android" ? 28 : 36,
    alignItems: "center",
  },

  cancelBtn: {
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  cancelTxt: {
    color: "#fff",
    fontWeight: "700",
  },
});
