const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const TX_SECRET = "xMfRfqe9i-7bU4N2-KzYv1pQ8"; // tu secret actual

exports.addTransaction = onRequest(async (req, res) => {
  try {
    console.log("addTransaction called", {
      method: req.method,
      headers: {
        "content-type": req.headers["content-type"],
      },
      body: req.body,
    });

    // 1) Método
    if (req.method !== "POST") {
      return res
          .status(405)
          .json({ok: false, error: "method_not_allowed", method: req.method});
    }

    const body = req.body || {};

    // 2) Secret
    if (!body.secret) {
      return res
          .status(401)
          .json({ok: false, error: "missing_secret"});
    }
    if (body.secret !== TX_SECRET) {
      return res.status(401).json({
        ok: false,
        error: "bad_secret",
        received: body.secret,
      });
    }

    // 3) Campos obligatorios
    const {userId, type, amountCents, categoryId, dateISO, note} = body;

    if (!userId || !type || !amountCents || !categoryId || !dateISO) {
      return res.status(400).json({
        ok: false,
        error: "missing_fields",
        body,
      });
    }

    // 4) Guardar en Firestore
    const txRef = db
        .collection("users")
        .doc(userId)
        .collection("transactions")
        .doc();

    await txRef.set({
      type,
      amountCents,
      categoryId,
      date: dateISO,
      note: note || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      ok: true,
      id: txRef.id,
    });
  } catch (err) {
    console.error("addTransaction error", err);
    return res.status(500).json({
      ok: false,
      error: "internal",
      message: err.message || String(err),
    });
  }
});
