/**
 * Cbackend.gs — Convex Backend Logic Reference
 * ============================================
 * This file documents the Convex backend data model and logic
 * that the Vision dashboard relies on, replicated here for the
 * Apps Script standalone version.
 *
 * In the Vercel app, this logic lives in:
 *   - convex/constants.ts  → COACHES[], AGENTS[] master lists
 *   - convex/utils.ts      → NAME_MAPPINGS, normalizeName(), getNickname()
 *   - convex/staff.ts      → Agent↔Coach↔LOB seed data & queries
 *   - convex/observations.ts → Observation CRUD & queries
 *   - convex/schema.ts     → Database schema
 *   - convex/http.ts       → Sheet sync HTTP endpoint
 */

// ── COACH → LOB MAPPING ─────────────────────────────────────
// This is the authoritative mapping of which coach belongs to which LOB.
// Source: convex/staff.ts → COACH_LOB
var COACH_LOB = {
  'Chui Ling Villafuerte Goh': 'Sales',
  'Xavier Bertril Nuico Cuerpo': 'Specialty',
  'Gazelle Broniola Bulalacao': 'Support',
  'Zaira Mae Regino Kinol': 'Support',
  'Charbel Rado Mahinay': 'Support',
  'Karl Jasper Lorejo Mag-usara': 'Support',
  'Erwin Verano': 'Sales',
  'Kyla Serion': 'Sales',
  'May-Ann Alabata Montegrejo': 'Specialty',
  'Ma. Mikaela Lalamonan Barrera': 'Support',
  'Joe Mari Torda Piñero': 'Specialty',
  'John Rey Aspacio Ortega': 'Support',
  'Korina Kim Romeo Alcantara': 'Specialty',
  'Elaine De Leon Roxas': 'Specialty',
  'Irene Villarin Estravela': 'Support',
  'Shanne Juliet Credo Diputado': 'Support',
  'Maria Fatima Serrano Buenviaje': 'Specialty',
  'Alyssa Sandel Reyes': 'Specialty',
  'Joenesse Vhem Laraya Bonghanoy': 'Sales',
  'Krishia May Capuyan Saldivar': 'Specialty',
  'Krizha Mae Gamalando Abia': 'Support',
  'Jake Vergel Gonzales Cajes': 'Support'
};

// ── NAME MAPPINGS (Nickname → Full Name) ─────────────────────
// Source: convex/utils.ts → NAME_MAPPINGS
// The spreadsheet often uses shortened names (nicknames).
// This map resolves them to the official full name in the database.
var NAME_MAPPINGS = {
  "Abegail Ingco": "Abegail Lariosa Ingco",
  "Aiva Abalos": "Aiva Paquira Abalos",
  "Alexie SanPedro": "Emiliano Alexie Casaje San Pedro Jr.",
  "Alina Amaya": "Alina Amaya Zelaya",
  "Alvin Gemira": "Alvin Portallo Gemira",
  "Alvin Saguban": "Alvin Cajipo Saguban",
  "Alyanna Aquino": "Alyanna Juhl Soledad Aquino",
  "Angel Guarin": "Angel Reyes Guarin",
  "Ann Kimberly Ablir": "Ann Kimberly Vidal Ablir",
  "Anne Dumaldal": "Anne June Mariño Dumaldal",
  "Arcelie Patula": "Arcelie Macatunog Patula",
  "Archie Osa": "Archie Ferrolino Osa",
  "Argie Cayetano": "Argie Dialino Cayetano",
  "Ariane Mae Ib-ib": "Ariane Mae Tercio Ib-ib",
  "Arlita Calingacion": "Arlita Trinidad Calingacion",
  "Ashley Adalid": "Ashley Barrera Adalid",
  "Bello Habibulla": "Bello Isah Egano Habibulla",
  "Belmarie Zamora": "Belmarie Manggon Zamora",
  "Cesar Unabia": "Cesar Joseph Hernandez Unabia",
  "Charlyn Cambio": "Charlyn Acabal Cambio",
  "Chiran Tortogo": "Chiran Solamillo Tortogo Jr.",
  "Christine Estomagulang": "Christine Gywneth Naval Estomagulang",
  "Christofer Perocho": "Christofer Dumaran Perocho",
  "Clint Anadon": "Clint Ybonne Ronato Anadon",
  "CrisAnn Relox": "Cris-Ann Ruado Relox",
  "Crystal Beron": "Crystal Jycel Longno Beron",
  "Cyril Santos": "Cyril Brondial Santos",
  "Darwin Data": "Darwin Levin Lope Data",
  "Daven Dorimon": "Daven Paul Manlupig Dorimon",
  "Devielyn Trangia": "Devielyn Kaye Diola Trangia",
  "Dexter Japay": "Dexter Dumaog Japay",
  "Diana Solibio": "Diana Sojor Solibio",
  "Dinalyn Villalon": "Dinalyn Macasinag Villalon",
  "Dominique Katada": "Dominique Eurika Portada Katada"
  // ... (truncated for brevity — full list in convex/utils.ts)
};

// ── COACH NICKNAME MAPPINGS ──────────────────────────────────
// Source: convex/utils.ts → COACH_NAME_MAPPINGS
// Coaches also have abbreviated names in the spreadsheet.
var COACH_NAME_MAPPINGS = {
  "Charbel Mahinay": "Charbel Rado Mahinay",
  "Chui Ling Goh": "Chui Ling Villafuerte Goh",
  "Elaine Roxas": "Elaine De Leon Roxas",
  "Erwin Verano": "Erwin Verano",
  "Gazelle Bulalacao": "Gazelle Broniola Bulalacao",
  "Irene Estravela": "Irene Villarin Estravela",
  "Joe Mari Piñero": "Joe Mari Torda Piñero",
  "JM Piñero": "Joe Mari Torda Piñero",
  "Joenesse Bonghanoy": "Joenesse Vhem Laraya Bonghanoy",
  "John Ortega": "John Rey Aspacio Ortega",
  "Karl Jasper Mag-usara": "Karl Jasper Lorejo Mag-usara",
  "Korina Alcantara": "Korina Kim Romeo Alcantara",
  "Krizha Abia": "Krizha Mae Gamalando Abia",
  "Kyla Serion": "Kyla Serion",
  "Mikaela Barrera": "Ma. Mikaela Lalamonan Barrera",
  "Maria Buenviaje": "Maria Fatima Serrano Buenviaje",
  "May-Ann Montegrejo": "May-Ann Alabata Montegrejo",
  "Shanne Diputado": "Shanne Juliet Credo Diputado",
  "Xavy Cuerpo": "Xavier Bertril Nuico Cuerpo",
  "Xavier Cuerpo": "Xavier Bertril Nuico Cuerpo",
  "Zaira Kinol": "Zaira Mae Regino Kinol",
  "Jake Cajes": "Jake Vergel Gonzales Cajes",
  "Alyssa Reyes": "Alyssa Sandel Reyes",
  "Krishia Saldivar": "Krishia May Capuyan Saldivar"
};

/**
 * Normalizes a name by stripping @ and resolving nicknames.
 * Source: convex/utils.ts → normalizeName()
 */
function normalizeName(name) {
  if (!name) return "";
  var trimmed = String(name).trim();
  if (trimmed.charAt(0) === '@') trimmed = trimmed.substring(1).trim();

  // Check agent mappings
  if (NAME_MAPPINGS[trimmed]) return NAME_MAPPINGS[trimmed];
  // Check coach mappings
  if (COACH_NAME_MAPPINGS[trimmed]) return COACH_NAME_MAPPINGS[trimmed];

  // Case-insensitive fallback
  var lower = trimmed.toLowerCase();
  for (var key in NAME_MAPPINGS) {
    if (key.toLowerCase() === lower) return NAME_MAPPINGS[key];
  }
  for (var key2 in COACH_NAME_MAPPINGS) {
    if (key2.toLowerCase() === lower) return COACH_NAME_MAPPINGS[key2];
  }

  return trimmed;
}

/**
 * Maps a rating string to a numeric percentage.
 * Source: convex/observations.ts rating logic
 */
function mapRating(ratingStr) {
  if (!ratingStr) return 80;
  var r = String(ratingStr).toLowerCase();
  if (r.indexOf('exceed') !== -1) return 100;
  if (r.indexOf('meets') !== -1) return 85;
  if (r.indexOf('needs') !== -1) return 60;
  if (r.indexOf('below') !== -1) return 40;
  return 80;
}
