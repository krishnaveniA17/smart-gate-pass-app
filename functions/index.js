/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

/*const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });*/

//---------------------------------------------------------------------



 /* Firebase Cloud Functions for OTP-based login
 */

/*const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");

admin.initializeApp();

// ✅ Limit instances to save costs
setGlobalOptions({ maxInstances: 10 });

// ✅ Set SendGrid API key via CLI:
// firebase functions:config:set sendgrid.key="YOUR_SENDGRID_KEY"
sgMail.setApiKey(process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY || "");

// Firestore collection for OTPs
const OTP_COLLECTION = "login_otps";
const OTP_TTL_MS = 1000 * 60 * 5; // 5 minutes expiry

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}
function hashOtp(otp, salt) {
  return crypto.createHmac("sha256", salt).update(otp).digest("hex");
}

/**
 * 📩 Request OTP
 */
/*exports.requestLoginOtp = onCall(async (request) => {
  const email = (request.data?.email || "").toLowerCase().trim();
  if (!email) throw new Error("Email required");

  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch {
    // Don't reveal if user doesn't exist
    logger.info(`OTP requested for non-existing email: ${email}`);
    return { ok: true };
  }

  const otp = genOtp();
  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = hashOtp(otp, salt);

  await admin.firestore().collection(OTP_COLLECTION).add({
    uid: user.uid,
    email,
    otpHash,
    salt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: Date.now() + OTP_TTL_MS,
    used: false,
  });

  // Send email
  const msg = {
    to: email,
    from: "no-reply@yourdomain.com", // must be verified sender in SendGrid
    subject: "Your SmartGatePass Login OTP",
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
  };

  try {
    await sgMail.send(msg);
    logger.info(`OTP sent to ${email}`);
  } catch (err) {
    logger.error("SendGrid error", err);
    throw new Error("Failed to send email");
  }

  return { ok: true };
});

/**
 * ✅ Verify OTP
 */
/*exports.verifyLoginOtp = onCall(async (request) => {
  const email = (request.data?.email || "").toLowerCase().trim();
  const otp = (request.data?.otp || "").trim();

  if (!email || !otp) throw new Error("Missing email or OTP");

  const snap = await admin
    .firestore()
    .collection(OTP_COLLECTION)
    .where("email", "==", email)
    .where("used", "==", false)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) throw new Error("No OTP found");

  const doc = snap.docs[0];
  const data = doc.data();

  if (Date.now() > data.expiresAt) throw new Error("OTP expired");

  const calc = hashOtp(otp, data.salt);
  if (calc !== data.otpHash) throw new Error("Invalid OTP");

  // Mark OTP used
  await doc.ref.update({ used: true });

  // Create custom token for login
  const token = await admin.auth().createCustomToken(data.uid);
  return { token };
});*/
 

// functions/index.js
const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");

admin.initializeApp();

// ✅ Limit instances to save costs
setGlobalOptions({ maxInstances: 10 });

// ✅ Set SendGrid API key via Firebase Config
// Run: firebase functions:config:set sendgrid.key="YOUR_SENDGRID_KEY"
sgMail.setApiKey(process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY || "");

/* ------------------- OTP LOGIN ------------------- */
const OTP_COLLECTION = "login_otps";
const OTP_TTL_MS = 1000 * 60 * 5; // 5 minutes expiry

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}
function hashOtp(otp, salt) {
  return crypto.createHmac("sha256", salt).update(otp).digest("hex");
}

/**
 * 📩 Request OTP
 */
exports.requestLoginOtp = onCall(async (request) => {
  const email = (request.data?.email || "").toLowerCase().trim();
  if (!email) throw new Error("Email required");

  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch {
    logger.info(`OTP requested for non-existing email: ${email}`);
    return { ok: true }; // do not reveal user existence
  }

  const otp = genOtp();
  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = hashOtp(otp, salt);

  await admin.firestore().collection(OTP_COLLECTION).add({
    uid: user.uid,
    email,
    otpHash,
    salt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: Date.now() + OTP_TTL_MS,
    used: false,
  });

  const msg = {
    to: email,
    from: "no-reply@yourdomain.com", // must be verified sender in SendGrid
    subject: "Your SmartGatePass Login OTP",
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
  };

  try {
    await sgMail.send(msg);
    logger.info(`OTP sent to ${email}`);
  } catch (err) {
    logger.error("SendGrid error", err);
    throw new Error("Failed to send OTP email");
  }

  return { ok: true };
});

/**
 * ✅ Verify OTP
 */
exports.verifyLoginOtp = onCall(async (request) => {
  const email = (request.data?.email || "").toLowerCase().trim();
  const otp = (request.data?.otp || "").trim();

  if (!email || !otp) throw new Error("Missing email or OTP");

  const snap = await admin
    .firestore()
    .collection(OTP_COLLECTION)
    .where("email", "==", email)
    .where("used", "==", false)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) throw new Error("No OTP found");

  const doc = snap.docs[0];
  const data = doc.data();

  if (Date.now() > data.expiresAt) throw new Error("OTP expired");

  const calc = hashOtp(otp, data.salt);
  if (calc !== data.otpHash) throw new Error("Invalid OTP");

  await doc.ref.update({ used: true });

  const token = await admin.auth().createCustomToken(data.uid);
  return { token };
});

/* ------------------- PASS LIMIT ------------------- */
const db = admin.firestore();
// Weekly limit: 2 passes per student per week (Mon-Sun, week anchored to Monday)
const WEEK_LIMIT = 2;

// helper: calculate Monday start of week (YYYY-MM-DD)
function getWeekKey(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  // compute date of Monday for the current week
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const dayNum = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayNum}`; // e.g. "2025-09-22"
}

/**
 * 🪪 Create Pass with weekly limit (2 per week)
 *
 * This callable function:
 * - Requires auth (req.auth.uid)
 * - Expects req.data.pass with at least a reason
 * - Uses a weekly counter document: weekly_pass_counters/{uid}__{weekKey}
 * - Enforces WEEK_LIMIT (2). If reached, returns WEEK_LIMIT_REACHED.
 */
exports.createPass = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) {
    return { ok: false, error: "UNAUTHENTICATED" };
  }

  const pass = req.data?.pass;
  if (!pass || !pass.reason) {
    return { ok: false, error: "INVALID_INPUT", message: "Missing pass reason" };
  }

  const now = new Date();
  const weekKey = getWeekKey(now);
  const counterId = `${uid}__${weekKey}`;
  const counterRef = db.collection("weekly_pass_counters").doc(counterId);
  const passesRef = db.collection("gate_passes");

  try {
    const result = await db.runTransaction(async (tx) => {
      const counterSnap = await tx.get(counterRef);
      const current = counterSnap.exists ? (counterSnap.data().count || 0) : 0;

      if (current >= WEEK_LIMIT) {
        return {
          ok: false,
          error: "WEEK_LIMIT_REACHED",
          message: `Only ${WEEK_LIMIT} passes allowed per week`,
        };
      }

      tx.set(
        counterRef,
        {
          uid,
          weekKey,
          count: current + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const newDocRef = passesRef.doc();
      tx.set(newDocRef, {
        ...pass,
        studentUid: uid,
        weekKey,
        status: "pending_mentor",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { ok: true, passId: newDocRef.id };
    });

    return result;
  } catch (e) {
    logger.error("createPass failed", e);
    return { ok: false, error: "INTERNAL", message: "Could not create pass" };
  }
});
