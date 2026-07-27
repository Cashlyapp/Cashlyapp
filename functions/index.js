const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();

const db = admin.firestore();
const shortcutSecret = defineSecret("CASHLY_SHORTCUT_SECRET");

const DEFAULT_CATEGORY_RULES = {
  groceries: [
    "mercadona",
    "carrefour",
    "carrefour express",
    "carrefour market",
    "lidl",
    "aldi",
    "dia",
    "dia market",
    "eroski",
    "eroski city",
    "alcampo",
    "alcampo supermercado",
    "hipercor",
    "supercor",
    "supercor expres",
    "consum",
    "bonarea",
    "bonpreu",
    "esclat",
    "caprabo",
    "condis",
    "ahorramas",
    "masymas",
    "froiz",
    "gadisa",
    "gadis",
    "familia supermercado",
    "el arbol",
    "cash fresh",
    "coviran",
    "spar",
    "suma supermercado",
    "la despensa",
    "primaprix",
    "costco",
    "makro",
    "ulabox",
  ],

  shopping: [
    "amazon",
    "amazon eu",
    "amazon marketplace",
    "el corte ingles",
    "ikea",
    "leroy merlin",
    "bricomart",
    "obrama",
    "bauhaus",
    "bricodepot",
    "conforama",
    "maisons du monde",
    "mediamarkt",
    "media markt",
    "fnac",
    "pccomponentes",
    "apple store",
    "apple.com",
    "xiaomi",
    "samsung",
    "decathlon",
    "sprinter",
    "intersport",
    "zara",
    "zara home",
    "pull and bear",
    "pull&bear",
    "bershka",
    "stradivarius",
    "massimo dutti",
    "oysho",
    "lefties",
    "mango",
    "h&m",
    "primark",
    "kiabi",
    "c&a",
    "uniqlo",
    "cortefiel",
    "springfield",
    "women secret",
    "womensecret",
    "inside",
    "foot locker",
    "jd sports",
    "nike",
    "adidas",
    "puma",
    "skechers",
    "druni",
    "primor",
    "sephora",
    "douglas",
    "clarel",
    "kiko milano",
    "juguettos",
    "game",
    "cex",
    "aliexpress",
    "temu",
    "shein",
    "wallapop",
    "vinted",
  ],

  transport: [
    "repsol",
    "repsol service",
    "cepsa",
    "moeve",
    "bp",
    "shell",
    "galp",
    "avia",
    "petronor",
    "ballenoil",
    "plenoil",
    "bonarea energia",
    "easygas",
    "petroprix",
    "renfe",
    "iryo",
    "ouigo",
    "alsa",
    "avanza bus",
    "monbus",
    "uber",
    "cabify",
    "bolt",
    "freenow",
    "free now",
    "emt madrid",
    "tmb",
    "metro madrid",
    "metro barcelona",
    "bici mad",
    "bicing",
    "aena",
    "iberia",
    "vueling",
    "ryanair",
    "easyjet",
    "volotea",
    "air europa",
    "wizz air",
    "parking",
    "telpark",
    "elparking",
    "easypark",
    "aparca",
    "apk2",
    "empark",
  ],

  restaurants: [
    "mcdonald",
    "burger king",
    "kfc",
    "taco bell",
    "five guys",
    "popeyes",
    "telepizza",
    "dominos",
    "domino's",
    "papa johns",
    "starbucks",
    "vips",
    "ginos",
    "foster hollywood",
    "fosters hollywood",
    "la tagliatella",
    "100 montaditos",
    "la sureña",
    "goiko",
    "tgb",
    "the good burger",
    "pans and company",
    "rodilla",
    "sushi",
    "wok",
    "glovo",
    "ubereats",
    "uber eats",
    "just eat",
    "deliveroo",
  ],

  leisure: [
    "cinesa",
    "yelmo",
    "ocine",
    "kinepolis",
    "renoir",
    "cine",
    "ticketmaster",
    "entradas.com",
    "fever",
    "atrapalo",
    "parques reunidos",
    "warner",
    "portaventura",
    "terra mitica",
    "cabarceno",
    "zoo",
    "steam",
    "playstation",
    "playstation network",
    "xbox",
    "nintendo",
    "epic games",
    "riot games",
  ],

  selfcare: [
    "druni",
    "primor",
    "sephora",
    "douglas",
    "clarel",
    "kiko milano",
    "marvimundo",
    "perfumerias avenida",
    "peluqueria",
    "barberia",
    "fisioterapia",
    "fisioterapeuta",
    "masaje",
    "spa",
    "gimnasio",
    "basic fit",
    "basic-fit",
    "altafit",
    "dreamfit",
    "vivagym",
    "go fit",
    "metropolitan",
  ],

  subscriptions: [
    "netflix",
    "spotify",
    "hbo",
    "max.com",
    "disney plus",
    "disney+",
    "amazon prime",
    "prime video",
    "apple music",
    "apple tv",
    "youtube premium",
    "youtube music",
    "filmin",
    "dazn",
    "movistar plus",
    "skyshowtime",
    "audible",
    "kindle unlimited",
    "google one",
    "icloud",
    "dropbox",
    "microsoft 365",
    "adobe",
    "canva",
    "github",
    "chatgpt",
    "openai",
  ],

  bills: [
    "iberdrola",
    "endesa",
    "naturgy",
    "repsol luz",
    "totalenergies",
    "holaluz",
    "octopus energy",
    "aguas",
    "canal de isabel ii",
    "movistar",
    "o2",
    "vodafone",
    "orange",
    "jazztel",
    "masmovil",
    "mas movil",
    "pepephone",
    "digi",
    "lowi",
    "simyo",
    "yoigo",
    "finetwork",
    "adamo",
    "securitas direct",
    "prosegur",
    "mapfre",
    "mutua madrileña",
    "linea directa",
    "verti",
    "axa",
    "allianz",
    "sanitas",
    "adeslas",
  ],

  wedding: [
    "boda",
    "novia",
    "novio",
    "fotografo boda",
    "finca boda",
    "floristeria boda",
    "wedding",
  ],
};

const MERCHANT_RULES_CACHE_MS = 10 * 60 * 1000;

let cachedCategoryRules = null;
let categoryRulesLoadedAt = 0;

/**
 * Normaliza un valor de texto.
 * @param {*} value Valor recibido.
 * @return {string} Texto limpio o cadena vacía.
 */
function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normaliza texto para comparaciones.
 * @param {string} value Texto recibido.
 * @return {string} Texto normalizado.
 */
function normalizeSearchText(value) {
  return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
}

/**
 * Comprueba si el comercio contiene un alias configurado.
 * @param {string} merchant Comercio normalizado.
 * @param {string} alias Alias configurado.
 * @return {boolean} True cuando existe coincidencia.
 */
function merchantMatchesAlias(merchant, alias) {
  const normalizedAlias = normalizeSearchText(alias);

  if (!normalizedAlias) {
    return false;
  }

  if (normalizedAlias.length <= 3) {
    return merchant.split(" ").includes(normalizedAlias);
  }

  return merchant.includes(normalizedAlias);
}

/**
 * Comprueba que un objeto contiene reglas de categorías válidas.
 * @param {*} value Valor recibido.
 * @return {boolean} True cuando contiene reglas utilizables.
 */
function hasValidCategoryRules(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).some(
      (aliases) => Array.isArray(aliases) && aliases.length > 0,
  );
}

/**
 * Obtiene las reglas desde Firestore, usando una caché temporal.
 * @return {Promise<Object>} Reglas de categorización.
 */
async function getCategoryRules() {
  const now = Date.now();
  const cacheIsValid =
    cachedCategoryRules &&
    now - categoryRulesLoadedAt < MERCHANT_RULES_CACHE_MS;

  if (cacheIsValid) {
    return cachedCategoryRules;
  }

  try {
    const rulesDocument = await db
        .collection("config")
        .doc("merchantCategories")
        .get();

    if (rulesDocument.exists) {
      const storedRules = rulesDocument.data().rules;

      if (hasValidCategoryRules(storedRules)) {
        cachedCategoryRules = storedRules;
        categoryRulesLoadedAt = now;
        return cachedCategoryRules;
      }
    }
  } catch (error) {
    console.error("Error loading merchant category rules", error);
  }

  cachedCategoryRules = DEFAULT_CATEGORY_RULES;
  categoryRulesLoadedAt = now;

  return cachedCategoryRules;
}

/**
 * Obtiene la regla personalizada de un comercio para un usuario.
 *
 * @param {string} userId Identificador del usuario.
 * @param {string} merchant Nombre del comercio.
 * @return {Promise<Object|null>} Regla encontrada o null.
 */
async function getUserMerchantRule(userId, merchant) {
  const normalizedUserId = normalizeText(userId);
  const merchantKey = normalizeSearchText(merchant);

  if (!normalizedUserId || !merchantKey) {
    return null;
  }

  try {
    const ruleDocument = await db
        .collection("users")
        .doc(normalizedUserId)
        .collection("merchantRules")
        .doc(merchantKey)
        .get();

    if (!ruleDocument.exists) {
      return null;
    }

    const rule = ruleDocument.data();
    const categoryId = normalizeText(rule.categoryId);

    if (!categoryId) {
      return null;
    }

    return {
      merchantKey,
      displayName: normalizeText(rule.displayName),
      categoryId,
      source: normalizeText(rule.source),
    };
  } catch (error) {
    console.error(
        `Error loading merchant rule for ${merchantKey}`,
        error,
    );

    return null;
  }
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
 * @param {string} userId Identificador del usuario.
 * @param {string} merchant Nombre del comercio.
 * @return {Promise<string>} Identificador de la categoría sugerida.
 */
async function guessCategory(userId, merchant) {
  const userRule = await getUserMerchantRule(userId, merchant);

  if (userRule) {
    return userRule.categoryId;
  }

  const normalizedMerchant = normalizeSearchText(merchant);
  const categoryRules = await getCategoryRules();
  const rules = Object.entries(categoryRules);

  for (const [categoryId, merchantNames] of rules) {
    if (!Array.isArray(merchantNames)) {
      continue;
    }

    const matchesCategory = merchantNames.some(
        (merchantName) =>
          merchantMatchesAlias(normalizedMerchant, merchantName),
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

        const finalCategoryId =
          categoryId || await guessCategory(userId, merchant);

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
