const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();

const db = admin.firestore();
const shortcutSecret = defineSecret("CASHLY_SHORTCUT_SECRET");

const CATEGORY_RULES = {
  groceries: [
    "mercadona",
    "carrefour",
    "lidl",
    "aldi",
    "dia",
    "eroski",
    "alcampo",
  ],
  shopping: [
    "amazon",
    "zara",
    "ikea",
    "primark",
    "h&m",
    "el corte ingles",
  ],
  transport: [
    "repsol",
    "cepsa",
    "bp",
    "shell",
    "renfe",
    "uber",
    "cabify",
  ],
  restaurants: [
    "mcdonald",
    "burger king",
    "kfc",
    "telepizza",
    "dominos",
    "starbucks",
  ],
  leisure: [
    "netflix",
    "spotify",
    "steam",
    "playstation",
    "cine",
  ],
};

/**
 * Normaliza un valor de texto.
 * @param {*} value Valor recibido.
 * @return {string} Texto limpio o cadena vacía.
 */
function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normaliza texto para comparaciones, eliminando tildes y mayúsculas.
 * @param {string} value Texto recibido.
 * @return {string} Texto normalizado.
 */
function normalizeSearchText(value) {
  return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
}

/**
 * Comprueba que la fecha tenga formato YYYY-MM-DD.
 * @param {*} value Valor recibido.
 * @return {boolean} True si el formato es válido.
 */
function isValidDate(value) {
  if (typeof value !== "string") {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Deduce una categoría de gasto a partir del nombre del comercio.
 * @param {string} merchant Nombre del comercio.
 * @return {string} Identificador de la categoría sugerida.
 */
function guessCategory(merchant) {
  const normalizedMerchant = normalizeSearchText(merchant);

  for (const [categoryId, merchantNames] of
    Object.entries(CATEGORY_RULES)) {
    const matchesCategory = merchantNames.some(
        (merchantName) => normalizedMerchant.includes(merchantName),
    );

    if (matchesCategory) {
      return categoryId;
    }
  }

  return "other_exp";
}

exports.addTransaction = onRequest(
    {
      secrets: [shortcutSecret],
      region: "europe-west1",
    },
    async (req, res) => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({
            ok: false,
            error: "method_not_allowed",
          });
        }

        const suppliedSecret =
            req.headers["x-cashly-token"] ||
            (req.body && req.body.secret);

        if (!suppliedSecret ||
            suppliedSecret !== shortcutSecret.value()) {
          return res.status(401).json({
            ok: false,
            error: "unauthorized",
          });
        }

        const body = req.body || {};

        const userId = normalizeText(body.userId);
        const merchant = normalizeText(body.merchant);
        const paymentCard = normalizeText(body.paymentCard);
        const categoryId = normalizeText(body.categoryId);
        const note = normalizeText(body.note);
        const date = normalizeText(body.date || body.dateISO);
        const requestId =
          normalizeText(body.requestId) ||
          crypto.randomUUID();

        const amountCents = Number(body.amountCents);

        if (!userId) {
          return res.status(400).json({
            ok: false,
            error: "missing_user_id",
          });
        }

        if (!Number.isInteger(amountCents) || amountCents <= 0) {
          return res.status(400).json({
            ok: false,
            error: "invalid_amount",
          });
        }

        const finalCategoryId = categoryId || guessCategory(merchant);

        if (!isValidDate(date)) {
          return res.status(400).json({
            ok: false,
            error: "invalid_date",
          });
        }

        const transactionRef = db
            .collection("users")
            .doc(userId)
            .collection("transactions")
            .doc(requestId);

        const existingTransaction = await transactionRef.get();

        if (existingTransaction.exists) {
          return res.status(200).json({
            ok: true,
            duplicate: true,
            id: transactionRef.id,
          });
        }

        await transactionRef.set({
          type: "expense",
          amountCents,
          categoryId: finalCategoryId,
          date,
          merchant,
          paymentCard,
          note,
          source: "apple_pay_shortcut",
          recurring: null,
          shortcutRequestId: requestId,
          createdAt:
            admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(201).json({
          ok: true,
          duplicate: false,
          id: transactionRef.id,
        });
      } catch (error) {
        console.error("addTransaction error", error);

        return res.status(500).json({
          ok: false,
          error: "internal_error",
        });
      }
    },
);
