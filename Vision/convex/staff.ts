import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { normalizeName, getNickname } from "./utils";

// ── Queries ──────────────────────────────────────────────────

/** Return every staff row (agent + coach + LOB). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("staff").collect();
  },
});

/** Get all unique coaches (name + LOB). */
export const listCoaches = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("staff").collect();
    const map = new Map<string, string>();
    for (const row of all) {
      if (!map.has(row.coachName)) map.set(row.coachName, row.lob);
    }
    return Array.from(map.entries()).map(([name, lob]) => ({ name, lob }));
  },
});

/** Get agents filtered by LOB. */
export const listByLob = query({
  args: { lob: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("by_lob", (q) => q.eq("lob", args.lob))
      .collect();
  },
});

// ── Mutations ────────────────────────────────────────────────

/** Seed the staff table with all agents/coaches/LOB data. */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("staff").first();
    if (existing) return "already_seeded";

    // Coach → LOB mapping
    const COACH_LOB: Record<string, string> = {
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
      'Jake Vergel Gonzales Cajes': 'Support',
    };

    // Agent → Coach mapping
    const AGENT_COACH: [string, string][] = [
      ['Abegail Lariosa Ingco', 'Chui Ling Villafuerte Goh'],
      ['Aiva Paquira Abalos', 'Xavier Bertril Nuico Cuerpo'],
      ['Alina Amaya Zelaya', 'Gazelle Broniola Bulalacao'],
      ['Alvin Cajipo Saguban', 'Zaira Mae Regino Kinol'],
      ['Alvin Portallo Gemira', 'Charbel Rado Mahinay'],
      ['Alyanna Juhl Soledad Aquino', 'Karl Jasper Lorejo Mag-usara'],
      ['Angel Reyes Guarin', 'Charbel Rado Mahinay'],
      ['Ann Kimberly Vidal Ablir', 'Erwin Verano'],
      ['Anne June Mariño Dumaldal', 'Kyla Serion'],
      ['Arcelie Macatunog Patula', 'May-Ann Alabata Montegrejo'],
      ['Archie Ferrolino Osa', 'Ma. Mikaela Lalamonan Barrera'],
      ['Argie Dialino Cayetano', 'Charbel Rado Mahinay'],
      ['Ariane Mae Tercio Ib-Ib', 'Chui Ling Villafuerte Goh'],
      ['Arlita Trinidad Calingacion', 'Joe Mari Torda Piñero'],
      ['Arzy Llemit', 'Joe Mari Torda Piñero'],
      ['Ashley Barrera Adalid', 'John Rey Aspacio Ortega'],
      ['Bello Isah Egano Habibulla', 'May-Ann Alabata Montegrejo'],
      ['Belmarie Manggon Zamora', 'Karl Jasper Lorejo Mag-usara'],
      ['Cesar Joseph Hernandez Unabia', 'May-Ann Alabata Montegrejo'],
      ['Charlyn Acabal Cambio', 'Ma. Mikaela Lalamonan Barrera'],
      ['Chiran Solamillo Tortogo Jr.', 'Xavier Bertril Nuico Cuerpo'],
      ['Christin Sanchez', 'Gazelle Broniola Bulalacao'],
      ['Christine Gywneth Naval Estomagulang', 'Irene Villarin Estravela'],
      ['Christofer Dumaran Perocho', 'Charbel Rado Mahinay'],
      ['Clint Ybonne Ronato Anadon', 'John Rey Aspacio Ortega'],
      ['Cris-Ann Ruado Relox', 'Shanne Juliet Credo Diputado'],
      ['Crystal Jycel Longno Beron', 'Shanne Juliet Credo Diputado'],
      ['Cyril Brondial Santos', 'Korina Kim Romeo Alcantara'],
      ['Darwin Levin Lope Data', 'Shanne Juliet Credo Diputado'],
      ['Daryll Tulod Bentulan', 'Maria Fatima Serrano Buenviaje'],
      ['Daven Paul Manlupig Dorimon', 'Korina Kim Romeo Alcantara'],
      ['Devielyn Kaye Diola Trangia', 'Elaine De Leon Roxas'],
      ['Dexter Dumaog Japay', 'Karl Jasper Lorejo Mag-usara'],
      ['Diana Sojor Solibio', 'Karl Jasper Lorejo Mag-usara'],
      ['Dinalyn Macasinag Villalon', 'John Rey Aspacio Ortega'],
      ['Dino Amiel Lojo Balaga', 'Maria Fatima Serrano Buenviaje'],
      ['Dominique Eurika Portada Katada', 'Xavier Bertril Nuico Cuerpo'],
      ['Donna Amores', 'Joenesse Vhem Laraya Bonghanoy'],
      ['Drea Timonan Surbito', 'Karl Jasper Lorejo Mag-usara'],
      ['Dwaynee Chan Benignos', 'Zaira Mae Regino Kinol'],
      ['Edeson Alabata Abo-Abo', 'John Rey Aspacio Ortega'],
      ['Edwin Zabala Dizon', 'Zaira Mae Regino Kinol'],
      ['Elenie Villaro Tito', 'Gazelle Broniola Bulalacao'],
      ['Emiliano Alexie Casaje San Pedro Jr.', 'Irene Villarin Estravela'],
      ['Eva Mae Gerardo Violeta', 'Karl Jasper Lorejo Mag-usara'],
      ['Farah Mae Lope Torres', 'Korina Kim Romeo Alcantara'],
      ['Felori Baguihon Siplao', 'Elaine De Leon Roxas'],
      ['Flora May Carcusia Cagampang', 'Ma. Mikaela Lalamonan Barrera'],
      ['Frances Bryle Millan Gelvoria', 'Korina Kim Romeo Alcantara'],
      ['Francose Marie Partosa Estrada', 'Irene Villarin Estravela'],
      ['Genilyn Bautista Aseñas', 'Jake Vergel Gonzales Cajes'],
      ['Gina Panaligan Bautista', 'Zaira Mae Regino Kinol'],
      ['Haissam Rohann Bocanegra Morton', 'John Rey Aspacio Ortega'],
      ['Heinz Harald Pagon Acson', 'Kyla Serion'],
      ['Honey Ege Radoc', 'Elaine De Leon Roxas'],
      ['Honeylen Landisa', 'Shanne Juliet Credo Diputado'],
      ['Irene Ann Cadallo Bahandi', 'Kyla Serion'],
      ['Irene Dagoy Rolandong', 'Korina Kim Romeo Alcantara'],
      ['Iris Mae Recaldo Timbal', 'Krizha Mae Gamalando Abia'],
      ['Ivan Allan Bungcasan', 'Kyla Serion'],
      ['Jade Marian Daarol Gabunilas', 'Zaira Mae Regino Kinol'],
      ['Jamaica Arranchado Veriña', 'Maria Fatima Serrano Buenviaje'],
      ['James Saycon Buagas', 'Karl Jasper Lorejo Mag-usara'],
      ['Jan August Delfin Villamor', 'May-Ann Alabata Montegrejo'],
      ['Jana Esperanza Sun Dalleda', 'Joenesse Vhem Laraya Bonghanoy'],
      ['Jared Xavierre Giron Manuel', 'Xavier Bertril Nuico Cuerpo'],
      ['Jay Mark Almonte Tuayon', 'Irene Villarin Estravela'],
      ['Jayrilyn Devero Alberto', 'Ma. Mikaela Lalamonan Barrera'],
      ['Jayson Saycon Caminos', 'Ma. Mikaela Lalamonan Barrera'],
      ['Jeff Cantina Dela Cruz', 'Maria Fatima Serrano Buenviaje'],
      ['Jefford Lu-Ang Algoso', 'Krizha Mae Gamalando Abia'],
      ['Jeizel Eringe Mapula', 'Erwin Verano'],
      ['Jeniefe Tubac Garcia', 'John Rey Aspacio Ortega'],
      ['Jenifer Alatan Balanay', 'Zaira Mae Regino Kinol'],
      ['Jerald Anqui Olasiman', 'Irene Villarin Estravela'],
      ['Jeremy Capalad Albina', 'Shanne Juliet Credo Diputado'],
      ['Jeremy Ruso Arnaiz', 'Zaira Mae Regino Kinol'],
      ['Jerome Makasilhig Olarte', 'Krizha Mae Gamalando Abia'],
      ['Jesmar Borromeo Maxino', 'Xavier Bertril Nuico Cuerpo'],
      ['Jessa Dee Silva Romero', 'Xavier Bertril Nuico Cuerpo'],
      ['Jessa Galve Amparado', 'Shanne Juliet Credo Diputado'],
      ['Jessa Kadusale Casido', 'Charbel Rado Mahinay'],
      ['Jesselaine Hinaut Siglos', 'Erwin Verano'],
      ['Jessica Causing Montecillo', 'Zaira Mae Regino Kinol'],
      ['Jessica Cuizon Catubig', 'Irene Villarin Estravela'],
      ['Jessuelle Zaira Patrimonio', 'Zaira Mae Regino Kinol'],
      ['Jimboy Tortusa Corciega', 'Kyla Serion'],
      ['Joan Catinggan', 'John Rey Aspacio Ortega'],
      ['Joann Torres Balasabas', 'Irene Villarin Estravela'],
      ['Johann Pabayos Aran', 'Gazelle Broniola Bulalacao'],
      ['John Christopher Ang Tismo', 'Karl Jasper Lorejo Mag-usara'],
      ['John Patrick Gutierrez Diaz', 'Elaine De Leon Roxas'],
      ['John Paul Jabas Romano', 'Kyla Serion'],
      ['John Philip Bulagao', 'John Rey Aspacio Ortega'],
      ['John Ric Carabaña Vallejos', 'Erwin Verano'],
      ['Johnnas Vidanes Morales', 'Korina Kim Romeo Alcantara'],
      ['Jolina Tinaytina Lopez', 'Kyla Serion'],
      ['Joriel Duran Elloren', 'Erwin Verano'],
      ['Jose Louise Varona Anda', 'Charbel Rado Mahinay'],
      ['Jose Yael Inocente', 'Zaira Mae Regino Kinol'],
      ['Josephine Belaro Olbes', 'Gazelle Broniola Bulalacao'],
      ['Jostuart Stanley Monsole Gunter', 'Erwin Verano'],
      ['June Solamillo Lucilla', 'Krizha Mae Gamalando Abia'],
      ['Karl Elmer Ii Cavite Piamonte', 'Gazelle Broniola Bulalacao'],
      ['Karla Louise Claud Ramos', 'Ma. Mikaela Lalamonan Barrera'],
      ['Kay Ann Apurado Quio', 'Charbel Rado Mahinay'],
      ['Kevin Berino Elumba', 'Erwin Verano'],
      ['Kimberly Anne Siquijor Garol', 'Chui Ling Villafuerte Goh'],
      ['Kimberly Nicole Lim Cachero', 'Xavier Bertril Nuico Cuerpo'],
      ['Kristine Garcia Ramos', 'Ma. Mikaela Lalamonan Barrera'],
      ['Kyla Saracia Abalos', 'John Rey Aspacio Ortega'],
      ['Kylle Elaine Econg Manninen', 'Irene Villarin Estravela'],
      ['Lenie Jane Tarog', 'John Rey Aspacio Ortega'],
      ['Lourdes Apple Calidguid Unajan', 'Chui Ling Villafuerte Goh'],
      ['Luther Maglinte Dalura', 'Krizha Mae Gamalando Abia'],
      ['Ma Reynaline Canseco Barona', 'Charbel Rado Mahinay'],
      ['Mae Jumawan Sasil', 'Charbel Rado Mahinay'],
      ['Maevel Cruz Umalza', 'Charbel Rado Mahinay'],
      ['Maricel Morquida', 'John Rey Aspacio Ortega'],
      ['Marichu Bornillo Acar', 'Chui Ling Villafuerte Goh'],
      ['Marion Jean Espero Vital', 'Xavier Bertril Nuico Cuerpo'],
      ['Marites Taburnal Agustin', 'Irene Villarin Estravela'],
      ['Marlo Villarin Labrador', 'Ma. Mikaela Lalamonan Barrera'],
      ['Marry Jen Villieta Catubig', 'John Rey Aspacio Ortega'],
      ['Marth Joseph Dayao Enopia', 'Erwin Verano'],
      ['Mary Caribelle Anne Miculob', 'Joe Mari Torda Piñero'],
      ['Mary Vella Paltinca', 'Joenesse Vhem Laraya Bonghanoy'],
      ['Meguela Angela Bisco Dagoy', 'Gazelle Broniola Bulalacao'],
      ['Melissa Tan Capulong', 'Gazelle Broniola Bulalacao'],
      ['Merbelyn Magbanua Mancia', 'Erwin Verano'],
      ['Michael Angelo Bisabis Taub', 'Xavier Bertril Nuico Cuerpo'],
      ['Michelle Guzman Plazos', 'Korina Kim Romeo Alcantara'],
      ['Michelle Zamora Ortiz', 'Xavier Bertril Nuico Cuerpo'],
      ['Mickel Arvin Lloyd Noay', 'Charbel Rado Mahinay'],
      ['Mitch Vianca Ferenal Bajenting', 'John Rey Aspacio Ortega'],
      ['Neil Brent Norico Barte', 'Karl Jasper Lorejo Mag-usara'],
      ['Nhova Kristy Catubig Venenoso', 'Chui Ling Villafuerte Goh'],
      ['Nica Diona Algadepe Segara', 'Ma. Mikaela Lalamonan Barrera'],
      ['Niño Kim Daniel Frutas Legaspi', 'Joe Mari Torda Piñero'],
      ['Noel John Callao Canoy', 'Ma. Mikaela Lalamonan Barrera'],
      ['Oliver Jr Gilhang Soriano', 'Krizha Mae Gamalando Abia'],
      ['Paul Vincent Dispe Valerio', 'Erwin Verano'],
      ['Precious Jewel Salazar', 'Shanne Juliet Credo Diputado'],
      ['Princess Shaine Mimis Asidera', 'Alyssa Sandel Reyes'],
      ['Rey Eufronio Laguitao Buagas', 'Karl Jasper Lorejo Mag-usara'],
      ['Reynold Abejero Mariño', 'John Rey Aspacio Ortega'],
      ['Reza Lindayao Lumjod', 'Krizha Mae Gamalando Abia'],
      ['Riza Venales Kilapkilap', 'Ma. Mikaela Lalamonan Barrera'],
      ['Rizza Jean Fernandez', 'Elaine De Leon Roxas'],
      ['Rolando Busbus Daohog', 'Alyssa Sandel Reyes'],
      ['Rona May Beatingo Astillar', 'Gazelle Broniola Bulalacao'],
      ['Rose Ann Laque Bangcat', 'Irene Villarin Estravela'],
      ['Rosean Mae Valencia Lambayan', 'Shanne Juliet Credo Diputado'],
      ['Roselyn Montecino Laure', 'Chui Ling Villafuerte Goh'],
      ['Rosenia Nieves', 'Joe Mari Torda Piñero'],
      ['Roxy Salveron Maquiling', 'Gazelle Broniola Bulalacao'],
      ['Ryan Amoma Vios', 'Joe Mari Torda Piñero'],
      ['Sajilli Renz Balucan Bacallo', 'Ma. Mikaela Lalamonan Barrera'],
      ['Sandae Manaban Placer', 'Gazelle Broniola Bulalacao'],
      ['Sanny Boy Erot Duran', 'Chui Ling Villafuerte Goh'],
      ['Shan Mae Ragpa Gajegan', 'Krizha Mae Gamalando Abia'],
      ['Shazia Jamil Pirzada', 'Zaira Mae Regino Kinol'],
      ['Sheena Estoconing Bugais', 'Shanne Juliet Credo Diputado'],
      ['Shelamae Cadiz Bohol', 'Irene Villarin Estravela'],
      ['Shella Mae Legarde Cagatin', 'Korina Kim Romeo Alcantara'],
      ['Sky Sagario Gravador', 'Krizha Mae Gamalando Abia'],
      ['Sylysdley Lasola Gutierrez', 'May-Ann Alabata Montegrejo'],
      ['Thelma Evangelista Laurena', 'Charbel Rado Mahinay'],
      ['Trisha Mae Abayao Bianado', 'Shanne Juliet Credo Diputado'],
      ['Valerie Ann Trasona Delicano', 'Krizha Mae Gamalando Abia'],
      ['Vica Kay Esoy Verden', 'Shanne Juliet Credo Diputado'],
      ['Victor Iligan Liu', 'Erwin Verano'],
      ['Vincent Cafino Banlat', 'Kyla Serion'],
      ['Vincent Jonas Gallendo', 'Kyla Serion'],
      ['Vincent Paul Villa Malagar', 'Korina Kim Romeo Alcantara'],
      ['Wilma Gaso Rodriguez', 'Erwin Verano'],
      ['Wisdom K Patron Alama', 'Charbel Rado Mahinay'],
      ['Xyza Rae Alipio', 'Jake Vergel Gonzales Cajes'],
    ];

    let count = 0;
    for (const [agentName, coachName] of AGENT_COACH) {
      const lob = COACH_LOB[coachName] || 'Support';
      const nickname = getNickname(agentName);
      await ctx.db.insert("staff", { agentName, nickname, coachName, lob });
      count++;
    }
    return `seeded_${count}`;
  },
});

/** Clear all staff data (for re-seeding). */
export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("staff").collect();
    for (const row of all) {
      await ctx.db.delete(row._id);
    }
    return `cleared_${all.length}`;
  },
});
/** Upsert a single staff member. */
export const sync = mutation({
  args: {
    agentName: v.string(),
    coachName: v.string(),
    lob: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = normalizeName(args.agentName);
    const coach = normalizeName(args.coachName);
    
    const existing = await ctx.db
      .query("staff")
      .withIndex("by_agent", (q) => q.eq("agentName", agent))
      .first();

    if (existing) {
      const nickname = getNickname(agent);
      await ctx.db.patch(existing._id, { coachName: coach, lob: args.lob, nickname });
      return existing._id;
    } else {
      const nickname = getNickname(agent);
      return await ctx.db.insert("staff", { agentName: agent, coachName: coach, lob: args.lob, nickname });
    }
  },
});

/** Batch sync from spreadsheet data. */
export const batchSync = internalMutation({
  args: {
    rows: v.array(v.object({
      agentName: v.string(),
      coachName: v.string(),
      lob: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    for (const row of args.rows) {
      const agent = normalizeName(row.agentName);
      const coach = normalizeName(row.coachName);
      
      const existing = await ctx.db
        .query("staff")
        .withIndex("by_agent", (q) => q.eq("agentName", agent))
        .first();

      if (existing) {
        const nickname = getNickname(agent);
        await ctx.db.patch(existing._id, { coachName: coach, lob: row.lob, nickname });
      } else {
        const nickname = getNickname(agent);
        await ctx.db.insert("staff", { agentName: agent, nickname, coachName: coach, lob: row.lob });
      }
    }
  },
});
/** One-time migration to fill nicknames for all staff. */
export const updateAllNicknames = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("staff").collect();
    let count = 0;
    for (const row of all) {
      const normalizedAgent = normalizeName(row.agentName);
      const normalizedCoach = normalizeName(row.coachName);
      const nickname = getNickname(normalizedAgent);
      
      if (row.agentName !== normalizedAgent || row.coachName !== normalizedCoach || row.nickname !== nickname) {
        await ctx.db.patch(row._id, { 
          agentName: normalizedAgent, 
          coachName: normalizedCoach,
          nickname 
        });
        count++;
      }
    }
    return `updated_${count}_records`;
  },
});
