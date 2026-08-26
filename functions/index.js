const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();

const db = admin.firestore();
const shortcutSecret = defineSecret("CASHLY_SHORTCUT_SECRET");
const cashlyUserUid = defineSecret("CASHLY_USER_UID");
const adminSecret = defineSecret("CASHLY_ADMIN_SECRET");

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

const DEFAULT_INCOME_CATEGORY_RULES = {
  salary: [
    "nomina",
    "nómina",
    "salario",
    "payroll",
    "babel",
    "bosonit",
  ],

  transfers_inc: [
    "bizum",
    "transferencia",
    "traspaso recibido",
    "envio de dinero",
    "envío de dinero",
  ],

  sales_inc: [
    "wallapop",
    "vinted",
    "venta",
    "segunda mano",
    "ebay",
  ],

  refunds_inc: [
    "devolucion",
    "devolución",
    "reembolso",
    "refund",
    "amazon refund",
    "devolucion amazon",
    "devolución amazon",
  ],

  gifts_inc: [
    "regalo",
    "cumpleaños",
    "boda",
    "espiga",
  ],

  investments_inc: [
    "dividendo",
    "dividendos",
    "intereses",
    "rentabilidad",
    "broker",
    "trade republic",
    "degiro",
  ],
};

const DEFAULT_VOICE_PARSING_RULES = {
  expenseKeywords: [
    "gasto",
    "he pagado",
    "he gastado",
    "me he gastado",
    "me he dejado",
    "he comprado",
    "pague",
    "pagué",
    "compra",
  ],

  incomeKeywords: [
    "ingreso",
    "he ingresado",
    "he ingresado un",
    "he recibido",
    "me han ingresado",
    "me han pagado",
    "me ha pagado",
    "me han enviado",
    "me ha enviado",
    "me han hecho un bizum",
    "me ha hecho un bizum",
    "he cobrado",
    "devolucion",
    "devolución",
    "reembolso",
  ],
  expenseMerchantConnectors: [
    " en ",
    " a ",
    " para ",
  ],

  incomeMerchantConnectors: [
    " de ",
    " por ",
    " desde ",
  ],

  currencyWords: [
    "euros",
    "euro",
    "eur",
  ],

  fillerWords: [
    "un gasto de",
    "una compra de",
    "un ingreso de",
    "por valor de",
    "la cantidad de",
  ],
};

const CONFIG_CACHE_MS = 10 * 60 * 1000;

let cachedCategoryRules = null;
let categoryRulesLoadedAt = 0;

let cachedVoiceParsingRules = null;
let voiceParsingRulesLoadedAt = 0;

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
 * Comprueba si las reglas de interpretación por voz son válidas.
 *
 * @param {*} value Reglas recibidas.
 * @return {boolean} True si contienen una configuración utilizable.
 */
function hasValidVoiceParsingRules(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const requiredProperties = [
    "expenseKeywords",
    "incomeKeywords",
    "expenseMerchantConnectors",
    "incomeMerchantConnectors",
    "currencyWords",
  ];

  return requiredProperties.every(
      (property) =>
        Array.isArray(value[property]) &&
        value[property].some(
            (item) => typeof item === "string" && item.trim(),
        ),
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
    now - categoryRulesLoadedAt < CONFIG_CACHE_MS;

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
 * Obtiene las reglas de interpretación por voz desde Firestore.
 *
 * @return {Promise<Object>} Reglas de interpretación.
 */
async function getVoiceParsingRules() {
  const now = Date.now();

  const cacheIsValid =
    cachedVoiceParsingRules &&
    now - voiceParsingRulesLoadedAt < CONFIG_CACHE_MS;

  if (cacheIsValid) {
    return cachedVoiceParsingRules;
  }

  try {
    const rulesDocument = await db
        .collection("config")
        .doc("voiceParsing")
        .get();

    if (rulesDocument.exists) {
      const storedRules = rulesDocument.data();

      if (hasValidVoiceParsingRules(storedRules)) {
        cachedVoiceParsingRules = {
          ...DEFAULT_VOICE_PARSING_RULES,
          ...storedRules,
        };

        voiceParsingRulesLoadedAt = now;
        return cachedVoiceParsingRules;
      }

      console.warn(
          "El documento config/voiceParsing no contiene reglas válidas",
      );
    }
  } catch (error) {
    console.error("Error loading voice parsing rules", error);
  }

  cachedVoiceParsingRules = DEFAULT_VOICE_PARSING_RULES;
  voiceParsingRulesLoadedAt = now;

  return cachedVoiceParsingRules;
}

/**
 * Detecta si el texto corresponde a un gasto o un ingreso.
 *
 * @param {string} normalizedText Texto normalizado.
 * @param {Object} rules Reglas de interpretación.
 * @return {string|null} "expense", "income" o null.
 */
function detectTransactionType(normalizedText, rules) {
  for (const keyword of rules.expenseKeywords) {
    if (normalizedText.includes(normalizeSearchText(keyword))) {
      return "expense";
    }
  }

  for (const keyword of rules.incomeKeywords) {
    if (normalizedText.includes(normalizeSearchText(keyword))) {
      return "income";
    }
  }

  return null;
}

/**
 * Extrae el importe en céntimos.
 *
 * @param {string} text Texto original.
 * @return {number|null}
 */
function extractAmountCents(text) {
  const numericMatch = text.match(/(\d+[.,]?\d{0,2})/);

  if (numericMatch) {
    const value = Number(
        numericMatch[1].replace(",", "."),
    );

    if (!Number.isNaN(value)) {
      return Math.round(value * 100);
    }
  }

  /*
   * El dictado de iOS puede escribir "un euro" en lugar de "1 euro".
   * Soportamos importes sencillos escritos con palabras en español.
   */
  const normalized = normalizeSearchText(text);

  const units = {
    un: 1,
    uno: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    dieciseis: 16,
    diecisiete: 17,
    dieciocho: 18,
    diecinueve: 19,
    veinte: 20,
    veintiuno: 21,
    veintidos: 22,
    veintitres: 23,
    veinticuatro: 24,
    veinticinco: 25,
    veintiseis: 26,
    veintisiete: 27,
    veintiocho: 28,
    veintinueve: 29,
  };

  const tens = {
    treinta: 30,
    cuarenta: 40,
    cincuenta: 50,
    sesenta: 60,
    setenta: 70,
    ochenta: 80,
    noventa: 90,
  };

  const currencyMatch = normalized.match(
      /\b([a-z]+(?:\s+y\s+[a-z]+)?)\s+(?:euro|euros|eur)\b/,
  );

  if (!currencyMatch) {
    return null;
  }

  const words = currencyMatch[1].split(/\s+/);
  let value = 0;

  if (words.length === 1) {
    value = units[words[0]] || tens[words[0]] || 0;
  } else if (
    words.length === 3 &&
    words[1] === "y" &&
    tens[words[0]] &&
    units[words[2]]
  ) {
    value = tens[words[0]] + units[words[2]];
  }

  return value > 0 ? value * 100 : null;
}

/**
 * Escapa un texto para poder utilizarlo dentro de una expresión regular.
 *
 * @param {string} value Texto que se quiere escapar.
 * @return {string} Texto escapado.
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extrae el comercio o el origen de una transacción.
 *
 * Ejemplos:
 * - "He pagado 12,35 euros en Mercadona" -> "Mercadona"
 * - "He pagado en Mercadona 12,35 euros" -> "Mercadona"
 * - "He cobrado 2100 euros de Babel" -> "Babel"
 * - "Me han hecho un Bizum de Juan de 15 euros" -> "Juan"
 *
 * @param {string} text Texto original recibido.
 * @param {"expense"|"income"} type Tipo de transacción.
 * @param {object} rules Reglas de interpretación de voz.
 * @return {string|null} Comercio u origen encontrado.
 */
function extractMerchant(text, type, rules) {
  const connectors = type === "expense" ?
    rules.expenseMerchantConnectors :
    rules.incomeMerchantConnectors;

  if (!Array.isArray(connectors) || connectors.length === 0) {
    return null;
  }

  /*
   * Quitamos los espacios configurados alrededor de cada conector,
   * pero exigimos que el conector aparezca como una palabra completa.
   *
   * De esta manera, el conector "a" no coincide con la letra "a"
   * contenida dentro de "pagado".
   */
  const connectorValues = connectors
      .map((connector) => connector.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex);

  if (connectorValues.length === 0) {
    return null;
  }

  const connectorPattern = connectorValues.join("|");

  const connectorRegex = new RegExp(
      `(?:^|\\s)(?:${connectorPattern})(?=\\s|$)`,
      "i",
  );

  const connectorMatch = connectorRegex.exec(text);

  if (!connectorMatch) {
    return null;
  }

  /*
   * El contenido posterior al primer conector es el candidato
   * inicial a comercio.
   */
  let merchant = text
      .slice(connectorMatch.index + connectorMatch[0].length)
      .trim();

  if (!merchant) {
    return null;
  }

  /*
   * Cortamos el comercio cuando aparece un importe.
   *
   * También soporta frases como:
   * "Bizum de Juan de 15 euros"
   *
   * En ese caso elimina "de 15 euros" y conserva solamente "Juan".
   */
  const currencyValues = Array.isArray(rules.currencyWords) ?
    rules.currencyWords
        .map((currency) => currency.trim())
        .filter(Boolean)
        .map(escapeRegex) :
    [];

  const currencyPattern = currencyValues.length > 0 ?
    `(?:\\s*(?:${currencyValues.join("|")}))?` :
    "";

  const amountPattern = "\\d+(?:[.,]\\d{1,2})?";

  const trailingAmountRegex = new RegExp(
      `\\s+(?:(?:${connectorPattern})\\s+)?` +
    `${amountPattern}${currencyPattern}.*$`,
      "i",
  );

  merchant = merchant
      .replace(trailingAmountRegex, "")
      .trim();


  /*
   * Las expresiones usadas para indicar la cuenta no forman parte
   * del nombre del comercio.
   */
  merchant = merchant
      .replace(/\s+(?:en\s+)?(?:efectivo|met[aá]lico|cash)\s*$/i, "")
      .trim();

  return merchant || null;
}

/**
 * Obtiene la regla personalizada de un comercio para un usuario.
 *
 * @param {string} userId Identificador del usuario.
 * @param {string} merchant Nombre del comercio.
 * @param {string} type Tipo de transacción.
 * @return {Promise<Object|null>} Regla encontrada o null.
 */
async function getUserMerchantRule(userId, merchant, type) {
  const normalizedUserId = normalizeText(userId);
  const merchantKey = normalizeSearchText(merchant);
  const normalizedType = type === "income" ? "income" : "expense";
  const ruleKey = `${normalizedType}_${merchantKey}`;

  if (!normalizedUserId || !merchantKey) {
    return null;
  }

  try {
    const ruleDocument = await db
        .collection("users")
        .doc(normalizedUserId)
        .collection("merchantRules")
        .doc(ruleKey)
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
      ruleKey,
      displayName: normalizeText(rule.displayName),
      categoryId,
      type: normalizeText(rule.type) || normalizedType,
      source: normalizeText(rule.source),
    };
  } catch (error) {
    console.error(
        `Error loading merchant rule for ${ruleKey}`,
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
 * @param {string} type Tipo de transacción ("income" o "expense").
 * @return {Promise<string>} Identificador de la categoría sugerida.
 */
async function guessCategory(userId, merchant, type) {
  const normalizedType = type === "income" ? "income" : "expense";

  const userRule = await getUserMerchantRule(
      userId,
      merchant,
      normalizedType,
  );

  if (userRule) {
    return userRule.categoryId;
  }

  const normalizedMerchant = normalizeSearchText(merchant);

  const categoryRules =
    normalizedType === "income" ?
      DEFAULT_INCOME_CATEGORY_RULES :
      await getCategoryRules();

  for (const [categoryId, merchantNames] of
    Object.entries(categoryRules)) {
    if (!Array.isArray(merchantNames)) {
      continue;
    }

    const matchesCategory = merchantNames.some(
        (merchantName) =>
          merchantMatchesAlias(
              normalizedMerchant,
              merchantName,
          ),
    );

    if (matchesCategory) {
      return categoryId;
    }
  }

  return normalizedType === "income" ?
    "other_inc" :
    "other_exp";
}

const ALLOWED_CONFIG_DOCUMENTS = [
  "voiceParsing",
  "merchantCategories",
];

/**
 * Comprueba si el valor es un objeto plano.
 *
 * @param {*} value Valor recibido.
 * @return {boolean} True si es un objeto válido.
 */
function isPlainObject(value) {
  return Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

/**
 * Comprueba si un documento de configuración está permitido.
 *
 * @param {*} documentId Identificador recibido.
 * @return {boolean} True si puede administrarse.
 */
function isAllowedConfigDocument(documentId) {
  return ALLOWED_CONFIG_DOCUMENTS.includes(
      normalizeText(documentId),
  );
}

/**
 * Interpreta un texto de voz sin guardar ninguna transacción.
 *
 * @param {string} text Texto recibido.
 * @return {Promise<Object>} Resultado de la interpretación.
 */
async function parseVoiceText(text) {
  const normalizedTextValue = normalizeText(text);

  if (!normalizedTextValue) {
    return {
      ok: false,
      error: "missing_text",
    };
  }

  const rules = await getVoiceParsingRules();
  const normalizedText = normalizeSearchText(normalizedTextValue);

  const type = detectTransactionType(
      normalizedText,
      rules,
  );

  const amountCents = extractAmountCents(
      normalizedTextValue,
  );

  const merchant = type ?
    extractMerchant(
        normalizedTextValue,
        type,
        rules,
    ) :
    null;

  const missing = [];

  if (!type) {
    missing.push("type");
  }

  if (!amountCents) {
    missing.push("amount");
  }

  if (!merchant) {
    missing.push("merchant");
  }

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
    };
  }

  return {
    ok: true,
    type,
    amountCents,
    merchant,
  };
}

exports.addTransaction = onRequest(
    {
      secrets: [shortcutSecret, cashlyUserUid],
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

        const userId = normalizeText(cashlyUserUid.value());
        const merchant = normalizeText(body.merchant);
        const paymentCard = normalizeText(body.paymentCard);
        const accountId =
          normalizeText(body.accountId) ||
          "main-bank";
        const type = normalizeText(body.type) || "expense";
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

        if (!["expense", "income"].includes(type)) {
          return res.status(400).json({
            ok: false,
            error: "invalid_type",
          });
        }

        const finalCategoryId =
          categoryId ||
          await guessCategory(
              userId,
              merchant,
              type,
          );

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
          type,
          amountCents,
          categoryId: finalCategoryId,
          date,
          merchant,
          accountId,
          paymentCard,
          note,
          source: type === "expense" ?
          "apple_pay_shortcut" :
          "manual_income_shortcut",
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

exports.parseVoiceTransaction = onRequest(
    {
      region: "europe-west1",
      secrets: [shortcutSecret],
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

        if (
          !suppliedSecret ||
      suppliedSecret !== shortcutSecret.value()
        ) {
          return res.status(401).json({
            ok: false,
            error: "unauthorized",
          });
        }

        const body = req.body || {};
        const text = normalizeText(body.text);

        if (!text) {
          return res.status(400).json({
            ok: false,
            error: "missing_text",
          });
        }

        const parsedTransaction = await parseVoiceText(text);

        return res.json(parsedTransaction);
      } catch (error) {
        console.error("parseVoiceTransaction error", error);

        return res.status(500).json({
          ok: false,
          error: "internal_error",
        });
      }
    });

exports.addVoiceTransaction = onRequest(
    {
      region: "europe-west1",
      secrets: [
        shortcutSecret,
        cashlyUserUid,
      ],
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

        if (
          !suppliedSecret ||
          suppliedSecret !== shortcutSecret.value()
        ) {
          return res.status(401).json({
            ok: false,
            error: "unauthorized",
          });
        }

        const body = req.body || {};
        const text = normalizeText(body.text);

        const parsedTransaction =
          await parseVoiceText(text);

        if (!parsedTransaction.ok) {
          return res.status(400).json(
              parsedTransaction,
          );
        }

        const userId =
          normalizeText(cashlyUserUid.value());

        if (!userId) {
          return res.status(400).json({
            ok: false,
            error: "missing_user_id",
          });
        }

        const date = normalizeText(
            body.date || body.dateISO,
        );

        if (!isValidDate(date)) {
          return res.status(400).json({
            ok: false,
            error: "invalid_date",
          });
        }

        const requestId =
          normalizeText(body.requestId) ||
          crypto.randomUUID();

        const paymentCard =
          normalizeText(body.paymentCard);

        const explicitAccountId =
          normalizeText(body.accountId);

        const mentionsCash =
          /\b(efectivo|met[aá]lico|cash)\b/i
              .test(text);

        const accountId =
          explicitAccountId ||
          (mentionsCash ? "cash" : "main-bank");

        const note =
          normalizeText(body.note);

        const requestedCategoryId =
          normalizeText(body.categoryId);

        const finalCategoryId =
          requestedCategoryId ||
          await guessCategory(
              userId,
              parsedTransaction.merchant,
              parsedTransaction.type,
          );

        const transactionRef = db
            .collection("users")
            .doc(userId)
            .collection("transactions")
            .doc(requestId);

        const existingTransaction =
          await transactionRef.get();

        if (existingTransaction.exists) {
          return res.status(200).json({
            ok: true,
            duplicate: true,
            id: transactionRef.id,
            parsed: parsedTransaction,
          });
        }

        await transactionRef.set({
          type: parsedTransaction.type,
          amountCents:
            parsedTransaction.amountCents,
          categoryId: finalCategoryId,
          date,
          merchant:
            parsedTransaction.merchant,
          accountId,
          paymentCard,
          note,
          source: "voice_shortcut",
          recurring: null,
          shortcutRequestId: requestId,
          originalVoiceText: text,
          createdAt:
            admin.firestore.FieldValue
                .serverTimestamp(),
        });

        return res.status(201).json({
          ok: true,
          duplicate: false,
          id: transactionRef.id,
          parsed: parsedTransaction,
          transaction: {
            type: parsedTransaction.type,
            amountCents:
              parsedTransaction.amountCents,
            merchant:
              parsedTransaction.merchant,
            categoryId: finalCategoryId,
            accountId,
            date,
          },
        });
      } catch (error) {
        console.error(
            "addVoiceTransaction error",
            error,
        );

        return res.status(500).json({
          ok: false,
          error: "internal_error",
        });
      }
    },
);

exports.importConfig = onRequest(
    {
      region: "europe-west1",
      secrets: [adminSecret],
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
          req.headers["x-cashly-admin-token"] ||
          (req.body && req.body.adminSecret);

        if (
          !suppliedSecret ||
          suppliedSecret !== adminSecret.value()
        ) {
          return res.status(401).json({
            ok: false,
            error: "unauthorized",
          });
        }

        const body = req.body || {};
        const documentId = normalizeText(body.document);
        const data = body.data;
        const merge = body.merge === true;

        if (!documentId) {
          return res.status(400).json({
            ok: false,
            error: "missing_document",
          });
        }

        if (!isAllowedConfigDocument(documentId)) {
          return res.status(403).json({
            ok: false,
            error: "document_not_allowed",
            allowedDocuments: ALLOWED_CONFIG_DOCUMENTS,
          });
        }

        if (!isPlainObject(data)) {
          return res.status(400).json({
            ok: false,
            error: "invalid_data",
          });
        }

        if (Object.keys(data).length === 0) {
          return res.status(400).json({
            ok: false,
            error: "empty_data",
          });
        }

        const configReference = db
            .collection("config")
            .doc(documentId);

        await configReference.set(data, {merge});

        /*
         * Invalida las cachés afectadas para que la misma instancia
         * no siga utilizando temporalmente la configuración anterior.
         */
        if (documentId === "voiceParsing") {
          cachedVoiceParsingRules = null;
          voiceParsingRulesLoadedAt = 0;
        }

        if (documentId === "merchantCategories") {
          cachedCategoryRules = null;
          categoryRulesLoadedAt = 0;
        }

        console.log(
            `Config imported: config/${documentId}, merge=${merge}`,
        );

        return res.status(200).json({
          ok: true,
          path: `config/${documentId}`,
          merge,
          fields: Object.keys(data),
        });
      } catch (error) {
        console.error("importConfig error", error);

        return res.status(500).json({
          ok: false,
          error: "internal_error",
        });
      }
    },
);
