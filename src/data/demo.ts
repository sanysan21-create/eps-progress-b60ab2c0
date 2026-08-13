export type Level = 1 | 2 | 3 | 4 | 5;

export const LEVEL_LABELS: Record<Level, string> = {
  1: "Découverte",
  2: "Initié",
  3: "Confirmé",
  4: "Avancé",
  5: "Expert",
};

export type Competency = {
  id: string;
  name: string;
  level: Level;
  progress: number; // 0-100 vers le niveau suivant
};

export type Activity = {
  id: string;
  name: string;
  cycle: string;
  level: Level;
  summary: string;
  competencies: Competency[];
};

export type HistoryEntry = {
  id: string;
  date: string;
  title: string;
  detail: string;
  highlight?: boolean;
};

export type Objective = {
  id: string;
  label: string;
  done: boolean;
  activity: string;
};

export type Achievement = {
  id: string;
  title: string;
  detail: string;
  date: string;
  unlocked: boolean;
};

export const student = {
  firstName: "Lucas",
  lastName: "Bernard",
  className: "2nde A",
  initials: "LB",
  globalLevel: 4,
  globalScore: 3.8,
  trend: "+12% vs mois dernier",
  attendance: 96,
  evaluations: 14,
  badges: 7,
};

export const studentActivities: Activity[] = [
  {
    id: "natation",
    name: "Natation",
    cycle: "Cycle 3",
    level: 3,
    summary: "Maîtrise du crawl et virages compétitifs.",
    competencies: [
      { id: "crawl", name: "Technique de crawl", level: 4, progress: 72 },
      { id: "virage", name: "Virage culbute", level: 2, progress: 40 },
      { id: "endurance-nat", name: "Endurance 200 m", level: 3, progress: 55 },
    ],
  },
  {
    id: "basket",
    name: "Basket-ball",
    cycle: "Cycle 2",
    level: 4,
    summary: "Démarquage et tir en course validés.",
    competencies: [
      { id: "tir", name: "Tir en course", level: 4, progress: 80 },
      { id: "demarquage", name: "Démarquage", level: 4, progress: 68 },
      { id: "collectif", name: "Jeu collectif", level: 3, progress: 45 },
    ],
  },
  {
    id: "athletisme",
    name: "Athlétisme",
    cycle: "Cycle 1",
    level: 5,
    summary: "Départ en blocs et relais maîtrisés.",
    competencies: [
      { id: "sprint", name: "Sprint 50 m", level: 5, progress: 95 },
      { id: "relais", name: "Passage de relais", level: 4, progress: 70 },
      { id: "saut", name: "Saut en hauteur", level: 4, progress: 62 },
    ],
  },
  {
    id: "gymnastique",
    name: "Gymnastique",
    cycle: "Cycle 4",
    level: 2,
    summary: "Enchaînement au sol en construction.",
    competencies: [
      { id: "rotation", name: "Rotations", level: 2, progress: 38 },
      { id: "equilibre", name: "Équilibre poutre", level: 2, progress: 30 },
      { id: "enchainement", name: "Enchaînement libre", level: 1, progress: 20 },
    ],
  },
];

export const studentHistory: HistoryEntry[] = [
  {
    id: "h1",
    date: "14 octobre",
    title: "Niveau 4 validé — Saut en hauteur",
    detail: "Barre franchie à 1 m 45, technique de ciseaux stabilisée.",
    highlight: true,
  },
  {
    id: "h2",
    date: "07 octobre",
    title: "Progression Basket-ball",
    detail: "Tir en course : 8 réussites sur 10 en situation de match.",
  },
  {
    id: "h3",
    date: "02 octobre",
    title: "Nouvel objectif fixé",
    detail: "Endurance 12 minutes sans marcher.",
  },
  {
    id: "h4",
    date: "23 septembre",
    title: "Niveau 3 validé — Natation",
    detail: "200 m crawl en continu, respiration régulière.",
  },
];

export const studentObjectives: Objective[] = [
  { id: "o1", label: "Améliorer le record 50 m", done: false, activity: "Athlétisme" },
  { id: "o2", label: "Participation à l'arbitrage", done: true, activity: "Basket-ball" },
  { id: "o3", label: "Virage culbute sans appui", done: false, activity: "Natation" },
  { id: "o4", label: "Enchaîner 3 figures au sol", done: false, activity: "Gymnastique" },
];

export const studentAchievements: Achievement[] = [
  { id: "a1", title: "Badge Endurance Or", detail: "12 minutes course continue", date: "12 oct.", unlocked: true },
  { id: "a2", title: "Sprinteur", detail: "Niveau 5 en sprint 50 m", date: "05 oct.", unlocked: true },
  { id: "a3", title: "Esprit d'équipe", detail: "10 passes décisives", date: "28 sept.", unlocked: true },
  { id: "a4", title: "Maître du plongeon", detail: "Départ plongé validé", date: "À débloquer", unlocked: false },
];

export const progressionSeries = [
  { month: "Sept.", value: 2.6 },
  { month: "Oct.", value: 2.9 },
  { month: "Nov.", value: 3.1 },
  { month: "Déc.", value: 3.3 },
  { month: "Janv.", value: 3.6 },
  { month: "Févr.", value: 3.8 },
];

export type ClassRoom = {
  id: string;
  name: string;
  code: string;
  option: string;
  studentCount: number;
  averageLevel: number;
};

export const classes: ClassRoom[] = [
  { id: "2a", name: "2nde A", code: "2A", option: "Option sport", studentCount: 28, averageLevel: 3.6 },
  { id: "3b", name: "3ème B", code: "3B", option: "Mixte", studentCount: 26, averageLevel: 3.1 },
  { id: "4c", name: "4ème C", code: "4C", option: "Athlétisme", studentCount: 24, averageLevel: 2.8 },
  { id: "ts1", name: "Terminale S1", code: "TS1", option: "Mixte", studentCount: 32, averageLevel: 4.1 },
];

export type Pupil = {
  id: string;
  name: string;
  classId: string;
  level: Level;
  lastEval: string;
  trend: "up" | "flat" | "new";
};

export const pupils: Pupil[] = [
  { id: "p1", name: "Alice MARTIN", classId: "2a", level: 4, lastEval: "Hier", trend: "up" },
  { id: "p2", name: "Thomas DUPONT", classId: "2a", level: 3, lastEval: "02 oct.", trend: "flat" },
  { id: "p3", name: "Sarah KHELIFA", classId: "2a", level: 5, lastEval: "10 oct.", trend: "up" },
  { id: "p4", name: "Lucas BERNARD", classId: "2a", level: 4, lastEval: "14 oct.", trend: "up" },
  { id: "p5", name: "Inès MOREAU", classId: "2a", level: 2, lastEval: "28 sept.", trend: "flat" },
  { id: "p6", name: "Kevin LEROY", classId: "2a", level: 3, lastEval: "Jamais", trend: "new" },
  { id: "p7", name: "Nora BENALI", classId: "3b", level: 4, lastEval: "11 oct.", trend: "up" },
  { id: "p8", name: "Hugo PETIT", classId: "3b", level: 2, lastEval: "05 oct.", trend: "flat" },
  { id: "p9", name: "Camille ROUX", classId: "4c", level: 3, lastEval: "09 oct.", trend: "up" },
  { id: "p10", name: "Yanis FABRE", classId: "ts1", level: 5, lastEval: "13 oct.", trend: "up" },
];

export type TeacherActivity = {
  id: string;
  name: string;
  cycle: string;
  competencies: string[];
  levels: { level: Level; label: string; descriptor: string }[];
};

export const teacherActivities: TeacherActivity[] = [
  {
    id: "gym",
    name: "Gymnastique",
    cycle: "Cycle 4",
    competencies: ["Rotations", "Équilibre", "Enchaînement"],
    levels: [
      { level: 1, label: "Découverte", descriptor: "Réalise des figures simples avec aide." },
      { level: 2, label: "Initié", descriptor: "Enchaîne deux rotations sans chute." },
      { level: 3, label: "Confirmé", descriptor: "Maintient l'équilibre sur la poutre sur 3 mètres." },
      { level: 4, label: "Avancé", descriptor: "Enchaîne 4 éléments avec fluidité." },
      { level: 5, label: "Expert", descriptor: "Compose et présente un enchaînement complet noté." },
    ],
  },
  {
    id: "nat",
    name: "Natation",
    cycle: "Cycle 3",
    competencies: ["Crawl", "Virage", "Endurance"],
    levels: [
      { level: 1, label: "Découverte", descriptor: "Se déplace 25 m avec matériel." },
      { level: 2, label: "Initié", descriptor: "Nage 50 m en crawl sans arrêt." },
      { level: 3, label: "Confirmé", descriptor: "Nage 200 m avec respiration régulière." },
      { level: 4, label: "Avancé", descriptor: "Réalise virages culbute et départ plongé." },
      { level: 5, label: "Expert", descriptor: "Gère une allure de course sur 400 m." },
    ],
  },
  {
    id: "bask",
    name: "Basket-ball",
    cycle: "Cycle 2",
    competencies: ["Tir", "Démarquage", "Jeu collectif"],
    levels: [
      { level: 1, label: "Découverte", descriptor: "Dribble et passe à l'arrêt." },
      { level: 2, label: "Initié", descriptor: "Passe en mouvement, tir proche du panier." },
      { level: 3, label: "Confirmé", descriptor: "Tir en course, se démarque utilement." },
      { level: 4, label: "Avancé", descriptor: "Lit le jeu et crée un décalage." },
      { level: 5, label: "Expert", descriptor: "Organise le jeu collectif et arbitre." },
    ],
  },
];
