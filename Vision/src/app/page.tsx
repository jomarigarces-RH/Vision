"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Menu, LayoutDashboard, Users, UserCog, HandHeart, HelpCircle,
  Settings, ChevronDown, Check, X, Bell, Edit3, Search, Calendar, Filter, History, BarChart as BarChartIcon, BookOpen, TrendingUp, Briefcase, Eye
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
  const colors = ['#4F7DF3', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}




export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [activeView, setActiveView] = useState("observation");
  const [observationSubTab, setObservationSubTab] = useState<'dashboard' | 'agents' | 'coaches'>('dashboard');
  const [selectedDept, setSelectedDept] = useState<string>('Sales');

  const [coachModalOpen, setCoachModalOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [dateFilterModalOpen, setDateFilterModalOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<string>('Past week');
  const [globalPeriod, setGlobalPeriod] = useState<'TW' | 'LW' | 'ALL'>('TW');
  const [notObsDept, setNotObsDept] = useState('Sales');

  const allObservations = useQuery(api.observations.list) ?? [];
  const deleteManyObservations = useMutation(api.observations.deleteMany);

  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());

  const [recentObsModalOpen, setRecentObsModalOpen] = useState(false);
  const [wowChartsModalOpen, setWowChartsModalOpen] = useState(false);
  const [selectedObs, setSelectedObs] = useState<any>(null);
  const [expandedNote, setExpandedNote] = useState<{ label: string, content: string } | null>(null);

  const recentObservations = useMemo(() => allObservations.slice(0, 20), [allObservations]);

  const weekStats = useMemo(() => {
    const now = new Date();
    const thisMon = new Date(now);
    const d = thisMon.getDay();
    const diff = thisMon.getDate() - d + (d === 0 ? -6 : 1);
    thisMon.setDate(diff);
    const thisWeekStart = thisMon.toISOString().split('T')[0];

    const lastMon = new Date(thisMon);
    lastMon.setDate(thisMon.getDate() - 7);
    const lastWeekStart = lastMon.toISOString().split('T')[0];
    const lastSun = new Date(thisMon);
    lastSun.setDate(thisMon.getDate() - 1);
    const lastWeekEnd = lastSun.toISOString().split('T')[0];

    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    return { thisWeekStart, lastWeekStart, lastWeekEnd, monthStart };
  }, []);

  const filterDates = useMemo(() => {
    const now = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    let sinceDate: string | undefined;
    let endDate: string | undefined;

    switch (filterPeriod) {
      case 'Today':
        sinceDate = formatDate(now);
        endDate = sinceDate;
        break;
      case 'Yesterday': {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        sinceDate = formatDate(d);
        endDate = sinceDate;
        break;
      }
      case 'Past week': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        sinceDate = formatDate(d);
        break;
      }
      case 'Month to date': {
        const d = new Date(now);
        d.setDate(1);
        sinceDate = formatDate(d);
        break;
      }
      case 'Past 4 weeks': {
        const d = new Date(now);
        d.setDate(d.getDate() - 28);
        sinceDate = formatDate(d);
        break;
      }
      case 'Past 12 weeks': {
        const d = new Date(now);
        d.setDate(d.getDate() - 84);
        sinceDate = formatDate(d);
        break;
      }
      case 'Year to date': {
        const d = new Date(now);
        d.setMonth(0, 1);
        sinceDate = formatDate(d);
        break;
      }
      case 'Past 6 months': {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 6);
        sinceDate = formatDate(d);
        break;
      }
      case 'Past 12 months': {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - 1);
        sinceDate = formatDate(d);
        break;
      }
      default:
        sinceDate = weekStats.thisWeekStart;
        break;
    }
    return { sinceDate, endDate };
  }, [filterPeriod, weekStats]);

  // Convex: fetch observations from database
  const observedAgentsList = useQuery(api.observations.getObservedAgents, filterDates) ?? [];
  const observedAgents = useMemo(() => new Set(observedAgentsList), [observedAgentsList]);

  const getCoachPeriodCount = (coachName: string, start: string, end?: string) => {
    return allObservations.filter(o => {
      if (o.coachName !== coachName) return false;
      if (o.date < start) return false;
      if (end && o.date > end) return false;
      return true;
    }).length;
  };

  const wowChartsData = useMemo(() => {
    const agentStats: Record<string, { thisWeek: number, lastWeek: number, month: number }> = {};

    AGENTS.forEach(a => {
      agentStats[a.name] = {
        thisWeek: allObservations.filter(o => o.agentName === a.name && o.date >= weekStats.thisWeekStart).length,
        lastWeek: allObservations.filter(o => o.agentName === a.name && o.date >= weekStats.lastWeekStart && o.date <= weekStats.lastWeekEnd).length,
        month: allObservations.filter(o => o.agentName === a.name && o.date >= weekStats.monthStart).length,
      };
    });

    return Object.entries(agentStats)
      .map(([name, stats]) => ({
        name,
        ...stats,
        wow: stats.thisWeek - stats.lastWeek
      }))
      .sort((a, b) => b.month - a.month)
      .filter(a => a.month > 0);
  }, [allObservations, weekStats]);

  const getAgentPeriodCount = (agentName: string, start: string, end?: string) => {
    return allObservations.filter(o => {
      if (o.agentName !== agentName) return false;
      if (o.date < start) return false;
      if (end && o.date > end) return false;
      return true;
    }).length;
  };

  // Search Logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: any[] = [];

    // Search Observations by ID
    allObservations.forEach(obs => {
      const shortId = obs._id.slice(-8).toUpperCase();
      if (shortId.includes(q.toUpperCase()) || obs.agentName.toLowerCase().includes(q)) {
        results.push({
          type: 'observation',
          name: `ID: ${shortId} - ${obs.agentName}`,
          path: `History > ${obs.agentName} > ${obs.date}`,
          value: obs
        });
      }
    });

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

    return results.slice(0, 10);
  }, [searchQuery, allObservations]);



  const handleSearchResultClick = (result: any) => {
    setSearchQuery("");
    setShowSearchDropdown(false);
    if (result.type === 'dept') {
      setSelectedDept(result.value);
      setActiveView('observation');
      setObservationSubTab('agents');
    } else if (result.type === 'coach') {
      setSelectedCoach(result.value);
      setCoachModalOpen(true);
      setActiveView('observation');
      setObservationSubTab('coaches');
    } else if (result.type === 'observation') {
      setSelectedObs(result.value);
    }
  };

  // Derive agents by department (agent → coach → coach's LOB)
  const getAgentsByDept = (dept: string) =>
    AGENTS.filter(a => {
      const coach = COACHES.find(c => c.name === a.coach);
      return coach?.dept === dept;
    });

  // Completion statistics for Dashboard
  const lobsStats = useMemo(() => {
    const lobs = ['Sales', 'Support', 'Specialty'];

    // Period selection logic
    let start = weekStats.thisWeekStart;
    let end: string | undefined = undefined;

    if (globalPeriod === 'LW') {
      start = weekStats.lastWeekStart;
      end = weekStats.lastWeekEnd;
    } else if (globalPeriod === 'ALL') {
      start = "2000-01-01";
    }

    const periodObservations = allObservations.filter(o => {
      if (o.date < start) return false;
      if (end && o.date > end) return false;
      return true;
    });

    const observedSet = new Set(periodObservations.map(o => o.agentName));

    return lobs.map(dept => {
      const deptAgents = getAgentsByDept(dept);
      const total = deptAgents.length;
      const observed = deptAgents.filter(a => observedSet.has(a.name)).length;
      const percent = total > 0 ? Math.round((observed / total) * 100) : 0;
      return {
        name: dept,
        total,
        observed,
        value: percent,
        color: dept === 'Sales' ? '#4F7DF3' : dept === 'Support' ? '#10B981' : '#F59E0B'
      };
    });
  }, [allObservations, weekStats, globalPeriod]);

  const notObservedStats = useMemo(() => {
    let weeks: { start: string, end: string }[] = [];
    if (globalPeriod === 'TW') {
      weeks = [{ start: weekStats.thisWeekStart, end: '9999-12-31' }];
    } else if (globalPeriod === 'LW') {
      weeks = [{ start: weekStats.lastWeekStart, end: weekStats.lastWeekEnd }];
    } else if (globalPeriod === 'ALL') {
      if (allObservations.length > 0) {
        const oldestDate = allObservations.reduce((min, o) => o.date < min ? o.date : min, allObservations[0].date);
        let currentMon = new Date(oldestDate);
        const d = currentMon.getDay();
        const diff = currentMon.getDate() - d + (d === 0 ? -6 : 1);
        currentMon.setDate(diff);

        const now = new Date();
        while (currentMon <= now) {
          const wStart = currentMon.toISOString().split('T')[0];
          const wEndObj = new Date(currentMon);
          wEndObj.setDate(wEndObj.getDate() + 6);
          const wEnd = wEndObj.toISOString().split('T')[0];
          weeks.push({ start: wStart, end: wEnd });
          currentMon.setDate(currentMon.getDate() + 7);
        }
      }
    }

    const relevantAgents = AGENTS.filter(a => {
      const coach = COACHES.find(c => c.name === a.coach);
      if (notObsDept !== 'All' && coach?.dept !== notObsDept) return false;
      return true;
    });

    const coachStats: Record<string, number> = {};
    relevantAgents.forEach(a => {
      let missedWeeks = 0;
      weeks.forEach(w => {
        const hasObs = allObservations.some(o => o.agentName === a.name && o.date >= w.start && o.date <= w.end);
        if (!hasObs) missedWeeks++;
      });
      if (missedWeeks > 0) {
        coachStats[a.coach] = (coachStats[a.coach] || 0) + missedWeeks;
      }
    });

    return Object.entries(coachStats)
      .map(([name, val]) => ({ name: name.split(' ')[0], fullName: name, val }))
      .sort((a, b) => b.val - a.val);
  }, [allObservations, globalPeriod, notObsDept, weekStats]);

  const observationTrendData = useMemo(() => {
    let start = weekStats.thisWeekStart;
    let end: string | undefined = undefined;
    if (globalPeriod === 'LW') {
      start = weekStats.lastWeekStart;
      end = weekStats.lastWeekEnd;
    } else if (globalPeriod === 'ALL') {
      start = "2000-01-01";
    }

    const periodObs = allObservations.filter(o => {
      if (o.date < start) return false;
      if (end && o.date > end) return false;
      return true;
    });

    const dateMap = new Map<string, any>();

    if (globalPeriod === 'TW' || globalPeriod === 'LW') {
      const dStart = new Date(start);
      for (let i = 0; i < 7; i++) {
        const d = new Date(dStart);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        dateMap.set(dateStr, { day: dateStr.slice(5), Sales: 0, Support: 0, Specialty: 0 });
      }
    }

    periodObs.forEach(o => {
      const dateStr = o.date;
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { day: dateStr.slice(5), Sales: 0, Support: 0, Specialty: 0 });
      }
      const entry = dateMap.get(dateStr)!;
      if (o.department.includes('Sales')) entry.Sales++;
      if (o.department.includes('Support')) entry.Support++;
      if (o.department.includes('Specialty')) entry.Specialty++;
    });

    return Array.from(dateMap.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [allObservations, globalPeriod, weekStats]);

  const overallCompletion = useMemo(() => {
    const total = lobsStats.reduce((acc, curr) => acc + curr.total, 0);
    const observed = lobsStats.reduce((acc, curr) => acc + curr.observed, 0);
    return total > 0 ? Math.round((observed / total) * 100) : 0;
  }, [lobsStats]);

  const getAgentsForCoach = (coachName: string) => AGENTS.filter(a => a.coach === coachName);

  const getCoachCompletionRate = (coachName: string) => {
    const agents = getAgentsForCoach(coachName);
    if (agents.length === 0) return 0;
    const observed = agents.filter(a => observedAgents.has(a.name)).length;
    return Math.round((observed / agents.length) * 100);
  };

  // Filter and Data Helpers
  const observationDataStats = useMemo(() => {
    const lobs = ['Sales', 'Support', 'Specialty'];
    const getCount = (dept: string, start: string, end?: string) => {
      return allObservations.filter(o => {
        if (!o.department.includes(dept)) return false;
        if (o.date < start) return false;
        if (end && o.date > end) return false;
        return true;
      }).length;
    };
    return lobs.map(dept => ({
      name: dept,
      TW: getCount(dept, weekStats.thisWeekStart),
      LW: getCount(dept, weekStats.lastWeekStart, weekStats.lastWeekEnd),
      MTD: getCount(dept, weekStats.monthStart)
    }));
  }, [allObservations, weekStats]);

  const getCoachDept = (coachName: string) => COACHES.find(c => c.name === coachName)?.dept || 'Other';
  const getAgentCoach = (agentName: string) => AGENTS.find(a => a.name === agentName)?.coach || 'None';

  const coachesData = COACHES.map(c => ({
    name: c.name,
    desc: `${c.dept} Department Coach`,
    badge: '09',
    badgeColor: c.dept === 'Sales' ? 'bg-brand-blue text-white' : 'bg-accent-red text-white'
  }));

  const assignedAgentsData = AGENTS.slice(0, 10).map(a => ({
    name: a.name,
    desc: `Coach: ${a.coach}`,
    badge: '09',
    badgeColor: getCoachDept(a.coach) === 'Sales' ? 'bg-brand-blue text-white' : 'bg-accent-red text-white'
  }));



  // Responsive state
  const [isMobile, setIsMobile] = useState(false);


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
              <path d="M12 8 L12 100 L30 100 L30 68 L58 68 L78 100 L98 100 L74 64 C88 58 96 46 96 32 C96 14 82 8 62 8 Z M30 24 L58 24 C72 24 78 28 78 38 C78 48 72 54 58 54 L30 54 Z" fill="#1E293B" />
              {(!sidebarCollapsed || isMobile) && <text x="60" y="132" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="22" letterSpacing="3" fill="#1E293B">RESIDENT</text>}
            </svg>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
          {/* Observation Tab with Sub-tabs */}
          <div className="my-1">
            <div
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer font-medium transition-colors
                ${activeView === 'observation' ? 'bg-brand-blue-light text-brand-blue' : 'text-[var(--text-secondary)] hover:bg-slate-50'}
                ${sidebarCollapsed ? 'justify-center' : ''}`}
              onClick={() => {
                if (sidebarCollapsed) {
                  setSidebarCollapsed(false);
                  setTimeout(() => setAgentsOpen(true), 300);
                } else {
                  setActiveView('observation');
                  setAgentsOpen(!agentsOpen);
                }
              }}
              title={sidebarCollapsed ? "Observation" : ""}
            >
              <div className="flex items-center gap-3">
                <Eye size={20} className={activeView === 'observation' ? 'text-brand-blue' : 'text-slate-400'} />
                {!sidebarCollapsed && <span>Observation</span>}
              </div>
              {!sidebarCollapsed && (
                <ChevronDown size={16} className={`transition-transform duration-200 ${agentsOpen ? 'rotate-180' : ''}`} />
              )}
            </div>

            {/* Observation Sub-tabs */}
            <div className={`overflow-hidden transition-all duration-300 ${!sidebarCollapsed && agentsOpen ? 'max-h-[400px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
              <div className="pl-4 pr-3 flex flex-col gap-0.5 border-l-2 border-slate-100 ml-5 py-1">
                {/* Dashboard Sub-tab */}
                <div
                  className={`px-3 py-2 text-[13px] font-medium cursor-pointer rounded-md transition-colors flex items-center gap-2
                    ${activeView === 'observation' && observationSubTab === 'dashboard' ? 'bg-brand-blue-light text-brand-blue font-semibold' : 'text-[var(--text-secondary)] hover:bg-slate-50 hover:text-[var(--brand-blue)]'}`}
                  onClick={() => { setActiveView('observation'); setObservationSubTab('dashboard'); }}
                >
                  <LayoutDashboard size={14} />
                  Dashboard
                </div>

                {/* Agents Sub-tab with LOB children */}
                <div
                  className={`px-3 py-2 text-[13px] font-medium cursor-pointer rounded-md transition-colors flex items-center gap-2
                    ${activeView === 'observation' && observationSubTab === 'agents' ? 'bg-brand-blue-light text-brand-blue font-semibold' : 'text-[var(--text-secondary)] hover:bg-slate-50 hover:text-[var(--brand-blue)]'}`}
                  onClick={() => { setActiveView('observation'); setObservationSubTab('agents'); }}
                >
                  <Users size={14} />
                  Agents
                </div>
                {/* LOB Departments under Agents */}
                {observationSubTab === 'agents' && activeView === 'observation' && (
                  <div className="pl-4 flex flex-col gap-0.5 ml-2 border-l-2 border-slate-50 py-0.5">
                    {['Sales', 'Support', 'Specialty'].map(dept => {
                      const deptAgents = getAgentsByDept(dept);
                      const isActive = selectedDept === dept;
                      return (
                        <div
                          key={dept}
                          className={`px-3 py-1.5 text-[12px] font-medium cursor-pointer rounded-md transition-colors flex items-center justify-between
                            ${isActive ? 'bg-blue-50 text-brand-blue font-semibold' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                          onClick={() => setSelectedDept(dept)}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${dept === 'Sales' ? 'bg-blue-500' : dept === 'Support' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {dept}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">{deptAgents.length}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Coaches Sub-tab */}
                <div
                  className={`px-3 py-2 text-[13px] font-medium cursor-pointer rounded-md transition-colors flex items-center gap-2
                    ${activeView === 'observation' && observationSubTab === 'coaches' ? 'bg-brand-blue-light text-brand-blue font-semibold' : 'text-[var(--text-secondary)] hover:bg-slate-50 hover:text-[var(--brand-blue)]'}`}
                  onClick={() => { setActiveView('observation'); setObservationSubTab('coaches'); }}
                >
                  <UserCog size={14} />
                  Coaches
                </div>
              </div>
            </div>
          </div>

          {/* Business Volume Tab */}
          <NavItem
            icon={<Briefcase size={20} />}
            label="Business Volume"
            collapsed={sidebarCollapsed}
            active={activeView === "business-volume"}
            onClick={() => setActiveView("business-volume")}
          />
        </nav>

        <div className="p-3 border-t border-[var(--border-light)] flex flex-col gap-1">
          <NavItem
            icon={<History size={20} />}
            label="History"
            collapsed={sidebarCollapsed}
            active={activeView === "history"}
            onClick={() => setActiveView("history")}
          />
          <NavItem icon={<Settings size={20} />} label="Settings" collapsed={sidebarCollapsed} />
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* HEADER */}
        <header className="h-[72px] bg-white border-b border-[var(--border-light)] flex items-center justify-between px-3 sm:px-6 shrink-0 z-40 shadow-sm">
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
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${result.type === 'dept' ? 'bg-blue-50 text-blue-600' : result.type === 'coach' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
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
            <div className="hidden sm:flex bg-slate-100 p-1 rounded-lg">
              {[
                { id: 'TW', label: 'This Week' },
                { id: 'LW', label: 'Last Week' },
                { id: 'ALL', label: 'All Time' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setGlobalPeriod(p.id as any)}
                  className={`px-3 py-1.5 text-[11px] font-black rounded-md transition-all ${globalPeriod === p.id ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <button
                onClick={() => setDateFilterModalOpen(!dateFilterModalOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <Calendar size={18} className="text-brand-blue" />
                <span className="hidden sm:inline">
                  {filterPeriod}
                </span>
                <Filter size={14} className="text-slate-400" />
              </button>

              {dateFilterModalOpen && (
                <>
                  <div className="fixed inset-0 z-[40]" onClick={() => setDateFilterModalOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-[220px] bg-slate-900 border border-slate-800 rounded-xl shadow-xl shadow-slate-900/20 z-[50] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {[
                      'Today', 'Yesterday', 'Past week', 'Month to date', 
                      'Past 4 weeks', 'Past 12 weeks', 'Year to date', 
                      'Past 6 months', 'Past 12 months'
                    ].map((period) => (
                      <button
                        key={period}
                        className="w-full text-left px-4 py-2.5 text-[13px] font-semibold hover:bg-slate-800 transition-colors flex items-center justify-between group"
                        onClick={() => { setFilterPeriod(period); setDateFilterModalOpen(false); }}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar size={16} className={filterPeriod === period ? 'text-brand-blue' : 'text-slate-400'} />
                          <span className={filterPeriod === period ? 'text-white' : 'text-slate-300 group-hover:text-white'}>{period}</span>
                        </div>
                        {filterPeriod === period && <Check size={14} className="text-brand-blue" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

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

          {/* VIEW: OBSERVATION - DASHBOARD */}
          {activeView === "observation" && observationSubTab === "dashboard" && (
            <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Column 1 */}
                <div className="flex flex-col gap-6">
                  {/* Card: Observation Data */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)] overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                      <h2 className="font-bold text-lg">Observation Data</h2>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mb-4">Observation count breakdown by LOB for this week, last week, and month-to-date.</p>
                    <div className="flex justify-between items-center mb-4">
                    </div>

                    <div className="w-full">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="py-3 px-2">Line of Business</th>
                            <th className="py-3 px-2 text-center text-brand-blue">This Week</th>
                            <th className="py-3 px-2 text-center opacity-40">Last Week</th>
                            <th className="py-3 px-2 text-center opacity-40">MTD</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {observationDataStats.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full ${row.name === 'Sales' ? 'bg-brand-blue' : row.name === 'Support' ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`} />
                                  <span className="text-sm font-bold text-slate-700">{row.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center text-sm font-black text-brand-blue">
                                {row.TW}
                              </td>
                              <td className="py-3 px-2 text-center text-sm font-black text-slate-400">
                                {row.LW}
                              </td>
                              <td className="py-3 px-2 text-center text-sm font-black text-slate-400">
                                {row.MTD}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50/50">
                            <td className="py-2 px-2 text-[10px] font-black text-slate-500 uppercase">Total</td>
                            <td className="py-2 px-2 text-center text-xs font-black text-slate-700">
                              {observationDataStats.reduce((acc, curr) => acc + curr.TW, 0)}
                            </td>
                            <td className="py-2 px-2 text-center text-xs font-black text-slate-700">
                              {observationDataStats.reduce((acc, curr) => acc + curr.LW, 0)}
                            </td>
                            <td className="py-2 px-2 text-center text-xs font-black text-slate-700">
                              {observationDataStats.reduce((acc, curr) => acc + curr.MTD, 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Card: Missing Observation */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="mb-1">
                      <h2 className="font-bold text-lg">Missing Observation</h2>
                      <p className="text-[11px] text-slate-400 font-medium">Coaches with the most unobserved agents during the selected period.</p>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="w-32">
                        <Select
                          options={['Sales', 'Support', 'Specialty']}
                          selected={notObsDept}
                          onChange={setNotObsDept}
                          placeholder="LOB..."
                        />
                      </div>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={notObservedStats} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <Tooltip
                            cursor={{ fill: '#F8FAFC' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(val: any, name: any, props: any) => [`${val} Agents`, props.payload.fullName]}
                          />
                          <Bar dataKey="val" fill="#EF4444" radius={[2, 2, 0, 0]} barSize={16} />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }}
                            interval={0}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card: Recent Observations */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="mb-1">
                      <h2 className="font-bold text-lg">Recent Observations</h2>
                      <p className="text-[11px] text-slate-400 font-medium">Latest coaching sessions recorded in the system.</p>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={() => setRecentObsModalOpen(true)}
                        className="text-xs font-semibold text-brand-blue bg-brand-blue-light px-2.5 py-1 rounded-full hover:bg-brand-blue hover:text-white transition-colors"
                      >
                        View All
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {recentObservations.slice(0, 3).map((obs, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group"
                          onClick={() => setSelectedObs(obs)}
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: getAvatarColor(obs.agentName) }}>
                            {getInitials(obs.agentName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-slate-800 truncate">{obs.agentName}</h4>
                            <p className="text-[11px] text-slate-400 font-medium">By {obs.coachName} • {obs.date}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-brand-blue">{obs.rating}%</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase">Score</div>
                          </div>
                        </div>
                      ))}
                      {recentObservations.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-sm italic">No recent observations</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="flex flex-col gap-6">
                  {/* Card: Observation Index */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="mb-1">
                      <h2 className="font-bold text-lg">Observation Index</h2>
                      <p className="text-[11px] text-slate-400 font-medium">Daily observation trend lines per LOB over the selected period.</p>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={observationTrendData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Line type="monotone" dataKey="Sales" stroke="#4F7DF3" strokeWidth={2} dot={{ r: 2 }} name="Sales" />
                          <Line type="monotone" dataKey="Support" stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} name="Support" />
                          <Line type="monotone" dataKey="Specialty" stroke="#F59E0B" strokeWidth={2} dot={{ r: 2 }} name="Specialty" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card: LOB Completion Status */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="mb-2">
                      <h2 className="font-bold text-lg">LOB Completion</h2>
                      <p className="text-[11px] text-slate-400 font-medium">Percentage of agents observed per department during the selected period.</p>
                    </div>
                    <div className="h-[200px] w-full flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={lobsStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {lobsStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(val: any) => `${val}% Completed`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-slate-800">{overallCompletion}%</span>
                        <span className="text-xs text-slate-500">Overall</span>
                      </div>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      {lobsStats.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card: WOW Charts (Activity Comparison) */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <div className="mb-1">
                      <h2 className="font-bold text-lg">WOW Charts</h2>
                      <p className="text-[11px] text-slate-400 font-medium">Week-over-Week comparison of top observed agents ranked by monthly total.</p>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={() => setWowChartsModalOpen(true)}
                        className="text-[10px] font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-100 hover:bg-brand-blue hover:text-white transition-colors"
                      >
                        VIEW RANKINGS
                      </button>
                    </div>

                    <div className="flex flex-col">
                      {/* Mini Header */}
                      <div className="grid grid-cols-5 gap-1 mb-2 px-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        <div className="col-span-2">Agent</div>
                        <div className="text-center">TW</div>
                        <div className="text-center">LW</div>
                        <div className="text-right">WoW</div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {wowChartsData.slice(0, 10).map((agent, i) => {
                          const wowColor = agent.wow > 0 ? 'text-emerald-500' : agent.wow < 0 ? 'text-rose-500' : 'text-slate-300';
                          return (
                            <div key={i} className="grid grid-cols-5 gap-1 items-center p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 group">
                              <div className="col-span-2 flex items-center gap-2 min-w-0">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i < 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                                  {i + 1}
                                </div>
                                <span className="text-[11px] font-bold text-slate-700 truncate group-hover:text-brand-blue transition-colors">{agent.name}</span>
                              </div>
                              <div className="text-center text-xs font-bold text-slate-700">{agent.thisWeek}</div>
                              <div className="text-center text-xs font-bold text-slate-400">{agent.lastWeek}</div>
                              <div className={`text-right text-[10px] font-black ${wowColor}`}>
                                {agent.wow > 0 ? '▲' : agent.wow < 0 ? '▼' : '—'}
                                {agent.wow !== 0 && Math.abs(agent.wow)}
                              </div>
                            </div>
                          );
                        })}
                        {wowChartsData.length === 0 && (
                          <div className="text-center py-6 text-slate-400 text-sm italic">No data found</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="flex flex-col gap-6">


                  {/* Card: Completion Scores */}
                  <div className="bg-white rounded-2xl p-5 shadow-[var(--shadow-sm)] border border-[var(--border-light)]">
                    <h2 className="font-bold text-lg mb-0.5">Observation Completion (Agent)</h2>
                    <p className="text-[11px] text-slate-400 font-medium mb-2">Progress bars showing how many agents per LOB have been observed vs. total headcount.</p>
                    <div className="flex flex-col gap-4 mt-4">
                      {lobsStats.map((stat, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="font-bold text-slate-700">{stat.name}</span>
                            <span className="text-slate-500 font-medium">{stat.observed} / {stat.total}</span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${stat.value}%`, backgroundColor: stat.color }}
                            />
                          </div>
                          <div className="flex justify-end">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm ${stat.value === 100 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                              {stat.value}% COMPLETE
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: OBSERVATION - COACHES */}
          {activeView === "observation" && observationSubTab === "coaches" && (
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
                {/* Table Header */}
                <div className="bg-slate-50/80 border-b border-slate-100 flex items-center px-4 py-3 gap-4">
                  <div className="w-10 shrink-0"></div>
                  <div className="flex-1 font-bold text-xs text-slate-500 uppercase tracking-wider">Coach Details</div>
                  <div className="hidden sm:grid grid-cols-4 gap-4 flex-1 max-w-[450px] font-bold text-[10px] text-slate-400 uppercase tracking-widest text-center">
                    <div>This Week</div>
                    <div>Last Week</div>
                    <div>Month</div>
                    <div className="text-right">WoW Indicator</div>
                  </div>
                  <div className="w-5 pl-2"></div>
                </div>

                <div className="flex flex-col">
                  {COACHES.map((coach, i) => {
                    const initials = getInitials(coach.name);
                    const color = getAvatarColor(coach.name);

                    const thisWeek = getCoachPeriodCount(coach.name, weekStats.thisWeekStart);
                    const lastWeek = getCoachPeriodCount(coach.name, weekStats.lastWeekStart, weekStats.lastWeekEnd);
                    const month = getCoachPeriodCount(coach.name, weekStats.monthStart);

                    const wow = thisWeek - lastWeek;
                    const wowColor = wow > 0 ? 'text-emerald-600 bg-emerald-50' : wow < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-400 bg-slate-50';

                    return (
                      <div
                        key={i}
                        onClick={() => { setSelectedCoach(coach.name); setCoachModalOpen(true); }}
                        className="flex items-center gap-4 p-4 border-b border-slate-50 last:border-b-0 hover:bg-blue-50/30 cursor-pointer transition-all group"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-800 truncate group-hover:text-brand-blue transition-colors">{coach.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${coach.dept === 'Sales' ? 'bg-blue-50 text-blue-600' : coach.dept === 'Support' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                              }`}>{coach.dept}</span>
                          </div>
                        </div>

                        <div className="hidden sm:grid grid-cols-4 gap-4 flex-1 max-w-[450px] items-center text-center">
                          <div className="text-sm font-bold text-slate-700">{thisWeek}</div>
                          <div className="text-sm font-bold text-slate-400">{lastWeek}</div>
                          <div className="text-sm font-bold text-slate-700">{month}</div>
                          <div className="flex justify-end">
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black ${wowColor} min-w-[50px] justify-center`}>
                              {wow > 0 ? '▲' : wow < 0 ? '▼' : '—'}
                              {wow !== 0 && Math.abs(wow)}
                            </div>
                          </div>
                        </div>

                        <div className="text-slate-300 group-hover:text-brand-blue transition-colors pl-2">
                          <ChevronDown className="-rotate-90" size={18} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: OBSERVATION - AGENTS BY DEPARTMENT */}
          {activeView === "observation" && observationSubTab === "agents" && (
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
                      className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${selectedDept === dept
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
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  <div className="flex-1 text-left pl-14">Agent / Coach</div>
                  <div className="hidden sm:grid grid-cols-4 gap-4 flex-1 max-w-[450px]">
                    <div>This Week</div>
                    <div>Last Week</div>
                    <div>Month</div>
                    <div className="text-right">WoW Indicator</div>
                  </div>
                  <div className="w-5 pl-2"></div>
                </div>

                <div className="flex flex-col">
                  {getAgentsByDept(selectedDept).map((agent, i) => {
                    const initials = getInitials(agent.name);
                    const color = getAvatarColor(agent.name);

                    const thisWeek = getAgentPeriodCount(agent.name, weekStats.thisWeekStart);
                    const lastWeek = getAgentPeriodCount(agent.name, weekStats.lastWeekStart, weekStats.lastWeekEnd);
                    const month = getAgentPeriodCount(agent.name, weekStats.monthStart);

                    const wow = thisWeek - lastWeek;
                    const wowColor = wow > 0 ? 'text-emerald-600 bg-emerald-50' : wow < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-400 bg-slate-50';

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4 border-b border-[var(--border-light)] last:border-b-0 hover:bg-blue-50/30 transition-all group"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[var(--text-primary)] truncate group-hover:text-brand-blue transition-colors">{agent.name}</h3>
                          <p className="text-xs text-[var(--text-secondary)] truncate">Coach: {agent.coach}</p>
                        </div>

                        <div className="hidden sm:grid grid-cols-4 gap-4 flex-1 max-w-[450px] items-center text-center">
                          <div className="text-sm font-bold text-slate-700">{thisWeek}</div>
                          <div className="text-sm font-bold text-slate-400">{lastWeek}</div>
                          <div className="text-sm font-bold text-slate-700">{month}</div>
                          <div className="flex justify-end">
                            <div className={`px-2 py-1 rounded-md text-[10px] font-black ${wowColor} min-w-[40px] text-center`}>
                              {wow > 0 ? '▲ ' : wow < 0 ? '▼ ' : '—'}
                              {wow !== 0 && Math.abs(wow)}
                            </div>
                          </div>
                        </div>

                        <div className="text-slate-300 group-hover:text-brand-blue transition-colors pl-2">
                          <ChevronDown className="-rotate-90" size={18} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: HISTORY (ALL OBSERVATIONS) */}
          {activeView === "history" && (
            <div className="max-w-[1100px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">Observation History</h2>
                  <p className="text-[var(--text-secondary)] mt-1">Global log of all coaching sessions.</p>
                </div>
                <div className="flex gap-3">
                  {deleteMode && (
                    <button
                      onClick={() => {
                        if (selectedForDeletion.size === allObservations.length) {
                          setSelectedForDeletion(new Set());
                        } else {
                          setSelectedForDeletion(new Set(allObservations.map((obs: any) => obs._id)));
                        }
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors shadow-sm border border-slate-200"
                    >
                      {selectedForDeletion.size === allObservations.length && allObservations.length > 0 ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                  {deleteMode && selectedForDeletion.size > 0 && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${selectedForDeletion.size} observations?`)) {
                          deleteManyObservations({ ids: Array.from(selectedForDeletion) as any });
                          setSelectedForDeletion(new Set());
                          setDeleteMode(false);
                        }
                      }}
                      className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                    >
                      Delete {selectedForDeletion.size} Selected
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setDeleteMode(!deleteMode);
                      setSelectedForDeletion(new Set());
                    }}
                    className={`px-4 py-2 font-bold rounded-lg transition-colors shadow-sm ${deleteMode ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {deleteMode ? 'Cancel Selection' : 'Manage Data'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-[var(--shadow-sm)] border border-[var(--border-light)] overflow-hidden">
                <div className="p-4 border-b border-slate-50 bg-slate-50/50 grid grid-cols-5 gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  <div className="text-left pl-4">ID</div>
                  <div className="text-left">Agent</div>
                  <div className="text-left">Coach</div>
                  <div>Date</div>
                  <div className="text-right pr-4">LOB</div>
                </div>

                <div className="flex flex-col">
                  {allObservations.map((obs, i) => {
                    const isSelected = selectedForDeletion.has(obs._id);
                    return (
                      <div
                        key={obs._id}
                        onClick={() => {
                          if (deleteMode) {
                            const newSet = new Set(selectedForDeletion);
                            if (newSet.has(obs._id)) newSet.delete(obs._id);
                            else newSet.add(obs._id);
                            setSelectedForDeletion(newSet);
                          } else {
                            setSelectedObs(obs);
                          }
                        }}
                        className={`grid grid-cols-5 gap-4 items-center p-4 border-b border-slate-50 last:border-b-0 cursor-pointer transition-all group ${isSelected ? 'bg-red-50/80 border-l-4 border-l-red-500' : 'hover:bg-blue-50/30 border-l-4 border-l-transparent'
                          }`}
                      >
                        <div className="text-xs font-black text-brand-blue bg-blue-50 px-2 py-1 rounded w-fit">{obs._id.slice(-8).toUpperCase()}</div>
                        <div className="font-bold text-sm text-slate-700 truncate">{obs.agentName}</div>
                        <div className="text-sm text-slate-500 truncate">{obs.coachName}</div>
                        <div className="text-sm text-slate-400 text-center">{obs.date}</div>
                        <div className="text-right pr-4">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${obs.department.includes('Sales') ? 'bg-blue-50 text-blue-600' : obs.department.includes('Support') ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                            {obs.department[0]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {allObservations.length === 0 && (
                    <div className="py-20 text-center text-slate-400 italic">No observations found in history.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: BUSINESS VOLUME */}
          {activeView === "business-volume" && (
            <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                      <Briefcase size={20} />
                    </div>
                    Business Volume
                  </h2>
                  <p className="text-[var(--text-secondary)] mt-1 ml-[52px]">Track and analyze business volume metrics and reporting.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {[
                  { label: 'Total Volume', value: '—', desc: 'Overall business volume', color: 'from-blue-500 to-indigo-600', iconColor: 'text-blue-100' },
                  { label: 'Avg. Per Agent', value: '—', desc: 'Average volume per agent', color: 'from-emerald-500 to-teal-600', iconColor: 'text-emerald-100' },
                  { label: 'Growth Rate', value: '—', desc: 'Week-over-week change', color: 'from-amber-500 to-orange-600', iconColor: 'text-amber-100' },
                ].map((card, i) => (
                  <div key={i} className={`bg-gradient-to-br ${card.color} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden`}>
                    <div className="absolute top-3 right-3 opacity-20">
                      <TrendingUp size={48} />
                    </div>
                    <p className="text-sm font-semibold text-white/80 mb-1">{card.label}</p>
                    <p className="text-3xl font-black">{card.value}</p>
                    <p className="text-[11px] text-white/60 mt-2 font-medium">{card.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-[var(--shadow-sm)] border border-[var(--border-light)] flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
                  <BarChartIcon size={36} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Coming Soon</h3>
                <p className="text-sm text-slate-400 text-center max-w-md leading-relaxed">
                  Business volume reporting and analytics will be available here. This section will include volume trends, agent performance metrics, and departmental breakdowns.
                </p>
                <div className="flex gap-2 mt-6">
                  {['Volume Trends', 'Agent Metrics', 'LOB Breakdown'].map((tag, i) => (
                    <span key={i} className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* --- MODALS --- */}



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
                        onClick={() => { setCoachModalOpen(false); }}
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
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${isObserved
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


      {/* Recent Observations List Modal */}
      {recentObsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setRecentObsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] flex flex-col max-h-[80vh] relative z-10 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <History className="text-brand-blue" size={22} />
                Recent Observations
              </h2>
              <button onClick={() => setRecentObsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-3">
                {recentObservations.map((obs, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-200 group"
                    onClick={() => setSelectedObs(obs)}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ backgroundColor: getAvatarColor(obs.agentName) }}>
                      {getInitials(obs.agentName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 truncate">{obs.agentName}</h4>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded uppercase">MTD</span>
                        </div>
                        <span className="text-[10px] font-black text-brand-blue bg-blue-50 px-2 py-0.5 rounded uppercase">ID: {obs._id.slice(-8).toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Coached by <span className="font-semibold text-slate-700">{obs.coachName}</span></p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                        <Calendar size={10} /> {obs.date}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-lg font-black text-brand-blue">{obs.rating}%</div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <div key={s} className={`w-1 h-1 rounded-full ${s <= (obs.rating / 20) ? 'bg-brand-blue' : 'bg-slate-200'}`}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Observation Detail Modal (History View) */}
      {selectedObs && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedObs(null)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[800px] flex flex-col max-h-[90vh] relative z-10 animate-in zoom-in-95 duration-200">
            {/* Header matches Observation Form */}
            <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center bg-slate-50/50 rounded-t-2xl shrink-0">
              <div>
                <h2 className="text-xl font-bold">Observation History</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Review the observation details below.</p>
              </div>
              <button onClick={() => setSelectedObs(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* Grid 1: Basic Info (Same as form) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department</label>
                  <div className="w-full bg-slate-50 border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-slate-600 font-medium">
                    {selectedObs.department.join(', ') || 'Not specified'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date of Observation</label>
                  <div className="w-full bg-slate-50 border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-slate-600 font-medium">
                    {selectedObs.date}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Coach Name</label>
                  <div className="w-full bg-slate-50 border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-slate-600 font-medium">
                    {selectedObs.coachName}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Agent Name</label>
                  <div className="w-full bg-slate-50 border border-[var(--border-light)] rounded-lg px-4 py-2.5 flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow-sm shrink-0"
                      style={{ backgroundColor: getAvatarColor(selectedObs.agentName) }}
                    >
                      {getInitials(selectedObs.agentName)}
                    </div>
                    <span className="font-bold text-brand-blue truncate">{selectedObs.agentName}</span>
                  </div>
                </div>
              </div>

              {/* Grid 2: Observation Types */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Session Type</label>
                  <div className="w-full bg-slate-50 border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-slate-600 font-medium">
                    {selectedObs.sessionType.join(', ') || 'None'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categories</label>
                  <div className="w-full bg-slate-50 border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-slate-600 font-medium">
                    {selectedObs.categories.join(', ') || 'None'}
                  </div>
                </div>
              </div>

              {/* Rich Text Areas (Read-Only cards) */}
              <div className="flex flex-col gap-6 mb-8">
                {[
                  { label: 'Strengths', value: selectedObs.strengths },
                  { label: 'Areas of Opportunity', value: selectedObs.areasOfOpportunity },
                  { label: 'Root Cause Identification', value: selectedObs.rootCause },
                  { label: 'Action Plan', value: selectedObs.actionPlan },
                ].map(field => (
                  <div key={field.label}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{field.label}</label>
                    <div className="w-full min-h-[80px] bg-slate-50/50 border border-[var(--border-light)] rounded-xl p-4 text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {field.value || <span className="text-slate-400 italic">No notes provided.</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid 3: Rating & Additional */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Overall Performance Rating</label>
                  <div className="w-full bg-slate-50 border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-slate-600 font-bold">
                    {selectedObs.overallRating.join(', ') || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Order Number, Phone, or Email</label>
                  <div className="w-full bg-slate-50 border border-[var(--border-light)] rounded-lg px-4 py-2.5 text-slate-600 font-medium">
                    {selectedObs.orderNumber || 'None'}
                  </div>
                </div>
              </div>

              {/* Final Text Areas */}
              <div className="flex flex-col gap-6">
                {[
                  { label: 'Other Feedback, Comments and Insights', value: selectedObs.otherFeedback },
                  { label: 'Team Lead Feedback', value: selectedObs.teamLeadFeedback }
                ].map(field => (
                  <div key={field.label}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{field.label}</label>
                    <div className="w-full min-h-[80px] bg-slate-50/50 border border-[var(--border-light)] rounded-xl p-4 text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {field.value || <span className="text-slate-400 italic">No additional feedback provided.</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-light)] flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl shrink-0">
              <button
                onClick={() => setSelectedObs(null)}
                className="px-6 py-2.5 rounded-xl font-bold bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-[0.98]"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WOW Charts Modal */}
      {wowChartsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setWowChartsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[650px] flex flex-col max-h-[80vh] relative z-10 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <BarChartIcon className="text-brand-blue" size={22} />
                WOW Charts
              </h2>
              <button onClick={() => setWowChartsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
              <div className="w-10">Rank</div>
              <div className="flex-1 text-left">Agent</div>
              <div className="w-16">This Week</div>
              <div className="w-16">Last Week</div>
              <div className="w-16">Month</div>
              <div className="w-16 text-right">WoW</div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-1">
                {wowChartsData.slice(0, 10).map((agent, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-100 group"
                    onClick={() => { setWowChartsModalOpen(false); }}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: getAvatarColor(agent.name) }}>
                        {getInitials(agent.name)}
                      </div>
                      <span className="font-bold text-slate-700 truncate group-hover:text-brand-blue transition-colors">{agent.name}</span>
                    </div>
                    <div className="w-16 text-center text-sm font-bold text-slate-800">{agent.thisWeek}</div>
                    <div className="w-16 text-center text-sm font-bold text-slate-400">{agent.lastWeek}</div>
                    <div className="w-16 text-center text-sm font-bold text-brand-blue bg-blue-50/50 rounded-md py-1">{agent.month}</div>
                    <div className="w-16 flex justify-end">
                      <div className={`px-2 py-1 rounded-md text-[10px] font-black ${agent.wow > 0 ? 'text-emerald-500 bg-emerald-50' : agent.wow < 0 ? 'text-rose-500 bg-rose-50' : 'text-slate-400 bg-slate-50'} min-w-[40px] text-center`}>
                        {agent.wow > 0 ? '▲' : agent.wow < 0 ? '▼' : '—'}
                        {agent.wow !== 0 && Math.abs(agent.wow)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ranked by Total Observations This Month</p>
            </div>
          </div>
        </div>
      )}

      {/* Focused Note Viewer Modal */}
      {expandedNote && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setExpandedNote(null)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[600px] flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Viewing Detail</h3>
                  <p className="text-sm font-bold text-brand-blue">{expandedNote.label}</p>
                </div>
              </div>
              <button onClick={() => setExpandedNote(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              <div className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap font-medium">
                {expandedNote.content}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/30">
              <button
                onClick={() => setExpandedNote(null)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all"
              >
                Done Reading
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

function Select({ options, selected, onChange, placeholder }: { options: string[], selected: string, onChange: (val: string) => void, placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <div
        className="w-full bg-white border border-[var(--border-light)] rounded-lg px-4 py-2.5 flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue min-h-[46px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selected ? "text-slate-800 font-medium" : "text-slate-400 text-sm"}>
          {selected || placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border-light)] rounded-xl shadow-xl z-[70] py-1 max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
            {options.map(option => (
              <div
                key={option}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between
                  ${selected === option ? 'bg-brand-blue-light text-brand-blue font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => { onChange(option); setIsOpen(false); }}
              >
                <span>{option}</span>
                {selected === option && <Check size={14} />}
              </div>
            ))}
          </div>
        </>
      )}
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
