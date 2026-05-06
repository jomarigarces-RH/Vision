"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Menu, LayoutDashboard, Users, UserCog, HandHeart, HelpCircle, 
  Settings, ChevronDown, Check, X, Bell, Edit3, Search, Calendar, Filter
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";

// --- Mock Data ---

// --- Data Mappings from References ---
const COACHES = [
  { name: 'Chui Ling Villafuerte Goh', dept: 'Sales' },
  { name: 'Xavier Bertril Nuico Cuerpo', dept: 'Specialty' },
  { name: 'Gazelle Broniola Bulalacao', dept: 'Support' },
  { name: 'Zaira Mae Regino Kinol', dept: 'Support' },
  { name: 'Charbel Rado Mahinay', dept: 'Support' },
  { name: 'Karl Jasper Lorejo Mag-usara', dept: 'Support' },
  { name: 'Erwin Verano', dept: 'Sales' },
  { name: 'Kyla Serion', dept: 'Sales' },
  { name: 'May-Ann Alabata Montegrejo', dept: 'Specialty' },
  { name: 'Ma. Mikaela Lalamonan Barrera', dept: 'Support' },
  { name: 'Joe Mari Torda Piñero', dept: 'Specialty' },
  { name: 'John Rey Aspacio Ortega', dept: 'Support' },
  { name: 'Korina Kim Romeo Alcantara', dept: 'Specialty' },
  { name: 'Elaine De Leon Roxas', dept: 'Specialty' },
  { name: 'Irene Villarin Estravela', dept: 'Support' },
  { name: 'Shanne Juliet Credo Diputado', dept: 'Support' },
  { name: 'Maria Fatima Serrano Buenviaje', dept: 'Specialty' },
  { name: 'Alyssa Sandel Reyes', dept: 'Specialty' },
  { name: 'Joenesse Vhem Laraya Bonghanoy', dept: 'Sales' },
  { name: 'Krishia May Capuyan Saldivar', dept: 'Specialty' },
];

const AGENTS = [
  { name: 'Abegail Lariosa Ingco', coach: 'Chui Ling Villafuerte Goh' },
  { name: 'Aiva Paquira Abalos', coach: 'Xavier Bertril Nuico Cuerpo' },
  { name: 'Alina Amaya Zelaya', coach: 'Gazelle Broniola Bulalacao' },
  { name: 'Alvin Cajipo Saguban', coach: 'Zaira Mae Regino Kinol' },
  { name: 'Alvin Portallo Gemira', coach: 'Charbel Rado Mahinay' },
  { name: 'Alyanna Juhl Soledad Aquino', coach: 'Karl Jasper Lorejo Mag-usara' },
  { name: 'Angel Reyes Guarin', coach: 'Charbel Rado Mahinay' },
  { name: 'Ann Kimberly Vidal Ablir', coach: 'Erwin Verano' },
  { name: 'Anne June Mariño Dumaldal', coach: 'Kyla Serion' },
  { name: 'Arcelie Macatunog Patula', coach: 'May-Ann Alabata Montegrejo' },
  { name: 'Archie Ferrolino Osa', coach: 'Ma. Mikaela Lalamonan Barrera' },
  { name: 'Argie Dialino Cayetano', coach: 'Charbel Rado Mahinay' },
  { name: 'Ariane Mae Tercio Ib-Ib', coach: 'Chui Ling Villafuerte Goh' },
  { name: 'Arlita Trinidad Calingacion', coach: 'Joe Mari Torda Piñero' },
  { name: 'Arzy Llemit', coach: 'Joe Mari Torda Piñero' },
  { name: 'Ashley Barrera Adalid', coach: 'John Rey Aspacio Ortega' },
  { name: 'Bello Isah Egano Habibulla', coach: 'May-Ann Alabata Montegrejo' },
  { name: 'Belmarie Manggon Zamora', coach: 'Karl Jasper Lorejo Mag-usara' },
  { name: 'Cesar Joseph Hernandez Unabia', coach: 'May-Ann Alabata Montegrejo' },
  { name: 'Charlyn Acabal Cambio', coach: 'Ma. Mikaela Lalamonan Barrera' },
  { name: 'Chiran Solamillo Tortogo Jr.', coach: 'Xavier Bertril Nuico Cuerpo' },
  { name: 'Christin Sanchez', coach: 'Gazelle Broniola Bulalacao' },
  { name: 'Christine Gywneth Naval Estomagulang', coach: 'Irene Villarin Estravela' },
  { name: 'Christofer Dumaran Perocho', coach: 'Charbel Rado Mahinay' },
  { name: 'Clint Ybonne Ronato Anadon', coach: 'John Rey Aspacio Ortega' },
  { name: 'Cris-Ann Ruado Relox', coach: 'Shanne Juliet Credo Diputado' },
  { name: 'Crystal Jycel Longno Beron', coach: 'Shanne Juliet Credo Diputado' },
  { name: 'Cyril Brondial Santos', coach: 'Korina Kim Romeo Alcantara' },
  { name: 'Darwin Levin Lope Data', coach: 'Shanne Juliet Credo Diputado' },
  { name: 'Daryll Tulod Bentulan', coach: 'Maria Fatima Serrano Buenviaje' },
  { name: 'Daven Paul Manlupig Dorimon', coach: 'Korina Kim Romeo Alcantara' },
  { name: 'Devielyn Kaye Diola Trangia', coach: 'Elaine De Leon Roxas' },
  { name: 'Dexter Dumaog Japay', coach: 'Karl Jasper Lorejo Mag-usara' },
  { name: 'Diana Sojor Solibio', coach: 'Karl Jasper Lorejo Mag-usara' },
  { name: 'Dinalyn Macasinag Villalon', coach: 'John Rey Aspacio Ortega' },
  { name: 'Dino Amiel Lojo Balaga', coach: 'Maria Fatima Serrano Buenviaje' },
  { name: 'Dominique Eurika Portada Katada', coach: 'Xavier Bertril Nuico Cuerpo' },
  { name: 'Donna Amores', coach: 'Joenesse Vhem Laraya Bonghanoy' },
  { name: 'Drea Timonan Surbito', coach: 'Karl Jasper Lorejo Mag-usara' },
  { name: 'Dwaynee Chan Benignos', coach: 'Zaira Mae Regino Kinol' },
  { name: 'Edeson Alabata Abo-Abo', coach: 'John Rey Aspacio Ortega' },
  { name: 'Edwin Zabala Dizon', coach: 'Zaira Mae Regino Kinol' },
  { name: 'Elenie Villaro Tito', coach: 'Gazelle Broniola Bulalacao' },
  { name: 'Emiliano Alexie Casaje San Pedro Jr.', coach: 'Irene Villarin Estravela' },
  { name: 'Eva Mae Gerardo Violeta', coach: 'Karl Jasper Lorejo Mag-usara' },
  { name: 'Farah Mae Lope Torres', coach: 'Korina Kim Romeo Alcantara' },
  { name: 'Felori Baguihon Siplao', coach: 'Elaine De Leon Roxas' },
  { name: 'Flora May Carcusia Cagampang', coach: 'Ma. Mikaela Lalamonan Barrera' },
  { name: 'Frances Bryle Millan Gelvoria', coach: 'Korina Kim Romeo Alcantara' },
  { name: 'Francose Marie Partosa Estrada', coach: 'Irene Villarin Estravela' },
  { name: 'Genilyn Bautista Aseñas', coach: 'Jake Vergel Gonzales Cajes' },
  { name: 'Gina Panaligan Bautista', coach: 'Zaira Mae Regino Kinol' },
  { name: 'Haissam Rohann Bocanegra Morton', coach: 'John Rey Aspacio Ortega' },
  { name: 'Heinz Harald Pagon Acson', coach: 'Kyla Serion' },
  { name: 'Honey Ege Radoc', coach: 'Elaine De Leon Roxas' },
  { name: 'Honeylen Landisa', coach: 'Shanne Juliet Credo Diputado' },
  { name: 'Irene Ann Cadallo Bahandi', coach: 'Kyla Serion' },
  { name: 'Irene Dagoy Rolandong', coach: 'Korina Kim Romeo Alcantara' },
  { name: 'Iris Mae Recaldo Timbal', coach: 'Krizha Mae Gamalando Abia' },
  { name: 'Ivan Allan Bungcasan', coach: 'Kyla Serion' },
  { name: 'Jade Marian Daarol Gabunilas', coach: 'Zaira Mae Regino Kinol' },
  { name: 'Jamaica Arranchado Veriña', coach: 'Maria Fatima Serrano Buenviaje' },
  { name: 'James Saycon Buagas', coach: 'Karl Jasper Lorejo Mag-usara' },
  { name: 'Jan August Delfin Villamor', coach: 'May-Ann Alabata Montegrejo' },
  { name: 'Jana Esperanza Sun Dalleda', coach: 'Joenesse Vhem Laraya Bonghanoy' },
  { name: 'Jared Xavierre Giron Manuel', coach: 'Xavier Bertril Nuico Cuerpo' },
  { name: 'Jay Mark Almonte Tuayon', coach: 'Irene Villarin Estravela' },
  { name: 'Jayrilyn Devero Alberto', coach: 'Ma. Mikaela Lalamonan Barrera' },
  { name: 'Jayson Saycon Caminos', coach: 'Ma. Mikaela Lalamonan Barrera' },
  { name: 'Jeff Cantina Dela Cruz', coach: 'Maria Fatima Serrano Buenviaje' },
  { name: 'Jefford Lu-Ang Algoso', coach: 'Krizha Mae Gamalando Abia' },
  { name: 'Jeizel Eringe Mapula', coach: 'Erwin Verano' },
  { name: 'Jeniefe Tubac Garcia', coach: 'John Rey Aspacio Ortega' },
  { name: 'Jenifer Alatan Balanay', coach: 'Zaira Mae Regino Kinol' },
  { name: 'Jerald Anqui Olasiman', coach: 'Irene Villarin Estravela' },
  { name: 'Jeremy Capalad Albina', coach: 'Shanne Juliet Credo Diputado' },
  { name: 'Jeremy Ruso Arnaiz', coach: 'Zaira Mae Regino Kinol' },
  { name: 'Jerome Makasilhig Olarte', coach: 'Krizha Mae Gamalando Abia' },
  { name: 'Jesmar Borromeo Maxino', coach: 'Xavier Bertril Nuico Cuerpo' },
  { name: 'Jessa Dee Silva Romero', coach: 'Xavier Bertril Nuico Cuerpo' },
  { name: 'Jessa Galve Amparado', coach: 'Shanne Juliet Credo Diputado' },
  { name: 'Jessa Kadusale Casido', coach: 'Charbel Rado Mahinay' },
  { name: 'Jesselaine Hinaut Siglos', coach: 'Erwin Verano' },
  { name: 'Jessica Causing Montecillo', coach: 'Zaira Mae Regino Kinol' },
  { name: 'Jessica Cuizon Catubig', coach: 'Irene Villarin Estravela' },
  { name: 'Jessuelle Zaira Patrimonio', coach: 'Zaira Mae Regino Kinol' },
  { name: 'Jimboy Tortusa Corciega', coach: 'Kyla Serion' },
  { name: 'Joan Catinggan', coach: 'John Rey Aspacio Ortega' },
  { name: 'Joann Torres Balasabas', coach: 'Irene Villarin Estravela' },
  { name: 'Johann Pabayos Aran', coach: 'Gazelle Broniola Bulalacao' },
  { name: 'John Christopher Ang Tismo', coach: 'Karl Jasper Lorejo Mag-usara' },
  { name: 'John Patrick Gutierrez Diaz', coach: 'Elaine De Leon Roxas' },
  { name: 'John Paul Jabas Romano', coach: 'Kyla Serion' },
  { name: 'John Philip Bulagao', coach: 'John Rey Aspacio Ortega' },
  { name: 'John Ric Carabaña Vallejos', coach: 'Erwin Verano' },
  { name: 'Johnnas Vidanes Morales', coach: 'Korina Kim Romeo Alcantara' },
  { name: 'Jolina Tinaytina Lopez', coach: 'Kyla Serion' },
  { name: 'Joriel Duran Elloren', coach: 'Erwin Verano' },
  { name: 'Jose Louise Varona Anda', coach: 'Charbel Rado Mahinay' },
  { name: 'Jose Yael Inocente', coach: 'Zaira Mae Regino Kinol' },
  { name: 'Josephine Belaro Olbes', coach: 'Gazelle Broniola Bulalacao' },
  { name: 'Jostuart Stanley Monsole Gunter', coach: 'Erwin Verano' },
  { name: 'June Solamillo Lucilla', coach: 'Krizha Mae Gamalando Abia' },
  { name: 'Karl Elmer Ii Cavite Piamonte', coach: 'Gazelle Broniola Bulalacao' },
  { name: 'Karla Louise Claud Ramos', coach: 'Ma. Mikaela Lalamonan Barrera' },
  { name: 'Kay Ann Apurado Quio', coach: 'Charbel Rado Mahinay' },
  { name: 'Kevin Berino Elumba', coach: 'Erwin Verano' },
  { name: 'Kimberly Anne Siquijor Garol', coach: 'Chui Ling Villafuerte Goh' },
  { name: 'Kimberly Nicole Lim Cachero', coach: 'Xavier Bertril Nuico Cuerpo' },
  { name: 'Kristine Garcia Ramos', coach: 'Ma. Mikaela Lalamonan Barrera' },
  { name: 'Kyla Saracia Abalos', coach: 'John Rey Aspacio Ortega' },
  { name: 'Kylle Elaine Econg Manninen', coach: 'Irene Villarin Estravela' },
  { name: 'Lenie Jane Tarog', coach: 'John Rey Aspacio Ortega' },
  { name: 'Lourdes Apple Calidguid Unajan', coach: 'Chui Ling Villafuerte Goh' },
  { name: 'Luther Maglinte Dalura', coach: 'Krizha Mae Gamalando Abia' },
  { name: 'Ma Reynaline Canseco Barona', coach: 'Charbel Rado Mahinay' },
  { name: 'Mae Jumawan Sasil', coach: 'Charbel Rado Mahinay' },
  { name: 'Maevel Cruz Umalza', coach: 'Charbel Rado Mahinay' },
  { name: 'Maricel Morquida', coach: 'John Rey Aspacio Ortega' },
  { name: 'Marichu Bornillo Acar', coach: 'Chui Ling Villafuerte Goh' },
  { name: 'Marion Jean Espero Vital', coach: 'Xavier Bertril Nuico Cuerpo' },
  { name: 'Marites Taburnal Agustin', coach: 'Irene Villarin Estravela' },
  { name: 'Marlo Villarin Labrador', coach: 'Ma. Mikaela Lalamonan Barrera' },
  { name: 'Marry Jen Villieta Catubig', coach: 'John Rey Aspacio Ortega' },
  { name: 'Marth Joseph Dayao Enopia', coach: 'Erwin Verano' },
  { name: 'Mary Caribelle Anne Miculob', coach: 'Joe Mari Torda Piñero' },
  { name: 'Mary Vella Paltinca', coach: 'Joenesse Vhem Laraya Bonghanoy' },
  { name: 'Meguela Angela Bisco Dagoy', coach: 'Gazelle Broniola Bulalacao' },
  { name: 'Melissa Tan Capulong', coach: 'Gazelle Broniola Bulalacao' },
  { name: 'Merbelyn Magbanua Mancia', coach: 'Erwin Verano' },
  { name: 'Michael Angelo Bisabis Taub', coach: 'Xavier Bertril Nuico Cuerpo' },
  { name: 'Michelle Guzman Plazos', coach: 'Korina Kim Romeo Alcantara' },
  { name: 'Michelle Zamora Ortiz', coach: 'Xavier Bertril Nuico Cuerpo' },
  { name: 'Mickel Arvin Lloyd Noay', coach: 'Charbel Rado Mahinay' },
  { name: 'Mitch Vianca Ferenal Bajenting', coach: 'John Rey Aspacio Ortega' },
  { name: 'Neil Brent Norico Barte', coach: 'Karl Jasper Lorejo Mag-usara' },
  { name: 'Nhova Kristy Catubig Venenoso', coach: 'Chui Ling Villafuerte Goh' },
  { name: 'Nica Diona Algadepe Segara', coach: 'Ma. Mikaela Lalamonan Barrera' },
  { name: 'Niño Kim Daniel Frutas Legaspi', coach: 'Joe Mari Torda Piñero' },
  { name: 'Noel John Callao Canoy', coach: 'Ma. Mikaela Lalamonan Barrera' },
  { name: 'Oliver Jr Gilhang Soriano', coach: 'Krizha Mae Gamalando Abia' },
  { name: 'Paul Vincent Dispe Valerio', coach: 'Erwin Verano' },
  { name: 'Precious Jewel Salazar', coach: 'Shanne Juliet Credo Diputado' },
  { name: 'Princess Shaine Mimis Asidera', coach: 'Alyssa Sandel Reyes' },
  { name: 'Rey Eufronio Laguitao Buagas', coach: 'Karl Jasper Lorejo Mag-usara' },
  { name: 'Reynold Abejero Mariño', coach: 'John Rey Aspacio Ortega' },
  { name: 'Reza Lindayao Lumjod', coach: 'Krizha Mae Gamalando Abia' },
  { name: 'Riza Venales Kilapkilap', coach: 'Ma. Mikaela Lalamonan Barrera' },
  { name: 'Rizza Jean Fernandez', coach: 'Elaine De Leon Roxas' },
  { name: 'Rolando Busbus Daohog', coach: 'Alyssa Sandel Reyes' },
  { name: 'Rona May Beatingo Astillar', coach: 'Gazelle Broniola Bulalacao' },
  { name: 'Rose Ann Laque Bangcat', coach: 'Irene Villarin Estravela' },
  { name: 'Rosean Mae Valencia Lambayan', coach: 'Shanne Juliet Credo Diputado' },
  { name: 'Roselyn Montecino Laure', coach: 'Chui Ling Villafuerte Goh' },
  { name: 'Rosenia Nieves', coach: 'Joe Mari Torda Piñero' },
  { name: 'Roxy Salveron Maquiling', coach: 'Gazelle Broniola Bulalacao' },
  { name: 'Ryan Amoma Vios', coach: 'Joe Mari Torda Piñero' },
  { name: 'Sajilli Renz Balucan Bacallo', coach: 'Ma. Mikaela Lalamonan Barrera' },
  { name: 'Sandae Manaban Placer', coach: 'Gazelle Broniola Bulalacao' },
  { name: 'Sanny Boy Erot Duran', coach: 'Chui Ling Villafuerte Goh' },
  { name: 'Shan Mae Ragpa Gajegan', coach: 'Krizha Mae Gamalando Abia' },
  { name: 'Shazia Jamil Pirzada', coach: 'Zaira Mae Regino Kinol' },
  { name: 'Sheena Estoconing Bugais', coach: 'Shanne Juliet Credo Diputado' },
  { name: 'Shelamae Cadiz Bohol', coach: 'Irene Villarin Estravela' },
  { name: 'Shella Mae Legarde Cagatin', coach: 'Korina Kim Romeo Alcantara' },
  { name: 'Sky Sagario Gravador', coach: 'Krizha Mae Gamalando Abia' },
  { name: 'Sylysdley Lasola Gutierrez', coach: 'May-Ann Alabata Montegrejo' },
  { name: 'Thelma Evangelista Laurena', coach: 'Charbel Rado Mahinay' },
  { name: 'Trisha Mae Abayao Bianado', coach: 'Shanne Juliet Credo Diputado' },
  { name: 'Valerie Ann Trasona Delicano', coach: 'Krizha Mae Gamalando Abia' },
  { name: 'Vica Kay Esoy Verden', coach: 'Shanne Juliet Credo Diputado' },
  { name: 'Victor Iligan Liu', coach: 'Erwin Verano' },
  { name: 'Vincent Cafino Banlat', coach: 'Kyla Serion' },
  { name: 'Vincent Jonas Gallendo', coach: 'Kyla Serion' },
  { name: 'Vincent Paul Villa Malagar', coach: 'Korina Kim Romeo Alcantara' },
  { name: 'Wilma Gaso Rodriguez', coach: 'Erwin Verano' },
  { name: 'Wisdom K Patron Alama', coach: 'Charbel Rado Mahinay' },
  { name: 'Xyza Rae Alipio', coach: 'Jake Vergel Gonzales Cajes' },
];

const staffData = COACHES.map(c => ({
  name: c.name,
  desc: `${c.dept} Department Coach`,
  pct: (Math.random() * 2 + 1).toFixed(2) + '%',
  meta: c.dept
}));

const barData1 = [
  { name: 'Jan', val: 35 }, { name: 'Feb', val: 50 }, { name: 'Mar', val: 28 },
  { name: 'Apr', val: 45 }, { name: 'May', val: 60 }, { name: 'Jun', val: 42 },
  { name: 'Jul', val: 55 }, { name: 'Aug', val: 48 }
];

const barData2 = [
  { name: 'Line 1', val: 20 }, { name: 'Line 2', val: 45 }, { name: 'Line Agents', val: 30 },
  { name: 'Score Incl', val: 60 }, { name: 'Total Score', val: 80 }
];

const lineData = [
  { name: '1', val: 20 }, { name: '2', val: 45 }, { name: '3', val: 35 },
  { name: '4', val: 70 }, { name: '5', val: 55 }, { name: '6', val: 80 }
];

const donutData1 = [
  { name: 'A', value: 35, color: '#4F7DF3' },
  { name: 'B', value: 40, color: '#1E3A6E' },
  { name: 'C', value: 25, color: '#F97316' },
];

const donutData2 = [
  { name: 'A', value: 30, color: '#4F7DF3' },
  { name: 'B', value: 35, color: '#1E3A6E' },
  { name: 'C', value: 20, color: '#F97316' },
  { name: 'D', value: 15, color: '#10B981' },
];

// --- Helpers ---
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = ['#4F7DF3','#F59E0B','#10B981','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#14B8A6','#6366F1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getMondayEST() {
  // Get current date in New York (EST/EDT)
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  // Base date object in EST
  const estDate = new Date(`${year}-${month}-${day}T00:00:00`);
  
  // Sunday is 0, Monday is 1, ...
  const dayOfWeek = estDate.getDay();
  // If today is Sunday (0), we go back 6 days. If Monday (1), 0 days.
  const diff = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  
  const monday = new Date(estDate);
  monday.setDate(estDate.getDate() - diff);
  
  // Format as YYYY-MM-DD
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedDept, setSelectedDept] = useState<string>('Sales');
  const [modalOpen, setModalOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [coachModalOpen, setCoachModalOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [dateFilterModalOpen, setDateFilterModalOpen] = useState(false);
  const [filterSinceDate, setFilterSinceDate] = useState(getMondayEST());

  // Convex: fetch observed agents from database (Reset every Monday EST)
  const observedAgentsList = useQuery(api.observations.getObservedAgents, { sinceDate: filterSinceDate }) ?? [];
  const observedAgents = useMemo(() => new Set(observedAgentsList), [observedAgentsList]);
  const createObservation = useMutation(api.observations.create);

  // Search Logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: any[] = [];

    // Search Departments
    ['Sales', 'Support', 'Specialty'].forEach(dept => {
      if (dept.toLowerCase().includes(q)) {
        results.push({ type: 'dept', name: dept, path: dept, value: dept });
      }
    });

    // Search Coaches
    COACHES.forEach(coach => {
      if (coach.name.toLowerCase().includes(q) || coach.dept.toLowerCase().includes(q)) {
        results.push({ type: 'coach', name: coach.name, path: `${coach.dept} > ${coach.name}`, value: coach.name, dept: coach.dept });
      }
    });

    // Search Agents
    AGENTS.forEach(agent => {
      const coach = COACHES.find(c => c.name === agent.coach);
      if (agent.name.toLowerCase().includes(q) || agent.coach.toLowerCase().includes(q)) {
        results.push({ type: 'agent', name: agent.name, path: `${coach?.dept} > ${agent.coach} > ${agent.name}`, value: agent.name });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery]);

  const handleSearchResultClick = (result: any) => {
    setSearchQuery("");
    setShowSearchDropdown(false);
    if (result.type === 'dept') {
      setSelectedDept(result.value);
      setActiveView('agents');
    } else if (result.type === 'coach') {
      setSelectedCoach(result.value);
      setCoachModalOpen(true);
      setActiveView('coaches');
    } else if (result.type === 'agent') {
      openObservationModal(result.value);
    }
  };

  // Derive agents by department (agent → coach → coach's LOB)
  const getAgentsByDept = (dept: string) => 
    AGENTS.filter(a => {
      const coach = COACHES.find(c => c.name === a.coach);
      return coach?.dept === dept;
    });

  const getAgentsForCoach = (coachName: string) => AGENTS.filter(a => a.coach === coachName);
  
  const getCoachCompletionRate = (coachName: string) => {
    const agents = getAgentsForCoach(coachName);
    if (agents.length === 0) return 0;
    const observed = agents.filter(a => observedAgents.has(a.name)).length;
    return Math.round((observed / agents.length) * 100);
  };

  // Filter and Data Helpers
  const getCoachDept = (coachName: string) => COACHES.find(c => c.name === coachName)?.dept || 'Other';
  const getAgentCoach = (agentName: string) => AGENTS.find(a => a.name === agentName)?.coach || 'None';
  
  const coachesData = COACHES.slice(0, 3).map(c => ({
    name: c.name,
    desc: `${c.dept} Department Coach`,
    badge: '09',
    badgeColor: c.dept === 'Sales' ? 'bg-brand-blue text-white' : 'bg-accent-red text-white'
  }));

  const assignedAgentsData = AGENTS.slice(0, 4).map(a => ({
    name: a.name,
    desc: `Coach: ${a.coach}`,
    badge: '09',
    badgeColor: getCoachDept(a.coach) === 'Sales' ? 'bg-brand-blue text-white' : 'bg-accent-red text-white'
  }));

  // Form State
  const [formData, setFormData] = useState({
    department: [] as string[],
    otherDepartment: '',
    date: new Date().toISOString().split('T')[0],
    coachName: 'Jake Cajes', // Example default
    sessionType: [] as string[],
    categories: [] as string[],
    otherCategory: '',
    strengths: '',
    areasOfOpportunity: '',
    rootCause: '',
    actionPlan: '',
    overallRating: [] as string[],
    otherFeedback: '',
    orderNumber: '',
    teamLeadFeedback: ''
  });

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeRichTextField, setActiveRichTextField] = useState<keyof typeof formData | null>(null);
  const [observationText, setObservationText] = useState("");

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarCollapsed(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const openObservationModal = (name: string) => {
    setSelectedAgent(name);
    // Reset form with automated fields
    setFormData(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0],
      coachName: 'JG (Current User)', 
      agentName: name,
      department: [],
      otherDepartment: '',
      sessionType: [],
      categories: [],
      otherCategory: '',
      overallRating: []
    }));
    setModalOpen(true);
  };

  const closeModals = () => {
    setModalOpen(false);
    setRatingModalOpen(false);
  };

  const proceedToRating = () => {
    setModalOpen(false);
    setRatingModalOpen(true);
  };

  const openRichTextEditor = (fieldId: keyof typeof formData) => {
    const value = formData[fieldId];
    if (typeof value === 'string') {
      setActiveRichTextField(fieldId);
      setObservationText(value);
      setEditModalOpen(true);
    }
  };

  const saveRichText = () => {
    if (activeRichTextField && typeof formData[activeRichTextField] === 'string') {
      setFormData(prev => ({ ...prev, [activeRichTextField]: observationText }));
    }
    setEditModalOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-body)] font-sans text-[var(--text-primary)] relative">
      
      {/* Mobile Sidebar Overlay */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside 
        className={`bg-white border-r border-[var(--border-light)] flex flex-col transition-all duration-300 z-30 shadow-[var(--shadow-sm)] h-full
          absolute md:relative
          ${sidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-[72px]' : 'translate-x-0 w-[260px]'}`}
      >
        <div className="p-5 flex justify-center items-center">
          <div className={`bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-10 h-10 p-1' : 'w-[60px] h-[66px] p-1.5'}`}>
            <svg width={sidebarCollapsed ? "24" : "36"} height={sidebarCollapsed ? "28" : "44"} viewBox="0 0 120 148" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8 L12 100 L30 100 L30 68 L58 68 L78 100 L98 100 L74 64 C88 58 96 46 96 32 C96 14 82 8 62 8 Z M30 24 L58 24 C72 24 78 28 78 38 C78 48 72 54 58 54 L30 54 Z" fill="#1E293B"/>
              {(!sidebarCollapsed || isMobile) && <text x="60" y="132" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="22" letterSpacing="3" fill="#1E293B">RESIDENT</text>}
            </svg>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            collapsed={sidebarCollapsed} 
            active={activeView === "dashboard"}
            onClick={() => setActiveView("dashboard")}
          />

          <div className="my-1">
            <div 
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-[var(--text-secondary)] font-medium hover:bg-slate-50 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
              onClick={() => {
                if (sidebarCollapsed) {
                  setSidebarCollapsed(false);
                  setTimeout(() => setAgentsOpen(true), 300);
                } else {
                  setAgentsOpen(!agentsOpen);
                }
              }}
              title={sidebarCollapsed ? "Agents" : ""}
            >
              <div className="flex items-center gap-3">
                <Users size={20} />
                {!sidebarCollapsed && <span>Agents</span>}
              </div>
              {!sidebarCollapsed && (
                <ChevronDown size={16} className={`transition-transform duration-200 ${agentsOpen ? 'rotate-180' : ''}`} />
              )}
            </div>
            
            {/* Submenu */}
            <div className={`overflow-hidden transition-all duration-300 ${!sidebarCollapsed && agentsOpen ? 'max-h-[200px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
              <div className="pl-4 pr-3 flex flex-col gap-0.5 border-l-2 border-slate-100 ml-5 py-1">
                {['Sales', 'Support', 'Specialty'].map(dept => {
                  const deptAgents = getAgentsByDept(dept);
                  const isActive = activeView === 'agents' && selectedDept === dept;
                  return (
                    <div 
                      key={dept}
                      className={`px-3 py-2 text-[13px] font-medium cursor-pointer rounded-md transition-colors flex items-center justify-between
                        ${isActive ? 'bg-brand-blue-light text-brand-blue font-semibold' : 'text-[var(--text-secondary)] hover:bg-slate-50 hover:text-[var(--brand-blue)]'}`}
                      onClick={() => { setSelectedDept(dept); setActiveView('agents'); }}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          dept === 'Sales' ? 'bg-blue-500' : dept === 'Support' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        {dept}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">{deptAgents.length}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <NavItem 
            icon={<UserCog size={20} />} 
            label="Coaches" 
            collapsed={sidebarCollapsed} 
            active={activeView === "coaches"}
            onClick={() => setActiveView("coaches")}
          />
        </nav>

        <div className="p-3 border-t border-[var(--border-light)] flex flex-col gap-1">
          <NavItem icon={<HandHeart size={20} />} label="Support" collapsed={sidebarCollapsed} />
          <NavItem icon={<HelpCircle size={20} />} label="Help" collapsed={sidebarCollapsed} />
          <NavItem icon={<Settings size={20} />} label="Settings" collapsed={sidebarCollapsed} />
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* HEADER */}
        <header className="h-[72px] bg-white border-b border-[var(--border-light)] flex items-center justify-between px-3 sm:px-6 shrink-0 z-10 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center truncate">
              <span className="hidden sm:inline">Resident Home</span>
              <span className="sm:hidden">Resident</span>
              <span className="text-[var(--text-tertiary)] font-medium mx-1 sm:mx-2">|</span> 
              <span className="truncate">Vision</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6 flex-1 max-w-2xl px-4 sm:px-8">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400 group-focus-within:text-brand-blue transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Search agents, coaches, or departments..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
                onFocus={() => setShowSearchDropdown(true)}
              />
              
              {/* Search Results Dropdown */}
              {showSearchDropdown && searchResults.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSearchDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[400px] overflow-y-auto p-2">
                      {searchResults.map((result, i) => (
                        <div 
                          key={i}
                          onClick={() => handleSearchResultClick(result)}
                          className="p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border-b last:border-0 border-slate-50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-800">{result.name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              result.type === 'dept' ? 'bg-blue-50 text-blue-600' : result.type === 'coach' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>{result.type}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{result.path}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button 
              onClick={() => setDateFilterModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Calendar size={18} className="text-brand-blue" />
              <span className="hidden sm:inline">
                {filterSinceDate === getMondayEST() ? 'Current Week' : `From ${filterSinceDate}`}
              </span>
              <Filter size={14} className="text-slate-400" />
            </button>
            
            <div className="hidden sm:block h-8 w-[1px] bg-slate-200"></div>
            
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors shrink-0">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-brand-blue to-indigo-400 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm cursor-pointer shrink-0">
              JG
            </div>
          </div>
        </header>

        {/* SCROLLABLE VIEW AREA */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          
          {/* VIEW: DASHBOARD */}
          {activeView === "dashboard" && (
            <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Column 1 */}
                <div className="flex flex-col gap-6">
                  {/* Card: Coaching Activity */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg">Staff Coaching Activity</h2>
                      <button className="text-slate-400 hover:text-slate-600"><Menu size={16} /></button>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData1}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                          <Bar dataKey="val" fill="#4F7DF3" radius={[4, 4, 0, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card: Absenteeism */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg">Absenteeism</h2>
                      <button className="text-slate-400 hover:text-slate-600"><Menu size={16} /></button>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData2}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                          <Bar dataKey="val" fill="#10B981" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card: Recent Coaches */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg">Recent Coaches</h2>
                      <span className="text-xs font-semibold text-brand-blue bg-brand-blue-light px-2.5 py-1 rounded-full">View All</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {coachesData.map((coach, i) => (
                        <AgentRow key={i} coach={coach} idx={i} onClick={() => openObservationModal(coach.name)} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="flex flex-col gap-6">
                  {/* Card: Observation Scores */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-lg">Observation Scores</h2>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Monthly</span>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                          <Line type="monotone" dataKey="val" stroke="#4F7DF3" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card: Mastered Observability */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <h2 className="font-bold text-lg mb-2">Mastered Observability</h2>
                    <div className="h-[200px] w-full flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData1} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                            {donutData1.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-slate-800">75%</span>
                        <span className="text-xs text-slate-500">Mastery</span>
                      </div>
                    </div>
                  </div>

                  {/* Card: Assigned Agents */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <h2 className="font-bold text-lg mb-4">Assigned Agents</h2>
                    <div className="flex flex-col gap-3">
                      {assignedAgentsData.map((agent, i) => (
                        <AgentRow key={i} coach={agent} idx={i+3} onClick={() => openObservationModal(agent.name)} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="flex flex-col gap-6">
                  {/* Card: Compliance Analytics */}
                  <div className="bg-[var(--text-primary)] text-white rounded-2xl p-5 shadow-[var(--shadow-md)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="flex justify-between items-center mb-4 relative z-10">
                      <h2 className="font-bold text-lg">Compliance Analytics</h2>
                    </div>
                    <div className="h-[200px] w-full relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                          <Line type="monotone" dataKey="val" stroke="#10B981" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#1E293B', stroke: '#10B981'}} />
                          <Tooltip contentStyle={{backgroundColor: '#1E293B', borderColor: '#334155', color: '#fff', borderRadius: '8px'}} itemStyle={{color: '#fff'}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card: Completion Scores */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <h2 className="font-bold text-lg mb-2">Completion Scores</h2>
                    <div className="h-[200px] w-full flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData2} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                            {donutData2.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-brand-blue">88%</span>
                        <span className="text-xs text-slate-500">Completed</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: COACHES */}
          {activeView === "coaches" && (
            <div className="max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">Coaches List</h2>
                  <p className="text-[var(--text-secondary)] mt-1">Manage and observe all assigned coaches.</p>
                </div>
                <div className="bg-white border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] shadow-sm">
                  Showing <span className="font-bold text-[var(--text-primary)]">{COACHES.length}</span> coaches
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-[var(--shadow-sm)] border border-[var(--border-light)] overflow-hidden">
                <div className="flex flex-col">
                  {COACHES.map((coach, i) => {
                    const initials = getInitials(coach.name);
                    const color = getAvatarColor(coach.name);
                    const agents = getAgentsForCoach(coach.name);
                    const completionRate = getCoachCompletionRate(coach.name);
                    const observedCount = agents.filter(a => observedAgents.has(a.name)).length;
                    return (
                      <div 
                        key={i} 
                        onClick={() => { setSelectedCoach(coach.name); setCoachModalOpen(true); }}
                        className="flex items-center gap-4 p-4 border-b border-[var(--border-light)] last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[var(--text-primary)] truncate">{coach.name}</h3>
                          <p className="text-sm text-[var(--text-secondary)] truncate">{coach.dept} Department Coach</p>
                        </div>
                        <div className="text-right hidden sm:flex items-center gap-2 shrink-0 min-w-[100px]">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${completionRate}%`, backgroundColor: completionRate === 100 ? '#10B981' : completionRate > 50 ? '#F59E0B' : '#EF4444' }} />
                          </div>
                          <span className={`font-bold text-sm ${completionRate === 100 ? 'text-emerald-500' : completionRate > 50 ? 'text-amber-500' : 'text-red-400'}`}>{completionRate}%</span>
                        </div>
                        <div className="text-right hidden sm:block shrink-0 min-w-[80px]">
                          <span className="text-[11px] font-medium text-slate-500">{observedCount}/{agents.length} done</span>
                        </div>
                        <div className="text-right hidden md:block shrink-0 min-w-[90px]">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                            coach.dept === 'Sales' ? 'bg-blue-50 text-blue-600' : coach.dept === 'Support' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>{coach.dept}</span>
                        </div>
                        <div className="text-slate-300 group-hover:text-brand-blue transition-colors pl-2">
                          <ChevronDown className="-rotate-90" size={20} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: AGENTS BY DEPARTMENT */}
          {activeView === "agents" && (
            <div className="max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">{selectedDept} Agents</h2>
                  <p className="text-[var(--text-secondary)] mt-1">Click an agent to start an observation.</p>
                </div>
                <div className="flex items-center gap-2">
                  {['Sales', 'Support', 'Specialty'].map(dept => (
                    <button 
                      key={dept}
                      onClick={() => setSelectedDept(dept)}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                        selectedDept === dept 
                          ? 'bg-brand-blue text-white shadow-sm' 
                          : 'bg-white border border-[var(--border-light)] text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-[var(--shadow-sm)] border border-[var(--border-light)] overflow-hidden">
                <div className="flex flex-col">
                  {getAgentsByDept(selectedDept).map((agent, i) => {
                    const initials = getInitials(agent.name);
                    const color = getAvatarColor(agent.name);
                    const isObserved = observedAgents.has(agent.name);
                    return (
                      <div 
                        key={i} 
                        onClick={() => openObservationModal(agent.name)}
                        className="flex items-center gap-4 p-4 border-b border-[var(--border-light)] last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[var(--text-primary)] truncate">{agent.name}</h3>
                          <p className="text-sm text-[var(--text-secondary)] truncate">Coach: {agent.coach}</p>
                        </div>
                        <div className="hidden sm:block shrink-0">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            isObserved 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {isObserved ? '✓ Observed' : 'Pending'}
                          </span>
                        </div>
                        <div className="text-slate-300 group-hover:text-brand-blue transition-colors">
                          <ChevronDown className="-rotate-90" size={20} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* --- MODALS --- */}
      
      {/* Observation Modal */}
      {modalOpen && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={closeModals}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[800px] flex flex-col max-h-[90vh] relative z-10 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center bg-slate-50/50 rounded-t-2xl shrink-0">
              <div>
                <h2 className="text-xl font-bold">Observation Form</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Complete the observation details below.</p>
              </div>
              <button onClick={closeModals} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* Grid 1: Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department</label>
                  <MultiSelect 
                    options={['Sales', 'Support', 'Service Recovery', 'Other']}
                    selected={formData.department}
                    onChange={vals => setFormData({...formData, department: vals})}
                    placeholder="Select Department..."
                  />
                  {formData.department.includes('Other') && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <input 
                        type="text"
                        placeholder="Type department..."
                        className="w-full bg-white border border-[var(--border-light)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                        value={formData.otherDepartment}
                        onChange={e => setFormData({...formData, otherDepartment: e.target.value})}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date of Observation</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-slate-600 cursor-not-allowed"
                    value={formData.date} disabled
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Coach Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-slate-600 cursor-not-allowed"
                    value={formData.coachName} disabled
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Agent Name</label>
                  <div className="w-full bg-slate-50 border border-[var(--border-light)] rounded-lg px-4 py-2.5 font-semibold text-brand-blue">
                    {selectedAgent}
                  </div>
                </div>
              </div>

              {/* Grid 2: Observation Types */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Session Type</label>
                  <MultiSelect 
                    options={[
                      'Remote Observation', 
                      'Side-by-Side', 
                      'Real-time Guidance', 
                      'Observation - 1:1 Follow-up needed'
                    ]}
                    selected={formData.sessionType}
                    onChange={vals => setFormData({...formData, sessionType: vals})}
                    placeholder="Select Type..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categories</label>
                  <MultiSelect 
                    options={[
                      'Problem-Solving/Resolution',
                      'Product/Process Knowledge',
                      'Customer Handling Skills',
                      'Platform Mastery',
                      'Call Control/Time Management',
                      'Communication Skills',
                      'Compliance/Policy Adherence',
                      'Adherence to Call Flow',
                      'Documentation Accuracy',
                      'Process Execution & Accuracy',
                      'Others'
                    ]}
                    selected={formData.categories}
                    onChange={vals => setFormData({...formData, categories: vals})}
                    placeholder="Select Category..."
                  />
                  {formData.categories.includes('Others') && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <input 
                        type="text"
                        placeholder="Type category..."
                        className="w-full bg-white border border-[var(--border-light)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                        value={formData.otherCategory}
                        onChange={e => setFormData({...formData, otherCategory: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Rich Text Areas */}
              <div className="flex flex-col gap-6 mb-8">
                {[
                  { id: 'strengths', label: 'Strengths' },
                  { id: 'areasOfOpportunity', label: 'Areas of Opportunity' },
                  { id: 'rootCause', label: 'Root Cause Identification' },
                  { id: 'actionPlan', label: 'Action Plan' },
                ].map(field => (
                  <div key={field.id}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
                      <button 
                        onClick={() => openRichTextEditor(field.id as keyof typeof formData)}
                        className="text-xs font-bold text-brand-blue hover:text-brand-blue-hover flex items-center gap-1 bg-brand-blue-light px-2 py-1 rounded-md"
                      >
                        <Edit3 size={12} /> Edit Details
                      </button>
                    </div>
                    <div 
                      className="w-full min-h-[80px] bg-white border border-[var(--border-light)] rounded-lg p-4 text-[14px] text-slate-700 cursor-text hover:border-slate-400 transition-colors empty:before:content-['Click_Edit_Details_to_add_content...'] empty:before:text-slate-400"
                      onClick={() => openRichTextEditor(field.id as keyof typeof formData)}
                    >
                      {formData[field.id as keyof typeof formData]}
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid 3: Rating & Additional */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Overall Performance Rating</label>
                  <MultiSelect 
                    options={['Meets Expectations', 'Exceeds Expectations', 'Needs Improvement']}
                    selected={formData.overallRating}
                    onChange={vals => setFormData({...formData, overallRating: vals})}
                    placeholder="Select Rating..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Order Number, Phone, or Email</label>
                  <input 
                    type="text" 
                    placeholder="Enter reference..."
                    className="w-full bg-white border border-[var(--border-light)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    value={formData.orderNumber} onChange={e => setFormData({...formData, orderNumber: e.target.value})}
                  />
                </div>
              </div>

              {/* Final Text Areas */}
              <div className="flex flex-col gap-6">
                {[
                  { id: 'otherFeedback', label: 'Other Feedback, Comments and Insights' },
                  { id: 'teamLeadFeedback', label: 'Team Lead Feedback' }
                ].map(field => (
                  <div key={field.id}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
                      <button 
                        onClick={() => openRichTextEditor(field.id as keyof typeof formData)}
                        className="text-xs font-bold text-brand-blue hover:text-brand-blue-hover flex items-center gap-1 bg-brand-blue-light px-2 py-1 rounded-md"
                      >
                        <Edit3 size={12} /> Edit Details
                      </button>
                    </div>
                    <div 
                      className="w-full min-h-[80px] bg-white border border-[var(--border-light)] rounded-lg p-4 text-[14px] text-slate-700 cursor-text hover:border-slate-400 transition-colors empty:before:content-['Click_Edit_Details_to_add_content...'] empty:before:text-slate-400"
                      onClick={() => openRichTextEditor(field.id as keyof typeof formData)}
                    >
                      {formData[field.id as keyof typeof formData]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-[var(--border-light)] flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl shrink-0">
              <button onClick={closeModals} className="px-5 py-2.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={proceedToRating} className="px-5 py-2.5 rounded-lg font-semibold bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-brand-blue-hover transition-all hover:-translate-y-0.5">
                Save Observation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModalOpen && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={closeModals}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center">
              <h2 className="text-xl font-bold">Rate Observation</h2>
              <button onClick={closeModals} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md mb-4"
                style={{ backgroundColor: getAvatarColor(selectedAgent) }}
              >
                {getInitials(selectedAgent)}
              </div>
              <h3 className="text-xl font-bold mb-1">{selectedAgent}</h3>
              <p className="text-sm text-slate-500 mb-8">Set the observation score below.</p>
              
              <div className="text-5xl font-black text-brand-blue mb-6 tracking-tighter">
                {rating}
              </div>
              
              <input 
                type="range" 
                min="0" max="10" 
                value={rating} 
                onChange={(e) => setRating(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue mb-8"
              />
              
              <div className="flex justify-between w-full text-xs font-bold text-slate-400">
                <span>0</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
            
            <div className="p-6 border-t border-[var(--border-light)] flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button onClick={closeModals} className="px-5 py-2.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={async () => {
                if (selectedAgent) {
                  const agentCoach = AGENTS.find(a => a.name === selectedAgent)?.coach || 'Unknown';
                  await createObservation({
                    agentName: selectedAgent,
                    coachName: agentCoach,
                    department: formData.department,
                    otherDepartment: formData.otherDepartment || undefined,
                    date: formData.date,
                    sessionType: formData.sessionType,
                    categories: formData.categories,
                    otherCategory: formData.otherCategory || undefined,
                    strengths: formData.strengths || undefined,
                    areasOfOpportunity: formData.areasOfOpportunity || undefined,
                    rootCause: formData.rootCause || undefined,
                    actionPlan: formData.actionPlan || undefined,
                    overallRating: formData.overallRating,
                    otherFeedback: formData.otherFeedback || undefined,
                    orderNumber: formData.orderNumber || undefined,
                    teamLeadFeedback: formData.teamLeadFeedback || undefined,
                    rating: rating,
                    observedBy: 'JG (Current User)',
                  });
                }
                closeModals();
              }} className="px-5 py-2.5 rounded-lg font-semibold bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-brand-blue-hover transition-all hover:-translate-y-0.5">
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rich Text Editor Modal */}
      {editModalOpen && selectedAgent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setEditModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[700px] flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[var(--border-light)] flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <h2 className="text-lg font-bold">Edit Observation Details</h2>
              <button onClick={() => setEditModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-0 flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center gap-1 p-2 border-b border-[var(--border-light)] bg-slate-50">
                <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700 font-bold w-8">B</button>
                <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700 italic font-serif w-8">I</button>
                <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700 underline w-8">U</button>
                <div className="w-[1px] h-5 bg-slate-300 mx-1"></div>
                <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700 w-8">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                </button>
                <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700 w-8">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="12" x2="9" y2="12"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>
                </button>
              </div>
              
              <textarea 
                className="w-full h-[300px] p-4 resize-none focus:outline-none text-[var(--text-primary)]"
                placeholder="Write your observation notes here... Use the toolbar to format."
                value={observationText}
                onChange={(e) => setObservationText(e.target.value)}
              />
            </div>
            
            <div className="p-4 border-t border-[var(--border-light)] flex justify-end gap-2 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 rounded-lg font-semibold text-sm text-slate-600 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={saveRichText} className="px-4 py-2 rounded-lg font-semibold text-sm bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-brand-blue-hover transition-all hover:-translate-y-0.5">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coach Detail Modal */}
      {coachModalOpen && selectedCoach && (() => {
        const coach = COACHES.find(c => c.name === selectedCoach);
        const coachAgents = getAgentsForCoach(selectedCoach);
        const completionRate = getCoachCompletionRate(selectedCoach);
        const observedCount = coachAgents.filter(a => observedAgents.has(a.name)).length;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setCoachModalOpen(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] flex flex-col max-h-[85vh] relative z-10 animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-6 border-b border-[var(--border-light)] bg-slate-50/50 rounded-t-2xl shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md"
                      style={{ backgroundColor: getAvatarColor(selectedCoach) }}
                    >
                      {getInitials(selectedCoach)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedCoach}</h2>
                      <p className="text-sm text-[var(--text-secondary)]">{coach?.dept} Department Coach</p>
                    </div>
                  </div>
                  <button onClick={() => setCoachModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Completion Bar */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${completionRate}%`, 
                        backgroundColor: completionRate === 100 ? '#10B981' : completionRate > 50 ? '#F59E0B' : '#EF4444' 
                      }} 
                    />
                  </div>
                  <span className={`text-sm font-bold ${completionRate === 100 ? 'text-emerald-500' : completionRate > 50 ? 'text-amber-500' : 'text-red-400'}`}>
                    {observedCount}/{coachAgents.length} observed ({completionRate}%)
                  </span>
                </div>
              </div>

              {/* Agents List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-2">
                  {coachAgents.map((agent, i) => {
                    const isObserved = observedAgents.has(agent.name);
                    return (
                      <div 
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                        onClick={() => { setCoachModalOpen(false); openObservationModal(agent.name); }}
                      >
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ backgroundColor: getAvatarColor(agent.name) }}
                        >
                          {getInitials(agent.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-[var(--text-primary)] truncate">{agent.name}</h4>
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                          isObserved 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {isObserved ? '✓ Observed' : 'Pending'}
                        </span>
                        <ChevronDown className="-rotate-90 text-slate-300 group-hover:text-brand-blue transition-colors" size={16} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--border-light)] flex justify-end bg-slate-50/50 rounded-b-2xl shrink-0">
                <button onClick={() => setCoachModalOpen(false)} className="px-5 py-2.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Date Filter Modal */}
      {dateFilterModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDateFilterModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="text-brand-blue" size={20} />
                Filter Period
              </h2>
              <button onClick={() => setDateFilterModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div 
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${filterSinceDate === getMondayEST() ? 'border-brand-blue bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}
                onClick={() => { setFilterSinceDate(getMondayEST()); setDateFilterModalOpen(false); }}
              >
                <div className="font-bold text-slate-800">Current Week</div>
                <div className="text-xs text-slate-500 mt-1">Reset every Monday EST (Monday, {getMondayEST()})</div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom Since Date</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  value={filterSinceDate}
                  onChange={(e) => setFilterSinceDate(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setDateFilterModalOpen(false)}
                className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold shadow-lg shadow-brand-blue/20 hover:bg-brand-blue-hover transition-all active:scale-[0.98]"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Subcomponents ---

function NavItem({ icon, label, collapsed, active, onClick }: { icon: React.ReactNode, label: string, collapsed: boolean, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      className={`flex items-center px-3 py-2.5 rounded-lg cursor-pointer font-medium transition-colors
        ${active ? 'bg-brand-blue-light text-brand-blue' : 'text-[var(--text-secondary)] hover:bg-slate-50'}
        ${collapsed ? 'justify-center' : 'gap-3'}`}
      onClick={onClick}
      title={collapsed ? label : ""}
    >
      <div className={`${active ? 'text-brand-blue' : 'text-slate-400'}`}>{icon}</div>
      {!collapsed && <span>{label}</span>}
    </div>
  );
}

function MultiSelect({ options, selected, onChange, placeholder }: { options: string[], selected: string[], onChange: (vals: string[]) => void, placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(o => o !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative">
      <div 
        className="w-full bg-white border border-[var(--border-light)] rounded-lg px-4 py-2.5 flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue min-h-[46px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1">
          {selected.length > 0 ? (
            selected.map(val => (
              <span key={val} className="bg-brand-blue-light text-brand-blue text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 animate-in zoom-in-95">
                {val}
                <X size={10} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleOption(val); }} />
              </span>
            ))
          ) : (
            <span className="text-slate-400 text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border-light)] rounded-xl shadow-xl z-[70] py-1 max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
            {options.map(option => {
              const isSelected = selected.includes(option);
              return (
                <div 
                  key={option}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between
                    ${isSelected ? 'bg-brand-blue-light text-brand-blue font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                  onClick={() => toggleOption(option)}
                >
                  <span>{option}</span>
                  {isSelected && <Check size={14} />}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const AVATAR_URLS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
];

function AgentRow({ coach, idx, onClick }: { coach: { name: string, desc: string, badge?: string, badgeColor?: string }, idx: number, onClick: () => void }) {
  return (
    <div onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-[var(--border-light)] hover:bg-slate-50 cursor-pointer transition-all group">
      <div className="relative shrink-0">
        <img src={AVATAR_URLS[idx % AVATAR_URLS.length]} alt={coach.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
        <span className={`absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white ${coach.badgeColor}`}>
          {coach.badge}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm truncate text-[var(--text-primary)]">{coach.name}</h3>
        <p className="text-xs text-[var(--text-tertiary)] truncate">{coach.desc}</p>
      </div>
      <div className="shrink-0 text-slate-300 group-hover:text-brand-blue transition-colors">
        <Check size={18} />
      </div>
    </div>
  );
}
