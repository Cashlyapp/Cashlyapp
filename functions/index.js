const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// PON AQUÍ UN SECRET LARGO Y SOLO PARA TI
const TX_SECRET = "xMfRfqe9i-7bU4N2-KzYv1pQ8";

exports.addTransaction = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Only POST allowed");
  }

  try {
    const {
      secret,
      type,
      amountCents,
      categoryId,
      note,
      dateISO,
      userId,
    } = req.body || {};

    if (secret !== TX_SECRET) {
      return res.status(403).send("Forbidden");
    }

    if (!userId) {
      return res.status(400).send("Missing userId");
    }

    if (type !== "income" && type !== "expense") {
      return res.status(400).send("Invalid type");
    }

    const amount = Number(amountCents);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).send("Invalid amountCents");
    }

    const date = typeof dateISO === "string" && dateISO.length >= 10 ?
    dateISO.slice(0, 10) :
    new Date().toISOString().slice(0, 10);

    const db = admin.firestore();
    const col = db.collection("users").doc(userId).collection("transactions");

    const docData = {
      type,
      amountCents: amount,
      categoryId:
        categoryId || (type === "income" ? "other_inc" : "other_exp"),
      date,
      note: note || "",
      recurring: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await col.add(docData);

    return res.status(200).json({
      ok: true,
      id: docRef.id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal error");
  }
});
