import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebaseConfig";
import { getUser, saveUser } from "../services/authStorage";

import { Feather, MaterialIcons } from "@expo/vector-icons";

// Core screens
import LoginScreen from "../screens/Auth/LoginScreen";

// Student screens
import StudentDashboard from "../screens/Student/StudentDashboard";
import RequestGatePassScreen from "../screens/Student/RequestGatePassScreen";
import PassStatusScreen from "../screens/Student/PassStatusScreen";
import StudentProfileScreen from "../screens/Student/StudentProfileScreen";

// Security screens
import SecurityDashboard from "../screens/Security/SecurityDashboard";
import SecurityScannerScreen from "../screens/Security/SecurityScannerScreen";
import SecurityProfileScreen from "../screens/Security/SecurityProfileScreen";

// Mentor screens
import MentorDashboardScreen from "../screens/Mentor/MentorDashboardScreen";
import MentorRequestDetailsScreen from "../screens/Mentor/MentorRequestDetailsScreen";
import MentorRejectedListScreen from "../screens/Mentor/MentorRejectedListScreen";
import MentorProfileScreen from "../screens/Mentor/MentorProfileScreen";
import MentorRequestViewScreen from "../screens/Mentor/MentorRequestViewScreen";
import MentorForwardedListScreen from "../screens/Mentor/MentorForwardedListScreen";
import AddStudentScreen from "../screens/Mentor/AddStudentScreen";

// HOD screens
import HODDashboardScreen from "../screens/HOD/HODDashboardScreen";
import HODRequestDetailsScreen from "../screens/HOD/HODRequestDetailsScreen";
import HODApprovedListScreen from "../screens/HOD/HODApprovedListScreen";
import HODRejectedListScreen from "../screens/HOD/HODRejectedListScreen";
import HODProfileScreen from "../screens/HOD/HODProfileScreen";
import HODRequestViewScreen from "../screens/HOD/HODRequestViewScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function Loader() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
}

/** ---------- Auth-only stack ---------- */
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

/** ---------- Student: Tabs inside a Stack ---------- */
function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0b0b0b", borderTopColor: "#191919" },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#9a9a9a",
        tabBarIcon: ({ color, size }) => {
          const map = {
            StudentDashboard: "history",
            StudentProfile: "user",
          };
          const iconName = map[route.name] || "circle";
          return route.name === "StudentDashboard" ? (
            <MaterialIcons name={iconName} size={size} color={color} />
          ) : (
            <Feather name={iconName} size={size} color={color} />
          );
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      })}
    >
      <Tab.Screen
        name="StudentDashboard"
        component={StudentDashboard}
        options={{ tabBarLabel: "History" }}
      />
      <Tab.Screen
        name="StudentProfile"
        component={StudentProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

function StudentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentTabs" component={StudentTabs} />
      <Stack.Screen name="RequestGatePass" component={RequestGatePassScreen} />
      <Stack.Screen name="PassStatus" component={PassStatusScreen} />
    </Stack.Navigator>
  );
}

/** ---------- Security: Tabs inside a Stack ---------- */
function SecurityTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0b0b0b", borderTopColor: "#191919" },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#9a9a9a",
        tabBarIcon: ({ color, size }) => {
          const map = {
            SecurityDashboard: "list",
            SecurityProfile: "user",
          };
          const iconName = map[route.name] || "circle";
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      })}
    >
      <Tab.Screen
        name="SecurityDashboard"
        component={SecurityDashboard}
        options={{ tabBarLabel: "History" }}
      />
      <Tab.Screen
        name="SecurityProfile"
        component={SecurityProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

function SecurityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* ✅ Scanner is in stack */}
      <Stack.Screen name="SecurityTabs" component={SecurityTabs} />
      <Stack.Screen name="SecurityScanner" component={SecurityScannerScreen} />
    </Stack.Navigator>
  );
}

/** ---------- Mentor: Tabs inside a Stack ---------- */
function MentorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0b0b0b", borderTopColor: "#191919" },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#9a9a9a",
        tabBarIcon: ({ color, size }) => {
          const map = {
            MentorDashboard: "list",
            MentorForwarded: "send",
            MentorRejected: "x-circle",
            MentorProfile: "user",
          };
          const iconName = map[route.name] || "circle";
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      })}
    >
      <Tab.Screen
        name="MentorDashboard"
        component={MentorDashboardScreen}
        options={{ tabBarLabel: "Pending" }}
      />
      <Tab.Screen
        name="MentorForwarded"
        component={MentorForwardedListScreen}
        options={{ tabBarLabel: "Forwarded" }}
      />
      <Tab.Screen
        name="MentorRejected"
        component={MentorRejectedListScreen}
        options={{ tabBarLabel: "Rejected" }}
      />
      <Tab.Screen
        name="MentorProfile"
        component={MentorProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

function MentorStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MentorTabs" component={MentorTabs} />
      <Stack.Screen
        name="MentorRequestDetails"
        component={MentorRequestDetailsScreen}
      />
      <Stack.Screen
        name="MentorRequestView"
        component={MentorRequestViewScreen}
      />
      <Stack.Screen name="AddStudent" component={AddStudentScreen} />
    </Stack.Navigator>
  );
}

/** ---------- HOD: Tabs inside a Stack ---------- */
function HODTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0b0b0b", borderTopColor: "#191919" },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#9a9a9a",
        tabBarIcon: ({ color, size }) => {
          const map = {
            HODDashboard: "list",
            HODApproved: "check-circle",
            HODRejected: "x-circle",
            HODProfile: "user",
          };
          const iconName = map[route.name] || "circle";
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      })}
    >
      <Tab.Screen
        name="HODDashboard"
        component={HODDashboardScreen}
        options={{ tabBarLabel: "Pending" }}
      />
      <Tab.Screen
        name="HODApproved"
        component={HODApprovedListScreen}
        options={{ tabBarLabel: "Approved" }}
      />
      <Tab.Screen
        name="HODRejected"
        component={HODRejectedListScreen}
        options={{ tabBarLabel: "Rejected" }}
      />
      <Tab.Screen
        name="HODProfile"
        component={HODProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

function HODStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HODTabs" component={HODTabs} />
      <Stack.Screen
        name="HODRequestDetails"
        component={HODRequestDetailsScreen}
      />
      <Stack.Screen name="HODRequestView" component={HODRequestViewScreen} />
    </Stack.Navigator>
  );
}

/** ---------- Root role router ---------- */
export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const role = snap.data().role;
            setUserRole(role);
            await saveUser({ uid: user.uid, email: user.email, role });
          } else {
            setUserRole(null);
          }
        } else {
          const cached = await getUser();
          setUserRole(cached ? cached.role : null);
        }
      } catch (e) {
        console.error("Error fetching role:", e);
        setUserRole(null);
      } finally {
        setInitializing(false);
      }
    });
    return unsubscribe;
  }, []);

  if (initializing) return <Loader />;

  if (!userRole) return <AuthStack />;
  if (userRole === "student") return <StudentStack />;
  if (userRole === "mentor") return <MentorStack />;
  if (userRole === "security") return <SecurityStack />;
  if (userRole === "hod") return <HODStack />;

  return <AuthStack />;
}
