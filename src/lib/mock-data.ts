export type Player = {
  id: string;
  name: string;
  initials: string;
  subtitle: string;
  points: number;
  lastFive: ("hit" | "miss" | "partial")[];
  winProbability: number;
  isCurrentUser?: boolean;
};

export type FixtureStatus = "NS" | "1H" | "HT" | "2H" | "FT" | "ET" | "PEN";

export type Goalkeeper = {
  name: string;
  substituted: boolean;
  redCard: boolean;
};

export type LiveMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: FixtureStatus;
  homeGk: Goalkeeper;
  awayGk: Goalkeeper;
  tableProjection: {
    player: string;
    pointsDelta: number;
  };
};

export type UpcomingMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  date: string;
  time: string;
  userPrediction: { home: number; away: number } | null;
};

export type Insight = {
  id: string;
  icon: string;
  title: string;
  value: string;
  subtitle: string;
};

export const CURRENT_USER_ID = "alex";

export const players: Player[] = [
  {
    id: "marta",
    name: "Marta García",
    initials: "MG",
    subtitle: "Campeona Invierno 2024",
    points: 1240,
    lastFive: ["hit", "hit", "hit", "hit", "hit"],
    winProbability: 42,
  },
  {
    id: "alex",
    name: "Alex Fernández",
    initials: "AF",
    subtitle: "En racha de aciertos",
    points: 1215,
    lastFive: ["hit", "hit", "hit", "hit", "hit"],
    winProbability: 35,
    isCurrentUser: true,
  },
  {
    id: "luis",
    name: "Luis Sánchez",
    initials: "LS",
    subtitle: "El Rey del 90'",
    points: 1098,
    lastFive: ["hit", "miss", "hit", "hit", "hit"],
    winProbability: 12,
  },
  {
    id: "sofia",
    name: "Sofía Rodríguez",
    initials: "SR",
    subtitle: "Especialista en sorpresas",
    points: 980,
    lastFive: ["miss", "hit", "miss", "hit", "hit"],
    winProbability: 8,
  },
  {
    id: "otros",
    name: "Otros",
    initials: "OT",
    subtitle: "",
    points: 0,
    lastFive: [],
    winProbability: 3,
  },
];

export const liveMatches: LiveMatch[] = [
  {
    id: "bra-fra",
    homeTeam: "BRA",
    awayTeam: "FRA",
    homeFlag: "🇧🇷",
    awayFlag: "🇫🇷",
    homeScore: 2,
    awayScore: 1,
    minute: 72,
    status: "2H",
    homeGk: { name: "Ederson", substituted: false, redCard: false },
    awayGk: { name: "Maignan", substituted: false, redCard: false },
    tableProjection: {
      player: "Brasil",
      pointsDelta: 12,
    },
  },
];

export const upcomingMatches: UpcomingMatch[] = [
  {
    id: "ger-jpn",
    homeTeam: "GER",
    awayTeam: "JPN",
    homeFlag: "🇩🇪",
    awayFlag: "🇯🇵",
    date: "HOY",
    time: "20:00 CET",
    userPrediction: { home: 3, away: 1 },
  },
  {
    id: "arg-mex",
    homeTeam: "ARG",
    awayTeam: "MEX",
    homeFlag: "🇦🇷",
    awayFlag: "🇲🇽",
    date: "MAÑANA",
    time: "17:00 CET",
    userPrediction: null,
  },
  {
    id: "esp-por",
    homeTeam: "ESP",
    awayTeam: "POR",
    homeFlag: "🇪🇸",
    awayFlag: "🇵🇹",
    date: "MAÑANA",
    time: "21:00 CET",
    userPrediction: { home: 2, away: 2 },
  },
];

export const insights: Insight[] = [
  {
    id: "racha",
    icon: "⚡",
    title: "Jugador más en racha",
    value: "Alex Fernández",
    subtitle: "5 aciertos seguidos 🔥",
  },
  {
    id: "arriesgada",
    icon: "📊",
    title: "Predicción más arriesgada",
    value: "Marta García",
    subtitle: "Empate KSA-ARG (1/100) 🎯",
  },
  {
    id: "nadie",
    icon: "😱",
    title: "Nadie apostó por esto",
    value: "Costa Rica 2-0",
    subtitle: "vs España (0.1% acierto) 😮",
  },
  {
    id: "sufrido",
    icon: "💔",
    title: "Más sufrido (Min 90)",
    value: "Luis Sánchez",
    subtitle: "3 goles en descuento 💔",
  },
];

export const aiInsight =
  "Basado en los últimos 10 partidos, Alex Fernández tiene un 80% de aciertos en marcadores exactos. Si mantiene esta racha, su probabilidad de victoria final subirá al 48% antes de semis.";
