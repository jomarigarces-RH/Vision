const { ConvexClient } = require("convex/browser");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

// --- Configuration ---
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Error: NEXT_PUBLIC_CONVEX_URL not found in .env.local");
  process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

// --- User Lists for Fuzzy Matching ---
const COACHES = [
  'Chui Ling Villafuerte Goh', 'Xavier Bertril Nuico Cuerpo', 'Gazelle Broniola Bulalacao', 
  'Zaira Mae Regino Kinol', 'Charbel Rado Mahinay', 'Karl Jasper Lorejo Mag-usara', 
  'Erwin Verano', 'Kyla Serion', 'May-Ann Alabata Montegrejo', 'Ma. Mikaela Lalamonan Barrera', 
  'Joe Mari Torda Piñero', 'John Rey Aspacio Ortega', 'Korina Kim Romeo Alcantara', 
  'Elaine De Leon Roxas', 'Irene Villarin Estravela', 'Shanne Juliet Credo Diputado', 
  'Maria Fatima Serrano Buenviaje', 'Alyssa Sandel Reyes', 'Joenesse Vhem Laraya Bonghanoy', 
  'Krishia May Capuyan Saldivar'
];

const AGENTS = [
  'Abegail Lariosa Ingco', 'Aiva Paquira Abalos', 'Alina Amaya Zelaya', 'Alvin Cajipo Saguban', 
  'Alvin Portallo Gemira', 'Alyanna Juhl Soledad Aquino', 'Angel Reyes Guarin', 'Ann Kimberly Vidal Ablir', 
  'Anne June Mariño Dumaldal', 'Arcelie Macatunog Patula', 'Archie Ferrolino Osa', 'Argie Dialino Cayetano', 
  'Ariane Mae Tercio Ib-Ib', 'Arlita Trinidad Calingacion', 'Arzy Llemit', 'Ashley Barrera Adalid', 
  'Bello Isah Egano Habibulla', 'Belmarie Manggon Zamora', 'Cesar Joseph Hernandez Unabia', 
  'Charlyn Acabal Cambio', 'Chiran Solamillo Tortogo Jr.', 'Christin Sanchez', 
  'Christine Gywneth Naval Estomagulang', 'Christofer Dumaran Perocho', 'Clint Ybonne Ronato Anadon', 
  'Cris-Ann Ruado Relox', 'Crystal Jycel Longno Beron', 'Cyril Brondial Santos', 'Darwin Levin Lope Data', 
  'Daryll Tulod Bentulan', 'Daven Paul Manlupig Dorimon', 'Devielyn Kaye Diola Trangia', 
  'Dexter Dumaog Japay', 'Diana Sojor Solibio', 'Dinalyn Macasinag Villalon', 'Dino Amiel Lojo Balaga', 
  'Dominique Eurika Portada Katada', 'Donna Amores', 'Drea Timonan Surbito', 'Dwaynee Chan Benignos', 
  'Edeson Alabata Abo-Abo', 'Edwin Zabala Dizon', 'Elenie Villaro Tito', 'Emiliano Alexie Casaje San Pedro Jr.', 
  'Eva Mae Gerardo Violeta', 'Farah Mae Lope Torres', 'Felori Baguihon Siplao', 'Flora May Carcusia Cagampang', 
  'Frances Bryle Millan Gelvoria', 'Francose Marie Partosa Estrada', 'Genilyn Bautista Aseñas', 
  'Gina Panaligan Bautista', 'Haissam Rohann Bocanegra Morton', 'Heinz Harald Pagon Acson', 
  'Honey Ege Radoc', 'Honeylen Landisa', 'Irene Ann Cadallo Bahandi', 'Irene Dagoy Rolandong', 
  'Iris Mae Recaldo Timbal', 'Ivan Allan Bungcasan', 'Jade Marian Daarol Gabunilas', 
  'Jamaica Arranchado Veriña', 'James Saycon Buagas', 'Jan August Delfin Villamor', 
  'Jana Esperanza Sun Dalleda', 'Jared Xavierre Giron Manuel', 'Jay Mark Almonte Tuayon', 
  'Jayrilyn Devero Alberto', 'Jayson Saycon Caminos', 'Jeff Cantina Dela Cruz', 'Jefford Lu-Ang Algoso', 
  'Jeizel Eringe Mapula', 'Jeniefe Tubac Garcia', 'Jenifer Alatan Balanay', 'Jerald Anqui Olasiman', 
  'Jeremy Capalad Albina', 'Jeremy Ruso Arnaiz', 'Jerome Makasilhig Olarte', 'Jesmar Borromeo Maxino', 
  'Jessa Dee Silva Romero', 'Jessa Galve Amparado', 'Jessa Kadusale Casido', 'Jesselaine Hinaut Siglos', 
  'Jessica Causing Montecillo', 'Jessica Cuizon Catubig', 'Jessuelle Zaira Patrimonio', 
  'Jimboy Tortusa Corciega', 'Joan Catinggan', 'Joann Torres Balasabas', 'Johann Pabayos Aran', 
  'John Christopher Ang Tismo', 'John Patrick Gutierrez Diaz', 'John Paul Jabas Romano', 
  'John Philip Bulagao', 'John Ric Carabaña Vallejos', 'Johnnas Vidanes Morales', 'Jolina Tinaytina Lopez', 
  'Joriel Duran Elloren', 'Jose Louise Varona Anda', 'Jose Yael Inocente', 'Josephine Belaro Olbes', 
  'Jostuart Stanley Monsole Gunter', 'June Solamillo Lucilla', 'Karl Elmer Ii Cavite Piamonte', 
  'Karla Louise Claud Ramos', 'Kay Ann Apurado Quio', 'Kevin Berino Elumba', 'Kimberly Anne Siquijor Garol', 
  'Kimberly Nicole Lim Cachero', 'Kristine Garcia Ramos', 'Kyla Saracia Abalos', 'Kylle Elaine Econg Manninen', 
  'Lenie Jane Tarog', 'Lourdes Apple Calidguid Unajan', 'Luther Maglinte Dalura', 'Ma Reynaline Canseco Barona', 
  'Mae Jumawan Sasil', 'Maevel Cruz Umalza', 'Maricel Morquida', 'Marichu Bornillo Acar', 
  'Marion Jean Espero Vital', 'Marites Taburnal Agustin', 'Marlo Villarin Labrador', 
  'Marry Jen Villieta Catubig', 'Marth Joseph Dayao Enopia', 'Mary Caribelle Anne Miculob', 
  'Mary Vella Paltinca', 'Meguela Angela Bisco Dagoy', 'Melissa Tan Capulong', 'Merbelyn Magbanua Mancia', 
  'Michael Angelo Bisabis Taub', 'Michelle Guzman Plazos', 'Michelle Zamora Ortiz', 
  'Mickel Arvin Lloyd Noay', 'Mitch Vianca Ferenal Bajenting', 'Neil Brent Norico Barte', 
  'Nhova Kristy Catubig Venenoso', 'Nica Diona Algadepe Segara', 'Niño Kim Daniel Frutas Legaspi', 
  'Noel John Callao Canoy', 'Oliver Jr Gilhang Soriano', 'Paul Vincent Dispe Valerio', 
  'Precious Jewel Salazar', 'Princess Shaine Mimis Asidera', 'Rey Eufronio Laguitao Buagas', 
  'Reynold Abejero Mariño', 'Reza Lindayao Lumjod', 'Riza Venales Kilapkilap', 'Rizza Jean Fernandez', 
  'Rolando Busbus Daohog', 'Rona May Beatingo Astillar', 'Rose Ann Laque Bangcat', 
  'Rosean Mae Valencia Lambayan', 'Roselyn Montecino Laure', 'Rosenia Nieves', 'Roxy Salveron Maquiling', 
  'Ryan Amoma Vios', 'Sajilli Renz Balucan Bacallo', 'Sandae Manaban Placer', 'Sanny Boy Erot Duran', 
  'Shan Mae Ragpa Gajegan', 'Shazia Jamil Pirzada', 'Sheena Estoconing Bugais', 'Shelamae Cadiz Bohol', 
  'Shella Mae Legarde Cagatin', 'Sky Sagario Gravador', 'Sylysdley Lasola Gutierrez', 
  'Thelma Evangelista Laurena', 'Trisha Mae Abayao Bianado', 'Valerie Ann Trasona Delicano', 
  'Vica Kay Esoy Verden', 'Victor Iligan Liu', 'Vincent Cafino Banlat', 'Vincent Jonas Gallendo', 
  'Vincent Paul Villa Malagar', 'Wilma Gaso Rodriguez', 'Wisdom K Patron Alama', 'Xyza Rae Alipio'
];

// --- Fuzzy Matcher ---
function resolveName(shortName, list) {
  if (!shortName) return null;
  const clean = shortName.replace('@', '').toLowerCase().trim();
  const parts = clean.split(' ').filter(p => p.length > 0);
  
  // Find name that contains all parts
  return list.find(full => {
    const fClean = full.toLowerCase();
    return parts.every(p => fClean.includes(p));
  });
}

// --- Rating Mapper ---
function mapRating(ratingStr) {
  const r = ratingStr.toLowerCase();
  if (r.includes('exceed')) return 100;
  if (r.includes('meets')) return 85;
  if (r.includes('needs')) return 60;
  return 80; // default
}

async function run() {
  const dataPath = path.join(__dirname, "data.json");
  if (!fs.existsSync(dataPath)) {
    console.error("Error: data.json not found in scripts/ folder.");
    console.log("Please create scripts/data.json with your Google Sheet data as an array of objects.");
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  console.log(`Processing ${rawData.length} observations...`);

  const formatted = rawData.map((row, index) => {
    const agent = resolveName(row.AgentName, AGENTS);
    const coach = resolveName(row.CoachName, COACHES);

    if (!agent || !coach) {
      console.warn(`Warning [Row ${index + 1}]: Could not resolve names. Agent: ${row.AgentName} -> ${agent}, Coach: ${row.CoachName} -> ${coach}`);
    }

    return {
      agentName: agent || row.AgentName,
      coachName: coach || row.CoachName,
      department: [row.LOB || "Sales"],
      date: row.Date || new Date().toISOString().split('T')[0],
      sessionType: [row.SessionType || "Remote Observation"],
      categories: [row.Categories || "Problem-Solving/Resolution"],
      strengths: row.Strengths,
      areasOfOpportunity: row.AreasOfOpportunity,
      rootCause: row.RootCauseIdentification,
      actionPlan: row.ActionPlan,
      overallRating: [row.OverallPerformanceRating || "Meets Expectations"],
      otherFeedback: row.OtherFeedback,
      orderNumber: row.OrderNumber,
      teamLeadFeedback: row.TeamLeadFeedback,
      rating: mapRating(row.OverallPerformanceRating || ""),
      observedBy: coach || "System Import",
    };
  });

  try {
    console.log("Pushing to Convex...");
    // We call the mutation using the internal name
    await client.mutation("observations:importBatch", { observations: formatted });
    console.log("Success! Data imported to production.");
  } catch (err) {
    console.error("Import failed:", err);
  }
}

run();
