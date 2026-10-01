/**
 * Données de démo pour les captures d'écran de la documentation d'aide.
 *
 * Crée un univers fictif complet — deux lycées, deux collèges, un compte par rôle,
 * des mini-stages passés, du jour et à venir, des élèves à chaque étape — dans la
 * base `bacastages_docs`, et nulle part ailleurs.
 *
 * Lancer par `seed-demo.sh`, qui résout la base et les modules du back :
 *
 *   ./seed-demo.sh           # nettoie puis recrée l'univers
 *   ./seed-demo.sh --clean   # nettoie seulement
 *
 * Idempotent : tout ce qui est démo est repéré par des marqueurs fiables et supprimé
 * avant d'être recréé —
 *   - établissements : UAI commençant par `999000` (aucun UAI réel ne commence par 999) ;
 *   - comptes : adresse en `@demo.bacastages.fr` ;
 *   - identifiants techniques : préfixe `d0c5a000-`.
 *
 * Toutes les dates sont calculées depuis le jour d'exécution (heure de Paris) et
 * l'année scolaire en cours : relancer le script avant une séance de captures suffit
 * à les garder actuelles.
 *
 * Les lignes sont écrites avec Prisma, dans la forme exacte que produisent les mappers
 * de persistance du back (`sessionMapper`, `participantMapper`, `preregistrationMapper`…)
 * et en respectant les invariants des entités qui les relisent (convention déposée ⇒
 * `uploadedAt` + `uploadedBy`, parcours de signature ⇒ PDF source + bon nombre de
 * destinataires, etc.). Le hachage des mots de passe reprend `Password.fromPlainText`
 * (bcrypt, coût 12).
 */
import { createRequire } from "node:module";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Modules du back : ce fichier vit hors du dépôt back, ses dépendances non.
// ---------------------------------------------------------------------------

const BACK_DIR = process.env.BACK_DIR;
if (!BACK_DIR) {
    throw new Error("BACK_DIR absent : lancer ce script par seed-demo.sh.");
}
const requireBack = createRequire(path.join(path.resolve(BACK_DIR), "package.json"));
const { PrismaClient } = requireBack("@prisma/client");
const bcrypt = requireBack("bcrypt");
const dayjs = requireBack("dayjs");
dayjs.extend(requireBack("dayjs/plugin/utc"));
dayjs.extend(requireBack("dayjs/plugin/timezone"));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

// ---------------------------------------------------------------------------
// Garde-fou : bacastages_docs, et rien d'autre.
// ---------------------------------------------------------------------------

const TARGET_DATABASE = "bacastages_docs";

function assertTargetFromUrl(): void {
    if (process.env.NODE_ENV === "production") {
        throw new Error("NODE_ENV=production : refus.");
    }
    const raw = process.env.DATABASE_URL;
    if (!raw) throw new Error("DATABASE_URL absent.");
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new Error("DATABASE_URL illisible.");
    }
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    if (database !== TARGET_DATABASE) {
        throw new Error(`Base visée « ${database} » : ce script n'écrit que dans « ${TARGET_DATABASE} ». Refus.`);
    }
}

async function assertTargetFromServer(prisma: Any): Promise<void> {
    const rows: Array<{ current_database: string }> = await prisma.$queryRawUnsafe("select current_database()");
    const current = rows[0]?.current_database;
    if (current !== TARGET_DATABASE) {
        throw new Error(`Le serveur répond depuis « ${current} », pas « ${TARGET_DATABASE} ». Refus.`);
    }
}

// ---------------------------------------------------------------------------
// Marqueurs et constantes
// ---------------------------------------------------------------------------

const DEMO_DOMAIN = "demo.bacastages.fr";
const UAI_PREFIX = "999000";
const ID_PREFIX = "d0c5a000-";
/** Satisfait PASSWORD_REGEX : minuscule, majuscule, chiffre, caractère spécial, 8+ caractères. */
const DEMO_PASSWORD = "Demo-Bacastages-2026";
/** Seul numéro admis par le garde-fou du dépôt public (numéro d'exemple du formulaire). */
const PHONE = "06 12 34 56 78";
const TZ = "Europe/Paris";
const SHA_PLACEHOLDER = "0".repeat(64);

const uuid = (n: number): string => `${ID_PREFIX}0000-4000-8000-${String(n).padStart(12, "0")}`;
const mail = (local: string): string => `${local}@${DEMO_DOMAIN}`;

let idCounter = 5000;
const nextId = (): string => uuid(idCounter++);

// ---------------------------------------------------------------------------
// Dates : tout est relatif au jour d'exécution, en heure de Paris.
// ---------------------------------------------------------------------------

const NOW = new Date();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const todayParis = dayjs().tz(TZ);
const TODAY_YMD: [number, number, number] = [todayParis.year(), todayParis.month(), todayParis.date()];

const ACADEMIC_START_YEAR = TODAY_YMD[1] >= 8 ? TODAY_YMD[0] : TODAY_YMD[0] - 1;
const ACADEMIC_YEAR_ID = `${ACADEMIC_START_YEAR}-${ACADEMIC_START_YEAR + 1}`;
const ACADEMIC_YEAR_START: Date = dayjs.tz(`${ACADEMIC_START_YEAR}-09-01`, TZ).toDate();
const ACADEMIC_YEAR_END: Date = dayjs.tz(`${ACADEMIC_START_YEAR + 1}-08-31`, TZ).endOf("day").toDate();

/** Jour civil manipulé en UTC pur : l'arithmétique des jours ne traverse aucun changement d'heure. */
type CivilDay = number; // ms à minuit UTC du jour civil

const civil = (y: number, m: number, d: number): CivilDay => Date.UTC(y, m, d);
const TODAY: CivilDay = civil(...TODAY_YMD);
const YEAR_START: CivilDay = civil(ACADEMIC_START_YEAR, 8, 1);
const weekday = (day: CivilDay): number => new Date(day).getUTCDay();
const isWeekend = (day: CivilDay): boolean => weekday(day) === 0 || weekday(day) === 6;
const ymd = (day: CivilDay): string => new Date(day).toISOString().slice(0, 10);

/** Minuit à Paris du jour civil — la forme que `DateUtils.parseFromFront` donne aux dates de planning. */
const parisMidnight = (day: CivilDay): Date => dayjs.tz(ymd(day), TZ).toDate();
/** Heure donnée, à Paris, du jour civil. */
const parisAt = (day: CivilDay, hhmm: string): Date => dayjs.tz(`${ymd(day)} ${hhmm}`, TZ).toDate();

const warnings: string[] = [];

/**
 * Jour ouvré décalé de `offset` jours ouvrés depuis aujourd'hui.
 *
 * Les jours passés restent dans l'année scolaire en cours tant que c'est possible :
 * les statistiques ne calculent en direct que l'année en cours. Début septembre, il
 * n'y a pas toujours la place — le jour est alors gardé tel quel, et signalé.
 */
function schoolDay(offset: number, durationDays = 1): CivilDay {
    let day = TODAY;
    const step = offset >= 0 ? 1 : -1;
    let remaining = Math.abs(offset);
    while (remaining > 0) {
        day += step * DAY;
        if (!isWeekend(day)) remaining--;
    }
    if (offset > 0 || (offset === 0 && isWeekend(day))) {
        while (isWeekend(day)) day += DAY;
    }
    // Les jours d'un mini-stage doivent être consécutifs (MinistageSchedule) : pas de week-end au milieu.
    if (durationDays > 1) {
        while (isWeekend(day) || isWeekend(day + (durationDays - 1) * DAY) || weekday(day) + durationDays - 1 > 5) {
            day += step >= 0 ? DAY : -DAY;
        }
    }
    if (offset < 0 && day < YEAR_START) {
        let clamped = YEAR_START;
        while (isWeekend(clamped)) clamped += DAY;
        if (clamped < TODAY) {
            day = clamped;
        } else {
            warnings.push(
                `Le ${ymd(day)} tombe avant la rentrée ${ACADEMIC_START_YEAR} : ce mini-stage passé comptera dans ` +
                    "l'année précédente (statistiques de l'année en cours incomplètes)."
            );
        }
    }
    return day;
}

const before = (date: Date, ms: number): Date => new Date(date.getTime() - ms);
const notAfterNow = (date: Date, marginMs = MINUTE): Date =>
    date.getTime() > NOW.getTime() - marginMs ? new Date(NOW.getTime() - marginMs) : date;

// ---------------------------------------------------------------------------
// Établissements
// ---------------------------------------------------------------------------

interface Person {
    gender: "M." | "Mme.";
    firstName: string;
    lastName: string;
    email: string;
    title: string;
}

interface SchoolDef {
    uai: string;
    siteId: 1;
    officialName: string;
    shortName: string;
    nature: string;
    natureId: number;
    establishmentType: string;
    address: string;
    zipCode: string;
    city: string;
    latitude: string;
    longitude: string;
    studentsNumber: number;
    head: Person;
    contactEmail: string;
    /** Secrétariat qui reçoit les conventions à expédier (`emailToSendConvention`). */
    dispatchEmail: string;
    /** Nom porté dans `uploadedBy` quand l'établissement dépose une convention. */
    uploaderName: string;
}

const HOST: SchoolDef = {
    uai: "9990001A",
    siteId: 1,
    officialName: "Lycée professionnel du Val d'Arnon",
    shortName: "lycée du Val d'Arnon",
    nature: "LYCEE PROFESSIONNEL",
    natureId: 320,
    establishmentType: "Lycée professionnel",
    address: "12 avenue des Tanneurs",
    zipCode: "18990",
    city: "Arnay-la-Rivière",
    latitude: "47,0833",
    longitude: "2,3950",
    studentsNumber: 640,
    head: { gender: "M.", firstName: "Philippe", lastName: "Rousseau", email: mail("philippe.rousseau"), title: "Proviseur" },
    contactEmail: mail("accueil.val-arnon"),
    dispatchEmail: mail("secretariat.val-arnon"),
    uploaderName: "Secrétariat du lycée du Val d'Arnon",
};

const COLLEGE_A: SchoolDef = {
    uai: "9990002B",
    siteId: 1,
    officialName: "Collège Les Châtaigniers",
    shortName: "collège Les Châtaigniers",
    nature: "COLLEGE",
    natureId: 340,
    establishmentType: "Collège",
    address: "3 rue des Écoles",
    zipCode: "18990",
    city: "Arnay-la-Rivière",
    latitude: "47,0791",
    longitude: "2,4012",
    studentsNumber: 520,
    head: { gender: "M.", firstName: "Frédéric", lastName: "Noël", email: mail("frederic.noel"), title: "Principal" },
    contactEmail: mail("accueil.chataigniers"),
    dispatchEmail: mail("secretariat.chataigniers"),
    uploaderName: "Véronique Blanc",
};

const COLLEGE_B: SchoolDef = {
    uai: "9990003C",
    siteId: 1,
    officialName: "Collège de la Garenne",
    shortName: "collège de la Garenne",
    nature: "COLLEGE",
    natureId: 340,
    establishmentType: "Collège",
    address: "8 chemin de la Garenne",
    zipCode: "18991",
    city: "Villiers-le-Moutier",
    latitude: "47,1240",
    longitude: "2,3318",
    studentsNumber: 410,
    head: { gender: "Mme.", firstName: "Hélène", lastName: "Roche", email: mail("helene.roche"), title: "Principale" },
    contactEmail: mail("accueil.garenne"),
    dispatchEmail: mail("secretariat.garenne"),
    uploaderName: "Secrétariat du collège de la Garenne",
};

const LYCEE_B: SchoolDef = {
    uai: "9990004D",
    siteId: 1,
    officialName: "Lycée polyvalent des Coteaux",
    shortName: "lycée des Coteaux",
    nature: "LYCEE POLYVALENT",
    natureId: 306,
    establishmentType: "Lycée polyvalent",
    address: "25 boulevard des Coteaux",
    zipCode: "18992",
    city: "Bellerive-sur-Arnon",
    latitude: "47,0512",
    longitude: "2,4478",
    studentsNumber: 1180,
    head: { gender: "Mme.", firstName: "Anne-Sophie", lastName: "Perrin", email: mail("anne-sophie.perrin"), title: "Proviseure" },
    contactEmail: mail("accueil.coteaux"),
    dispatchEmail: mail("vie-scolaire.coteaux"),
    uploaderName: "Vie scolaire du lycée des Coteaux",
};

/*
  Le lycée qui vient d'arriver. Il n'a que sa ligne `schools` et un compte
  administrateur : ni informations, ni professeurs, ni filières, ni réglages — donc pas
  de ligne `school_settings` non plus, ce que le produit sait faire (`schoolService.ts`
  crée la ligne au premier enregistrement, et son commentaire note que c'est « le cas
  courant du collège »).

  Il porte en revanche un **abonnement actif**, et c'est lui qui décide : le panneau
  n'affiche ses six étapes qu'en mode `SETUP`, et `resolveOnboardingMode`
  (`schoolOnboardingPolicy.ts`) rend `NONE` — deux étapes — dès qu'il n'y a pas
  d'abonnement, quel que soit le type d'établissement. Un lycée qui vient de créer son
  compte sans s'abonner voit donc deux étapes, pas six.

  Il existe pour les deux articles de mise en place d'un lycée dans « Premiers pas » :
  ils décrivent le panneau tel qu'un établissement le découvre, six étapes à faire. Sur
  les quatre autres établissements, déjà configurés, ce panneau n'affiche plus que des
  boutons « Modifier » — on ne peut pas illustrer une arrivée avec eux.
*/
const LYCEE_NEUF: SchoolDef = {
    uai: "9990005E",
    siteId: 1,
    officialName: "Lycée des métiers de la Sablière",
    shortName: "lycée de la Sablière",
    nature: "LYCEE PROFESSIONNEL",
    natureId: 320,
    establishmentType: "Lycée professionnel",
    address: "4 route de la Sablière",
    zipCode: "18993",
    city: "Pont-sur-Arnon",
    latitude: "47,0955",
    longitude: "2,4820",
    studentsNumber: 480,
    head: { gender: "Mme.", firstName: "Nathalie", lastName: "Faure", email: mail("nathalie.faure"), title: "Proviseure" },
    contactEmail: mail("accueil.sabliere"),
    dispatchEmail: mail("secretariat.sabliere"),
    uploaderName: "Secrétariat du lycée de la Sablière",
};

/*
  Le collège qui vient d'arriver — même dénuement, et **sans abonnement**. Son panneau
  est donc le mode `NONE` : deux étapes, toutes deux bloquantes, « Informations de
  l'établissement » puis « Signataire des conventions ». C'est ce que décrit
  `college-lycee-cio/2`, et les deux collèges installés de la démo ont déjà tout fait.
*/
const COLLEGE_NEUF: SchoolDef = {
    uai: "9990006F",
    siteId: 1,
    officialName: "Collège du Pré-aux-Clercs",
    shortName: "collège du Pré-aux-Clercs",
    nature: "COLLEGE",
    natureId: 340,
    establishmentType: "Collège",
    address: "17 rue du Pré-aux-Clercs",
    zipCode: "18993",
    city: "Pont-sur-Arnon",
    latitude: "47,0902",
    longitude: "2,4765",
    studentsNumber: 350,
    head: { gender: "M.", firstName: "Olivier", lastName: "Chevrier", email: mail("olivier.chevrier"), title: "Principal" },
    contactEmail: mail("accueil.pre-aux-clercs"),
    dispatchEmail: mail("secretariat.pre-aux-clercs"),
    uploaderName: "Secrétariat du collège du Pré-aux-Clercs",
};

const SCHOOLS = [HOST, COLLEGE_A, COLLEGE_B, LYCEE_B, LYCEE_NEUF, COLLEGE_NEUF];

/** Les établissements déjà installés — tous sauf les deux qui viennent d'arriver. */
const NEW_SCHOOLS = [LYCEE_NEUF, COLLEGE_NEUF];
const CONFIGURED_SCHOOLS = SCHOOLS.filter((school) => !NEW_SCHOOLS.includes(school));

// ---------------------------------------------------------------------------
// Comptes
// ---------------------------------------------------------------------------

interface UserDef {
    id: string;
    key: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    school: SchoolDef;
    /** Faux pour le super_admin : il n'apparaît pas dans la liste des comptes d'un établissement. */
    member?: boolean;
    extra?: Record<string, unknown>;
}

const U = {
    proviseur: { id: uuid(1), key: "proviseur", firstName: "Philippe", lastName: "Rousseau", email: HOST.head.email, role: "school_admin", school: HOST },
    ddf: { id: uuid(2), key: "ddf", firstName: "Karine", lastName: "Lemoine", email: mail("karine.lemoine"), role: "ddf", school: HOST },
    prof: { id: uuid(3), key: "prof", firstName: "Julien", lastName: "Moreau", email: mail("julien.moreau"), role: "professor", school: HOST },
    vieScolaire: { id: uuid(4), key: "vie-scolaire", firstName: "Sandrine", lastName: "Vidal", email: mail("sandrine.vidal"), role: "viewer", school: HOST },
    inscriptions: { id: uuid(5), key: "inscriptions", firstName: "Véronique", lastName: "Blanc", email: mail("veronique.blanc"), role: "college", school: COLLEGE_A },
    principal: { id: uuid(6), key: "principal", firstName: "Frédéric", lastName: "Noël", email: COLLEGE_A.head.email, role: "school_admin", school: COLLEGE_A },
    parent: { id: uuid(7), key: "parent", firstName: "Céline", lastName: "Martin", email: mail("celine.martin"), role: "parent", school: COLLEGE_A },
    eleve: { id: uuid(8), key: "eleve", firstName: "Yanis", lastName: "Haddad", email: mail("yanis.haddad"), role: "student", school: LYCEE_B },
    proviseureCoteaux: { id: uuid(9), key: "proviseure-coteaux", firstName: "Anne-Sophie", lastName: "Perrin", email: LYCEE_B.head.email, role: "school_admin", school: LYCEE_B },
    parent2: { id: uuid(10), key: "parent-2", firstName: "Stéphanie", lastName: "Collet", email: mail("stephanie.collet"), role: "parent", school: COLLEGE_A },
    proviseureNeuf: {
        id: uuid(14), key: "proviseure-neuf", firstName: "Nathalie", lastName: "Faure",
        email: LYCEE_NEUF.head.email, role: "school_admin", school: LYCEE_NEUF,
    },
    /*
      Rôle `college` et non `school_admin` : c'est ce que crée le parcours « Compte
      Inscription » de la page d'inscription, donc l'état réel d'un collège au lendemain
      de son arrivée — et le public auquel s'adresse `college-lycee-cio/2`.
    */
    inscriptionsNeuf: {
        id: uuid(15), key: "inscriptions-neuf", firstName: "Olivier", lastName: "Chevrier",
        email: COLLEGE_NEUF.head.email, role: "college", school: COLLEGE_NEUF,
    },
    admin: { id: uuid(11), key: "admin", firstName: "Équipe", lastName: "Bacastages", email: mail("support"), role: "super_admin", school: HOST, member: false },
    demandeRattachement: {
        id: uuid(12), key: "demande-rattachement", firstName: "Lucas", lastName: "Fabre", email: mail("lucas.fabre"), role: "professor", school: HOST,
        extra: {
            schoolApprovalPending: true,
            schoolApprovedAt: null,
            schoolRequestedAt: before(NOW, 2 * DAY),
            schoolRequestReason: "Professeur de systèmes numériques arrivé à la rentrée, j'encadrerai les mini-stages de la filière.",
            lastLoginAt: before(NOW, 2 * DAY),
        },
    },
    demandeRole: {
        id: uuid(13), key: "demande-role", firstName: "Mathieu", lastName: "Lambert", email: mail("mathieu.lambert"), role: "viewer", school: HOST,
        extra: {
            requestedRole: "professor",
            roleRequestedAt: before(NOW, 1 * DAY),
            roleRequestReason: "J'enseigne en cuisine et j'accompagne les collégiens accueillis au restaurant d'application.",
        },
    },
} satisfies Record<string, UserDef>;

const USERS: UserDef[] = Object.values(U);

// ---------------------------------------------------------------------------
// Professeurs et filières
// ---------------------------------------------------------------------------

interface ProfessorDef {
    id: string;
    school: SchoolDef;
    gender: "M." | "Mme.";
    firstName: string;
    lastName: string;
    email: string;
    userId?: string;
}

const P = {
    moreau: { id: uuid(100), school: HOST, gender: "M.", firstName: "Julien", lastName: "Moreau", email: U.prof.email, userId: U.prof.id },
    girard: { id: uuid(101), school: HOST, gender: "M.", firstName: "Thomas", lastName: "Girard", email: mail("thomas.girard") },
    petit: { id: uuid(102), school: HOST, gender: "Mme.", firstName: "Isabelle", lastName: "Petit", email: mail("isabelle.petit") },
    benali: { id: uuid(103), school: HOST, gender: "Mme.", firstName: "Amina", lastName: "Benali", email: mail("amina.benali") },
    masson: { id: uuid(104), school: HOST, gender: "M.", firstName: "Olivier", lastName: "Masson", email: mail("olivier.masson") },
    fabre: { id: uuid(105), school: HOST, gender: "M.", firstName: "Lucas", lastName: "Fabre", email: U.demandeRattachement.email },
    chevalier: { id: uuid(106), school: LYCEE_B, gender: "Mme.", firstName: "Laure", lastName: "Chevalier", email: mail("laure.chevalier") },
} satisfies Record<string, ProfessorDef>;

interface StructureDef {
    id: string;
    school: SchoolDef;
    name: string;
    description: string;
    requiresPreRegistration: boolean;
    color: string;
    /** [diplomaId, domainId] — référentiel chargé par prisma/seed.ts. */
    combinations: Array<[number, number]>;
    professors: ProfessorDef[];
}

const S = {
    maintenance: {
        id: uuid(150), school: HOST, name: "Maintenance des véhicules",
        description: "Bac Pro et CAP : entretien, diagnostic et réparation des voitures particulières et des véhicules de transport routier.",
        requiresPreRegistration: false, color: "#2563EB",
        combinations: [[1, 449], [1, 450], [2, 449]], professors: [P.moreau, P.girard],
    },
    cuisine: {
        id: uuid(151), school: HOST, name: "Cuisine et restauration",
        description: "CAP Cuisine et Bac Pro Commercialisation et services en restauration, au restaurant d'application du lycée.",
        requiresPreRegistration: true, color: "#EA580C",
        combinations: [[2, 375], [1, 230]], professors: [P.petit],
    },
    assp: {
        id: uuid(152), school: HOST, name: "Accompagnement, soins et services à la personne",
        description: "Bac Pro ASSP : accompagnement des personnes âgées, des jeunes enfants et des personnes en situation de handicap.",
        requiresPreRegistration: true, color: "#16A34A",
        combinations: [[1, 405]], professors: [P.benali],
    },
    numerique: {
        id: uuid(153), school: HOST, name: "Systèmes numériques",
        description: "Bac Pro Cybersécurité, informatique et réseaux : câblage, domotique, sécurité des installations.",
        requiresPreRegistration: false, color: "#9333EA",
        combinations: [[1, 457], [1, 339]], professors: [P.masson, P.fabre],
    },
    commerce: {
        id: uuid(154), school: LYCEE_B, name: "Métiers du commerce et de la vente",
        description: "Bac Pro Métiers du commerce et de la vente, options animation de l'espace commercial et prospection clientèle.",
        requiresPreRegistration: false, color: "#DB2777",
        combinations: [[1, 132], [1, 417]], professors: [P.chevalier],
    },
} satisfies Record<string, StructureDef>;

// ---------------------------------------------------------------------------
// Élèves
// ---------------------------------------------------------------------------

interface StudentDef {
    firstName: string;
    lastName: string;
    origin: SchoolDef;
    birthDate: Date;
    studentClass: string;
    isUlis?: boolean;
    parentEmail: string;
    studentEmail?: string;
}

/** Date de naissance civile à minuit UTC, comme `DateUtils.parseBirthDate`. */
const born = (yearsBeforeSchoolYear: number, month: number, day: number): Date =>
    new Date(Date.UTC(ACADEMIC_START_YEAR - yearsBeforeSchoolYear, month, day));

const family = (lastName: string): string =>
    mail(`famille.${lastName.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, "-")}`);

const pupil = (firstName: string, lastName: string, origin: SchoolDef, month: number, day: number, extra: Partial<StudentDef> = {}): StudentDef => ({
    firstName, lastName, origin, birthDate: born(14, month, day), studentClass: "3e", parentEmail: family(lastName), ...extra,
});

const E = {
    lea: pupil("Léa", "Martin", COLLEGE_A, 3, 12, { parentEmail: U.parent.email }),
    nathan: pupil("Nathan", "Colin", COLLEGE_A, 0, 23),
    adam: pupil("Adam", "Lopez", COLLEGE_A, 6, 2),
    sarah: pupil("Sarah", "Meyer", COLLEGE_B, 10, 8),
    emma: pupil("Emma", "Blanchard", COLLEGE_B, 1, 17),
    maxime: pupil("Maxime", "Gautier", COLLEGE_A, 4, 30),
    lina: pupil("Lina", "Chevallier", COLLEGE_A, 8, 14),
    tom: pupil("Tom", "Perrot", COLLEGE_A, 11, 3),
    zoe: pupil("Zoé", "Renaud", COLLEGE_A, 2, 26),
    noemie: pupil("Noémie", "Laurent", COLLEGE_A, 5, 9),
    paul: pupil("Paul", "Henry", COLLEGE_B, 7, 21),
    mehdi: pupil("Mehdi", "Aubert", COLLEGE_A, 9, 5),
    chloe: pupil("Chloé", "Dubois", COLLEGE_A, 0, 7),
    enzo: pupil("Enzo", "Roux", COLLEGE_A, 3, 19),
    manon: pupil("Manon", "Lefèvre", COLLEGE_B, 6, 28),
    hugo: pupil("Hugo", "Bernard", COLLEGE_A, 10, 11),
    ines: pupil("Inès", "Mercier", COLLEGE_B, 1, 4),
    theo: pupil("Théo", "Garcia", COLLEGE_A, 4, 16),
    yanis: {
        firstName: "Yanis", lastName: "Haddad", origin: LYCEE_B, birthDate: born(19, 2, 14), studentClass: "1re générale",
        parentEmail: family("Haddad"), studentEmail: U.eleve.email,
    } as StudentDef,
    clara: pupil("Clara", "Rolland", COLLEGE_A, 8, 30, { isUlis: true, studentClass: "3e ULIS", birthDate: born(15, 8, 30) }),
    alice: pupil("Alice", "Picard", COLLEGE_B, 11, 22),
    camille: pupil("Camille", "Faure", COLLEGE_A, 5, 1),
    lou: pupil("Lou", "Brunet", COLLEGE_A, 2, 13),
    ethan: pupil("Ethan", "Marchal", COLLEGE_B, 9, 27),
    rose: pupil("Rose", "Dumont", COLLEGE_A, 7, 6),
    sacha: pupil("Sacha", "Lemaire", COLLEGE_A, 0, 31),
    jade: pupil("Jade", "Fournier", COLLEGE_A, 4, 24),
    louis: pupil("Louis", "Robin", COLLEGE_B, 6, 15),
    timeo: pupil("Timéo", "Barbier", COLLEGE_A, 3, 3),
    anais: pupil("Anaïs", "Carré", COLLEGE_A, 10, 20),
    gabriel: pupil("Gabriel", "Roy", COLLEGE_A, 1, 9),
    lena: pupil("Léna", "Vasseur", COLLEGE_A, 8, 2),
    maelle: pupil("Maëlle", "Giraud", COLLEGE_A, 5, 18),
    nolan: pupil("Nolan", "Fleury", COLLEGE_B, 11, 1),
    jeanne: pupil("Jeanne", "Collet", COLLEGE_A, 2, 7, { parentEmail: U.parent2.email }),
    ilyes: pupil("Ilyes", "Benoit", COLLEGE_A, 7, 29),
    rayan: pupil("Rayan", "Morel", COLLEGE_B, 9, 12),
    lucie: pupil("Lucie", "Moulin", COLLEGE_B, 4, 8),
};

// ---------------------------------------------------------------------------
// Mini-stages
// ---------------------------------------------------------------------------

type SignerRole = "ORIGIN_SCHOOL_HEAD" | "HOST_SCHOOL_SIGNER" | "FAMILY";

type ConventionSpec =
    | { kind: "sent" }
    | { kind: "uploaded" }
    | { kind: "rejected"; reason: string }
    | { kind: "validated" }
    | { kind: "external" }
    | { kind: "esign"; status: "PENDING" | "PARTIALLY_SIGNED" | "COMPLETED"; signed: SignerRole[] };

type ReportSpec =
    | { kind: "uncompleted" }
    | { kind: "pending"; by: ProfessorDef }
    | { kind: "validated"; by: ProfessorDef; comment?: { by: ProfessorDef; text: string } };

interface ParticipantSpec {
    student: StudentDef;
    convention: ConventionSpec;
    attendance?: "present" | "absent";
    report?: ReportSpec;
    unsubscribed?: string;
    canteenPaid?: boolean;
    /** Élève inscrit par une préinscription validée des deux côtés (filières à préinscription). */
    viaPreregistration?: boolean;
}

type PreregistrationSpec =
    | { student: StudentDef; status: "departure_pending"; submittedBy: UserDef }
    | { student: StudentDef; status: "arrival_pending" }
    | { student: StudentDef; status: "rejected_departure"; reason: string }
    | { student: StudentDef; status: "rejected_arrival"; reason: string };

interface SessionSpec {
    id: string;
    label: string;
    structure: StructureDef;
    professors: ProfessorDef[];
    offset: number;
    days?: number;
    arrival: string;
    departure: string;
    capacity: number;
    minCapacity?: number;
    status: "published" | "draft" | "canceled";
    classroom: string;
    description: string;
    participants?: ParticipantSpec[];
    preregistrations?: PreregistrationSpec[];
}

const DESCRIPTIONS = {
    maintenance:
        "Une journée dans l'atelier automobile du lycée : accueil par l'équipe, diagnostic d'un véhicule, entretien courant " +
        "(vidange, pneumatiques) et présentation du Bac Pro Maintenance des véhicules. Prévoir des chaussures fermées et une tenue qui ne craint rien.",
    cuisine:
        "Découverte de la cuisine pédagogique et du restaurant d'application : mise en place, préparation d'une entrée et d'un dessert, " +
        "puis service en salle. La tenue professionnelle est prêtée par le lycée.",
    assp:
        "Deux jours pour découvrir les métiers du soin et de l'accompagnement : ateliers d'ergonomie et d'hygiène, animation d'un atelier " +
        "auprès de résidents en salle d'application.",
    numerique:
        "Initiation aux réseaux et à la domotique : câblage d'une baie, configuration d'un équipement connecté et d'une alarme.",
    commerce:
        "Mise en situation dans la boutique pédagogique : accueil des clients, mise en rayon, encaissement et réalisation d'une vitrine.",
};

const COMMENT_LEA =
    "Léa s'est montrée curieuse et appliquée pendant le diagnostic. Elle a posé beaucoup de questions sur le Bac Pro : un projet à encourager.";
const COMMENT_SACHA =
    "Très à l'aise en cuisine, Sacha a pris des initiatives lors du dressage. Attention à la ponctualité le matin.";

const SESSIONS: SessionSpec[] = [
    // --- Lycée du Val d'Arnon : Maintenance des véhicules -----------------------------
    {
        id: uuid(300), label: "Maintenance — passé (comptes-rendus mêlés)", structure: S.maintenance, professors: [P.moreau, P.girard],
        offset: -8, arrival: "08:30", departure: "16:30", capacity: 6, status: "published", classroom: "Atelier B12",
        description: DESCRIPTIONS.maintenance,
        participants: [
            { student: E.lea, convention: { kind: "validated" }, attendance: "present", canteenPaid: true,
                report: { kind: "validated", by: P.moreau, comment: { by: P.moreau, text: COMMENT_LEA } } },
            { student: E.nathan, convention: { kind: "external" }, attendance: "present", canteenPaid: true, report: { kind: "validated", by: P.moreau } },
            { student: E.sarah, convention: { kind: "validated" }, attendance: "present", report: { kind: "pending", by: P.girard } },
            { student: E.adam, convention: { kind: "validated" }, attendance: "absent", report: { kind: "uncompleted" } },
            { student: E.emma, convention: { kind: "validated" }, attendance: "present", report: { kind: "uncompleted" } },
        ],
    },
    {
        id: uuid(301), label: "Maintenance — passé (comptes-rendus à rédiger)", structure: S.maintenance, professors: [P.moreau],
        offset: -2, arrival: "08:30", departure: "16:30", capacity: 4, status: "published", classroom: "Atelier B12",
        description: DESCRIPTIONS.maintenance,
        participants: [
            { student: E.maxime, convention: { kind: "validated" }, attendance: "present", report: { kind: "uncompleted" } },
            { student: E.lina, convention: { kind: "validated" }, attendance: "present", report: { kind: "uncompleted" } },
            { student: E.tom, convention: { kind: "external" }, attendance: "present", report: { kind: "uncompleted" } },
            { student: E.zoe, convention: { kind: "validated" }, attendance: "present", report: { kind: "pending", by: P.moreau } },
        ],
    },
    {
        id: uuid(302), label: "Maintenance — aujourd'hui", structure: S.maintenance, professors: [P.moreau, P.girard],
        offset: 0, arrival: "08:30", departure: "16:30", capacity: 4, status: "published", classroom: "Atelier B12",
        description: DESCRIPTIONS.maintenance,
        participants: [
            { student: E.noemie, convention: { kind: "validated" }, attendance: "present" },
            { student: E.paul, convention: { kind: "external" } },
            { student: E.mehdi, convention: { kind: "esign", status: "COMPLETED", signed: ["ORIGIN_SCHOOL_HEAD", "HOST_SCHOOL_SIGNER", "FAMILY"] } },
        ],
    },
    {
        id: uuid(303), label: "Maintenance — à venir (conventions à chaque étape)", structure: S.maintenance, professors: [P.moreau, P.girard],
        offset: 7, days: 2, arrival: "08:30", departure: "16:30", capacity: 8, status: "published", classroom: "Atelier B12",
        description: DESCRIPTIONS.maintenance,
        participants: [
            { student: E.chloe, convention: { kind: "sent" } },
            { student: E.enzo, convention: { kind: "uploaded" } },
            { student: E.manon, convention: { kind: "rejected", reason: "La signature du représentant légal est manquante en page 3." } },
            { student: E.hugo, convention: { kind: "validated" } },
            { student: E.ines, convention: { kind: "external" } },
            { student: E.yanis, convention: { kind: "esign", status: "PARTIALLY_SIGNED", signed: ["ORIGIN_SCHOOL_HEAD"] } },
            { student: E.theo, convention: { kind: "sent" }, unsubscribed: "Stage d'observation en entreprise sur la même période." },
        ],
    },
    {
        id: uuid(304), label: "Maintenance — à venir, complet", structure: S.maintenance, professors: [P.girard],
        offset: 9, arrival: "08:30", departure: "16:30", capacity: 3, status: "published", classroom: "Atelier B14",
        description: DESCRIPTIONS.maintenance,
        participants: [
            { student: E.clara, convention: { kind: "sent" } },
            { student: E.alice, convention: { kind: "sent" } },
            { student: E.camille, convention: { kind: "uploaded" } },
        ],
    },
    {
        id: uuid(305), label: "Maintenance — annulé", structure: S.maintenance, professors: [P.girard],
        offset: 14, arrival: "08:30", departure: "16:30", capacity: 6, status: "canceled", classroom: "Atelier B14",
        description: DESCRIPTIONS.maintenance,
    },
    {
        id: uuid(306), label: "Maintenance — brouillon (non visible)", structure: S.maintenance, professors: [P.moreau],
        offset: 21, arrival: "08:30", departure: "16:30", capacity: 6, status: "draft", classroom: "Atelier B12",
        description: DESCRIPTIONS.maintenance,
    },
    // --- Lycée du Val d'Arnon : Cuisine (préinscription) -----------------------------
    {
        id: uuid(310), label: "Cuisine — passé", structure: S.cuisine, professors: [P.petit],
        offset: -6, arrival: "09:00", departure: "15:30", capacity: 5, status: "published", classroom: "Cuisine pédagogique",
        description: DESCRIPTIONS.cuisine,
        participants: [
            { student: E.lou, convention: { kind: "validated" }, attendance: "present", report: { kind: "pending", by: P.petit }, viaPreregistration: true },
            { student: E.ethan, convention: { kind: "validated" }, attendance: "present", report: { kind: "validated", by: P.petit }, viaPreregistration: true },
            { student: E.rose, convention: { kind: "external" }, attendance: "present", report: { kind: "uncompleted" }, viaPreregistration: true },
            { student: E.sacha, convention: { kind: "validated" }, attendance: "present",
                report: { kind: "validated", by: P.petit, comment: { by: P.petit, text: COMMENT_SACHA } }, viaPreregistration: true },
        ],
    },
    {
        id: uuid(311), label: "Cuisine — à venir (préinscriptions)", structure: S.cuisine, professors: [P.petit],
        offset: 10, arrival: "09:00", departure: "15:30", capacity: 5, status: "published", classroom: "Cuisine pédagogique",
        description: DESCRIPTIONS.cuisine,
        participants: [
            { student: E.jade, convention: { kind: "esign", status: "PENDING", signed: [] }, viaPreregistration: true },
            { student: E.louis, convention: { kind: "esign", status: "COMPLETED", signed: ["ORIGIN_SCHOOL_HEAD", "HOST_SCHOOL_SIGNER", "FAMILY"] }, viaPreregistration: true },
        ],
        preregistrations: [
            { student: E.lea, status: "departure_pending", submittedBy: U.parent },
            { student: E.timeo, status: "arrival_pending" },
            { student: E.anais, status: "arrival_pending" },
            { student: E.gabriel, status: "rejected_arrival", reason: "Les places de ce mini-stage sont réservées aux élèves de 3e ayant un projet en restauration." },
            { student: E.lena, status: "rejected_departure", reason: "L'élève participe déjà à un mini-stage au lycée du Val d'Arnon cette semaine-là." },
        ],
    },
    // --- Lycée du Val d'Arnon : ASSP (préinscription) --------------------------------
    {
        id: uuid(320), label: "ASSP — à venir, deux jours", structure: S.assp, professors: [P.benali],
        offset: 16, days: 2, arrival: "08:45", departure: "16:00", capacity: 8, status: "published", classroom: "Salle d'application A03",
        description: DESCRIPTIONS.assp,
        participants: [
            { student: E.maelle, convention: { kind: "sent" }, viaPreregistration: true },
            { student: E.nolan, convention: { kind: "esign", status: "PENDING", signed: [] }, viaPreregistration: true },
        ],
        preregistrations: [
            { student: E.jeanne, status: "departure_pending", submittedBy: U.parent2 },
            { student: E.ilyes, status: "arrival_pending" },
        ],
    },
    // --- Lycée du Val d'Arnon : Systèmes numériques -------------------------------------
    {
        id: uuid(330), label: "Systèmes numériques — brouillon", structure: S.numerique, professors: [P.masson],
        offset: 28, arrival: "08:30", departure: "16:00", capacity: 6, status: "draft", classroom: "Laboratoire réseaux C21",
        description: DESCRIPTIONS.numerique,
    },
    // --- Lycée des Coteaux (second établissement d'accueil) ------------------------------
    {
        id: uuid(340), label: "Commerce — passé (Coteaux)", structure: S.commerce, professors: [P.chevalier],
        offset: -5, arrival: "09:00", departure: "16:00", capacity: 6, status: "published", classroom: "Boutique pédagogique",
        description: DESCRIPTIONS.commerce,
        participants: [
            { student: E.nathan, convention: { kind: "validated" }, attendance: "present", report: { kind: "validated", by: P.chevalier } },
            { student: E.rayan, convention: { kind: "validated" }, attendance: "present", report: { kind: "uncompleted" } },
        ],
    },
    {
        id: uuid(341), label: "Commerce — à venir (Coteaux, autorisation annuelle)", structure: S.commerce, professors: [P.chevalier],
        offset: 12, arrival: "09:00", departure: "16:00", capacity: 6, status: "published", classroom: "Boutique pédagogique",
        description: DESCRIPTIONS.commerce,
        participants: [
            { student: E.lea, convention: { kind: "esign", status: "PENDING", signed: [] } },
            { student: E.lucie, convention: { kind: "sent" } },
        ],
    },
];

/** Qui agit au nom de l'établissement d'accueil : validations, signatures, inscriptions directes. */
const HOST_STAFF = new Map<string, { validator: UserDef; validatorName: string; recorder: UserDef; annualAuthorization: boolean; daysUntilUnpublish: number }>([
    [HOST.uai, { validator: U.ddf, validatorName: "Karine Lemoine", recorder: U.vieScolaire, annualAuthorization: false, daysUntilUnpublish: 3 }],
    [LYCEE_B.uai, { validator: U.proviseureCoteaux, validatorName: "Anne-Sophie Perrin", recorder: U.proviseureCoteaux, annualAuthorization: true, daysUntilUnpublish: 3 }],
]);

/** Compte qui inscrit les élèves d'un établissement d'origine, quand il en a un. */
const ORIGIN_REGISTRAR = new Map<string, UserDef>([
    [COLLEGE_A.uai, U.inscriptions],
    [LYCEE_B.uai, U.proviseureCoteaux],
]);

// ---------------------------------------------------------------------------
// Nettoyage
// ---------------------------------------------------------------------------

async function cleanDemoData(prisma: Any): Promise<void> {
    const demoSchool = { startsWith: UAI_PREFIX };
    const users = await prisma.user.findMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } }, select: { id: true } });
    const userIds: string[] = users.map((u: Any) => u.id);

    const sessions = await prisma.ministageSession.findMany({ where: { hostSchoolUai: demoSchool }, select: { id: true } });
    const sessionIds: string[] = sessions.map((s: Any) => s.id);
    const participants = await prisma.participant.findMany({ where: { sessionId: { in: sessionIds } }, select: { id: true } });
    const participantIds: string[] = participants.map((p: Any) => p.id);

    const counts: Record<string, number> = {};
    const run = async (label: string, op: Promise<{ count: number }>) => {
        counts[label] = (await op).count;
    };

    // Ordre dicté par les clés étrangères : ce qui référence un fichier ou un compte d'abord.
    await run("parcours de signature", prisma.electronicSignatureProcess.deleteMany({ where: { participantId: { in: participantIds } } }));
    await run("versions de convention", prisma.conventionFileVersion.deleteMany({ where: { participantId: { in: participantIds } } }));
    await run("conventions", prisma.convention.deleteMany({ where: { participantId: { in: participantIds } } }));
    await run("préinscriptions", prisma.preregistration.deleteMany({ where: { sessionId: { in: sessionIds } } }));
    await run("participants", prisma.participant.deleteMany({ where: { id: { in: participantIds } } }));
    await run("mini-stages", prisma.ministageSession.deleteMany({ where: { id: { in: sessionIds } } }));
    await run("autorisations annuelles", prisma.schoolAnnualSigningAuthorization.deleteMany({ where: { schoolUai: demoSchool } }));
    await run("modèles de signature", prisma.electronicSignatureTemplate.deleteMany({ where: { schoolUai: demoSchool } }));
    await run("affectations de convention", prisma.schoolConventionTemplateAssignment.deleteMany({ where: { schoolUai: demoSchool } }));
    await run("filières", prisma.structure.deleteMany({ where: { schoolUai: demoSchool } }));
    await run("professeurs", prisma.professor.deleteMany({ where: { schoolUai: demoSchool } }));
    await run("paramètres", prisma.schoolSettings.deleteMany({ where: { schoolUai: demoSchool } }));
    await run("informations", prisma.schoolInformation.deleteMany({ where: { schoolUai: demoSchool } }));
    await prisma.billingItem.deleteMany({ where: { schoolUai: demoSchool } });
    await run("abonnements", prisma.subscription.deleteMany({ where: { schoolUai: demoSchool } }));
    await prisma.schoolStatistics.deleteMany({ where: { schoolUai: demoSchool } });
    await run("fichiers", prisma.file.deleteMany({ where: { OR: [{ id: { startsWith: ID_PREFIX } }, { uploadedBy: { in: userIds } }] } }));
    await prisma.userSchool.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { schoolUai: demoSchool }] } });
    await run("comptes", prisma.user.deleteMany({ where: { id: { in: userIds } } }));
    await run("établissements", prisma.school.deleteMany({ where: { uai: demoSchool } }));

    const summary = Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(", ");
    console.log(`🧹 Nettoyage : ${summary || "rien à supprimer"}.`);
}

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

const NOTIFICATIONS_OFF = {
    cancelMinistage: false, studentAttend: false, studentAbsence: false, signupMinistage: false, reminders: false, reports: false,
    validatedPreregistration: false, nonValidatedPreregistration: false, toValidatePreregistration: false, reportsLink: false,
    conventionUploaded: false, conventionToValidate: false, conventionValidated: false, conventionRejected: false,
};

async function createSchools(prisma: Any): Promise<void> {
    for (const school of SCHOOLS) {
        if (!/^[0-9]{7}[A-Z]$/.test(school.uai) || !school.uai.startsWith(UAI_PREFIX)) {
            throw new Error(`UAI de démo invalide : ${school.uai}`);
        }
        await prisma.school.create({
            data: {
                uai: school.uai, siteId: school.siteId, officialName: school.officialName, sector: "Public",
                address: school.address, zipCode: school.zipCode, city: school.city,
                department: "Cher", departmentId: "018", region: "Centre-Val de Loire", regionId: 24,
                academy: "Orléans-Tours", academyId: 18, nature: school.nature, natureId: school.natureId,
                latitude: school.latitude, longitude: school.longitude,
                position: `${school.latitude.replace(",", ".")}, ${school.longitude.replace(",", ".")}`,
                multiUai: false, studentsNumber: school.studentsNumber,
            },
        });
    }

    const isHost = (s: SchoolDef) => HOST_STAFF.has(s.uai);

    // `CONFIGURED_SCHOOLS` et non `SCHOOLS` : le lycée de la Sablière vient d'arriver et
    // n'a rien renseigné. C'est la première étape de son panneau de mise en place.
    for (const school of CONFIGURED_SCHOOLS) {
        await prisma.schoolInformation.create({
            data: {
                schoolUai: school.uai, schoolSiteId: school.siteId,
                headFirstName: school.head.firstName, headLastName: school.head.lastName,
                contactEmail: school.contactEmail, contactPhoneNumber: PHONE,
                establishmentType: school.establishmentType, studentCount: school.studentsNumber,
                website: `https://www.${school.uai.toLowerCase()}.${DEMO_DOMAIN}`,
                description: isHost(school)
                    ? `<p>Le ${school.shortName} accueille chaque année des collégiens en mini-stage pour leur faire découvrir ses filières ` +
                      "professionnelles. Les élèves sont encadrés par nos professeurs, en atelier comme en salle, et repartent avec un " +
                      "compte-rendu transmis à leur établissement.</p><p>Le lycée est desservi par la ligne de bus 4, arrêt « Tanneurs ».</p>"
                    : `<p>Le ${school.shortName} accompagne ses élèves de 3e dans la découverte des voies professionnelles.</p>`,
                instructions: isHost(school)
                    ? "Se présenter à l'accueil à 8 h 15 avec une pièce d'identité. Le déjeuner est pris au self du lycée (ticket remis sur place). " +
                      "Prévoir une tenue adaptée à la filière : chaussures fermées en atelier."
                    : null,
                objectEmailInformation: isHost(school) ? `Informations pratiques — mini-stage au ${school.shortName}` : null,
                bodyEmailInformation: isHost(school)
                    ? "Bonjour,\n\nVous trouverez ci-dessous les informations pratiques du mini-stage : horaires, lieu de rendez-vous et " +
                      "tenue à prévoir. N'hésitez pas à contacter l'accueil du lycée pour toute question.\n\nL'équipe de direction"
                    : null,
                reminderEmailBody: isHost(school)
                    ? "Bonjour,\n\nNous vous rappelons que l'élève est attendu(e) au lycée pour son mini-stage. Merci de vérifier que la " +
                      "convention a bien été signée par toutes les parties avant sa venue.\n\nÀ très bientôt,\nL'équipe du lycée"
                    : null,
            },
        });
    }

    const academicYear = await prisma.academicYear.upsert({
        where: { id: ACADEMIC_YEAR_ID },
        update: {},
        create: { id: ACADEMIC_YEAR_ID, startDate: ACADEMIC_YEAR_START, endDate: ACADEMIC_YEAR_END },
    });
    // Le lycée de la Sablière est abonné sans rien avoir configuré : c'est l'abonnement
    // qui fait passer son panneau de mise en place de deux étapes à six. Le collège du
    // Pré-aux-Clercs, lui, n'en a pas — il garde les deux étapes de son article.
    for (const [school, productId] of [[HOST, "2"], [LYCEE_B, "1"], [LYCEE_NEUF, "2"]] as Array<[SchoolDef, string]>) {
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error(`Produit ${productId} absent : charger les données de référence (prisma/seed.ts).`);
        await prisma.subscription.create({
            data: {
                schoolUai: school.uai, siteId: school.siteId, academicYearId: academicYear.id, productId,
                startDate: ACADEMIC_YEAR_START, endDate: ACADEMIC_YEAR_END, isActive: true, isDemo: false,
            },
        });
    }
}

async function createUsers(prisma: Any): Promise<void> {
    await prisma.validEmail.createMany({ data: [{ domain: DEMO_DOMAIN }], skipDuplicates: true });

    for (const user of USERS) {
        const createdAt = before(NOW, 180 * DAY);
        await prisma.user.create({
            data: {
                id: user.id, email: user.email, password: await bcrypt.hash(DEMO_PASSWORD, 12), role: user.role,
                currentSchoolUai: user.school.uai, currentSchoolSiteId: user.school.siteId,
                phone: PHONE, firstName: user.firstName, lastName: user.lastName,
                notificationPreferences: NOTIFICATIONS_OFF,
                emailConfirmed: true, emailConfirmedAt: createdAt, emailDomainValidated: true,
                schoolApprovalPending: false, schoolApprovedAt: createdAt,
                hasTemporaryPassword: false, isBlocked: false, isDeleted: false,
                lastLoginAt: before(NOW, 1 * DAY), createdAt,
                ...(user.extra ?? {}),
            },
        });
        if (user.member !== false) {
            await prisma.userSchool.create({ data: { userId: user.id, schoolUai: user.school.uai, schoolSiteId: user.school.siteId } });
        }
    }
}

async function createSettings(prisma: Any): Promise<void> {
    const template = await prisma.conventionTemplate.findFirst({ orderBy: { createdAt: "asc" } });
    if (!template) warnings.push("Aucun modèle de convention en base : les filières restent sans modèle affecté.");

    const settings: Array<{ school: SchoolDef; admin?: UserDef; host: boolean; notify: UserDef[] }> = [
        { school: HOST, admin: U.proviseur, host: true, notify: [U.proviseur, U.ddf] },
        { school: LYCEE_B, admin: U.proviseureCoteaux, host: true, notify: [U.proviseureCoteaux] },
        { school: COLLEGE_A, admin: U.principal, host: false, notify: [U.principal, U.inscriptions] },
        { school: COLLEGE_B, host: false, notify: [] },
    ];

    for (const { school, admin, host, notify } of settings) {
        await prisma.schoolSettings.create({
            data: {
                schoolUai: school.uai, schoolSiteId: school.siteId,
                shortReports: false, daysUntilUnpublish: HOST_STAFF.get(school.uai)?.daysUntilUnpublish ?? 3,
                autoValidatedReports: false, preregistrationEnabled: host,
                administratorId: admin?.id ?? null,
                enablePresignature: false, allowDirectArrivalValidation: false,
                requireParentEmail: host, trackCanteenPayment: school === HOST,
                defaultAttendancePresent: false, autoValidateUploadedConventions: false,
                signatureMode: host ? "ELECTRONIC" : "LEGACY_VISUAL", conventionSigningOrder: "PARALLEL",
                conventionSignerName: `${school.head.firstName} ${school.head.lastName}`,
                conventionSignerEmail: school.head.email, conventionSignerTitle: school.head.title,
            },
        });
        for (const user of notify) {
            await prisma.schoolNotificationUser.create({ data: { schoolUai: school.uai, schoolSiteId: school.siteId, userId: user.id } });
        }
    }

    for (const professor of Object.values(P) as ProfessorDef[]) {
        await prisma.professor.create({
            data: {
                id: professor.id, schoolUai: professor.school.uai, schoolSiteId: professor.school.siteId,
                gender: professor.gender, firstName: professor.firstName, lastName: professor.lastName,
                email: professor.email, userId: professor.userId ?? null, notificationPreferences: {},
            },
        });
    }

    let assignment = 180;
    for (const structure of Object.values(S) as StructureDef[]) {
        await prisma.structure.create({
            data: {
                id: structure.id, schoolUai: structure.school.uai, schoolSiteId: structure.school.siteId,
                name: structure.name, description: structure.description,
                requiresPreRegistration: structure.requiresPreRegistration, color: structure.color,
            },
        });
        for (const [diplomaId, domainId] of structure.combinations) {
            const [diploma, domain] = await Promise.all([
                prisma.diploma.findUnique({ where: { id: diplomaId } }),
                prisma.domain.findUnique({ where: { id: domainId } }),
            ]);
            if (!diploma || !domain) {
                throw new Error(`Référentiel incomplet (diplôme ${diplomaId} / domaine ${domainId}) : charger prisma/seed.ts.`);
            }
            await prisma.trackCombination.create({ data: { structureId: structure.id, diplomaId, domainId } });
        }
        for (const professor of structure.professors) {
            await prisma.teachingAssignment.create({
                data: { id: uuid(assignment++), professorId: professor.id, structureId: structure.id, schoolUai: structure.school.uai, schoolSiteId: structure.school.siteId },
            });
        }
        if (template) {
            await prisma.schoolConventionTemplateAssignment.create({
                data: { schoolUai: structure.school.uai, schoolSiteId: structure.school.siteId, structureId: structure.id, conventionTemplateId: template.id },
            });
        }
    }
}

async function createAnnualAuthorization(prisma: Any): Promise<string> {
    const sourceFileId = nextId();
    const signedFileId = nextId();
    const signedAt = notAfterNow(new Date(Math.max(ACADEMIC_YEAR_START.getTime() + 2 * HOUR, NOW.getTime() - 12 * DAY)));
    for (const [id, name, bucket] of [[sourceFileId, "autorisation-annuelle.pdf", "signature-source"], [signedFileId, "autorisation-annuelle-signee.pdf", "signature-signed"]]) {
        await prisma.file.create({
            data: {
                id, bucket, type: "document", path: `demo/${LYCEE_B.uai}/${ACADEMIC_YEAR_ID}/${name}`, originalName: name,
                size: 184_320, mimeType: "application/pdf", uploadedBy: U.proviseureCoteaux.id, uploadedAt: signedAt,
            },
        });
    }
    const id = uuid(4500);
    await prisma.schoolAnnualSigningAuthorization.create({
        data: {
            id, schoolUai: LYCEE_B.uai, schoolSiteId: LYCEE_B.siteId, schoolYear: ACADEMIC_YEAR_ID, status: "ACTIVE", provider: "DOCUMENSO",
            providerEnvelopeId: `demo-envelope-annual-${LYCEE_B.uai}`,
            externalId: `bacastages:annual-authorization:${LYCEE_B.uai}-${LYCEE_B.siteId}:${ACADEMIC_YEAR_ID}:demo`,
            signerUserId: U.proviseureCoteaux.id, signerName: "Anne-Sophie Perrin", signerEmail: LYCEE_B.head.email, signerTitle: LYCEE_B.head.title,
            signedAt, sourceFileId, sourceSha256: SHA_PLACEHOLDER, signedFileId, signedSha256: SHA_PLACEHOLDER,
        },
    });
    return id;
}

interface SessionContext {
    spec: SessionSpec;
    host: SchoolDef;
    firstDay: CivilDay;
    days: CivilDay[];
    start: Date;
    end: Date;
}

const fullName = (s: StudentDef) => `${s.firstName} ${s.lastName}`;

async function createFile(prisma: Any, data: { bucket: string; type: string; path: string; originalName: string; uploadedBy: string | null; uploadedAt: Date }): Promise<string> {
    const id = nextId();
    await prisma.file.create({ data: { id, size: 248_512, mimeType: "application/pdf", ...data } });
    return id;
}

async function createConvention(
    prisma: Any,
    ctx: SessionContext,
    participantId: string,
    spec: ParticipantSpec,
    annualAuthorizationId: string | null,
    registrationDate: Date,
): Promise<void> {
    const staff = HOST_STAFF.get(ctx.host.uai)!;
    const conv = spec.convention;
    const student = spec.student;
    const uploadedAt = notAfterNow(new Date(Math.min(registrationDate.getTime() + 4 * DAY, ctx.start.getTime() - 2 * DAY)));
    const decidedAt = notAfterNow(new Date(uploadedAt.getTime() + 1 * DAY));
    const registrar = ORIGIN_REGISTRAR.get(student.origin.uai) ?? null;

    const uploaded = async (status: string) => {
        const fileId = await createFile(prisma, {
            bucket: "conventions", type: "convention", path: `demo/${participantId}/convention.pdf`,
            originalName: `convention-${student.lastName.toLowerCase()}-${student.firstName.toLowerCase()}.pdf`,
            uploadedBy: registrar?.id ?? null, uploadedAt,
        });
        await prisma.conventionFileVersion.create({
            data: {
                id: nextId(), participantId, versionNumber: 1, action: "uploaded", fileId, isActive: true, createdAt: uploadedAt,
                createdBy: registrar?.id ?? null, createdByName: student.origin.uploaderName,
                conventionStatusAfter: status, participantStatusAfter: "registered",
            },
        });
        return { uploadedAt, uploadedBy: student.origin.uploaderName, uploadedFileId: fileId };
    };

    switch (conv.kind) {
        case "sent":
            await prisma.convention.create({ data: { participantId, status: "sent", presignedBySchool: false, createdAt: registrationDate } });
            return;
        case "uploaded":
            await prisma.convention.create({ data: { participantId, status: "uploaded", presignedBySchool: false, createdAt: registrationDate, ...(await uploaded("uploaded")) } });
            return;
        case "rejected":
            await prisma.convention.create({
                data: {
                    participantId, status: "rejected", presignedBySchool: false, createdAt: registrationDate, ...(await uploaded("uploaded")),
                    rejectionReason: conv.reason, rejectedAt: decidedAt, rejectedBy: staff.validator.id,
                },
            });
            return;
        case "validated":
            await prisma.convention.create({
                data: {
                    participantId, status: "fully_validated", presignedBySchool: false, createdAt: registrationDate, ...(await uploaded("uploaded")),
                    validatedAt: decidedAt, validatedBy: staff.validator.id,
                },
            });
            return;
        case "external":
            await prisma.convention.create({
                data: {
                    participantId, status: "fully_validated", presignedBySchool: false, createdAt: registrationDate,
                    signedExternally: true, signedExternallyAt: decidedAt, signedExternallyBy: staff.validator.id, signedExternallyName: staff.validatorName,
                },
            });
            return;
        case "esign": {
            const processId = nextId();
            const completed = conv.status === "COMPLETED";
            const mode = annualAuthorizationId ? "ANNUAL_HOST_AUTHORIZATION" : "THREE_PARTY_ELECTRONIC";
            // Invitation récente : les relances automatiques ne partent qu'à J+3 (§6.5).
            const sentAt = completed ? notAfterNow(before(ctx.start, 8 * DAY), 3 * DAY) : before(NOW, 1 * DAY + 3 * HOUR);
            const completedAt = completed ? notAfterNow(new Date(sentAt.getTime() + 2 * DAY), 2 * HOUR) : null;
            const sourceFileId = await createFile(prisma, {
                bucket: "signature-source", type: "document", path: `demo/${participantId}/convention-source.pdf`,
                originalName: "convention.pdf", uploadedBy: null, uploadedAt: sentAt,
            });
            const signedFileId = completed
                ? await createFile(prisma, {
                      bucket: "signature-signed", type: "document", path: `demo/${participantId}/convention-signee.pdf`,
                      originalName: "convention-signee.pdf", uploadedBy: null, uploadedAt: completedAt!,
                  })
                : null;

            await prisma.convention.create({
                data: completed
                    ? {
                          participantId, status: "fully_validated", presignedBySchool: false, createdAt: registrationDate,
                          signedElectronically: true, signedElectronicallyAt: completedAt, electronicSignatureProcessId: processId,
                      }
                    : { participantId, status: "sent", presignedBySchool: false, createdAt: registrationDate },
            });

            await prisma.electronicSignatureProcess.create({
                data: {
                    id: processId, participantId, revision: 1, provider: "DOCUMENSO",
                    providerEnvelopeId: `demo-envelope-${participantId}`, externalId: `bacastages:convention:${participantId}:1:demo`,
                    signatureMode: mode, status: conv.status,
                    sourceFileId, sourceSha256: SHA_PLACEHOLDER,
                    signedFileId, signedSha256: completed ? SHA_PLACEHOLDER : null,
                    annualAuthorizationId, sentAt, completedAt, createdBy: HOST_STAFF.get(ctx.host.uai)!.validator.id, createdAt: sentAt,
                },
            });

            const family = student.studentEmail
                ? { role: "ADULT_STUDENT", name: fullName(student), email: student.studentEmail, org: null, title: null }
                : { role: "LEGAL_GUARDIAN", name: `Responsable légal de ${fullName(student)}`, email: student.parentEmail, org: null, title: null };
            const recipients: Array<{ key: SignerRole; role: string; name: string; email: string; org: string | null; title: string | null }> = [
                { key: "ORIGIN_SCHOOL_HEAD", role: "ORIGIN_SCHOOL_HEAD", name: `${student.origin.head.firstName} ${student.origin.head.lastName}`,
                    email: student.origin.head.email, org: student.origin.officialName, title: student.origin.head.title },
                ...(mode === "THREE_PARTY_ELECTRONIC"
                    ? [{ key: "HOST_SCHOOL_SIGNER" as SignerRole, role: "HOST_SCHOOL_SIGNER", name: `${ctx.host.head.firstName} ${ctx.host.head.lastName}`,
                          email: ctx.host.head.email, org: ctx.host.officialName, title: ctx.host.head.title }]
                    : []),
                { key: "FAMILY", ...family },
            ];
            let order = 0;
            for (const r of recipients) {
                const signed = completed || conv.signed.includes(r.key);
                const signedAt = signed ? notAfterNow(new Date(sentAt.getTime() + (6 + order * 5) * HOUR), 30 * MINUTE) : null;
                await prisma.electronicSignatureRecipient.create({
                    data: {
                        id: nextId(), processId, providerRecipientId: `demo-recipient-${processId}-${order}`, role: r.role, name: r.name, email: r.email,
                        representedOrganization: r.org, signerTitle: r.title, signingOrder: null,
                        status: signed ? "SIGNED" : "PENDING", invitedAt: sentAt,
                        openedAt: signed ? before(signedAt!, 10 * MINUTE) : null, signedAt,
                    },
                });
                order++;
            }

            if (completed) {
                await prisma.conventionFileVersion.create({
                    data: {
                        id: nextId(), participantId, versionNumber: 1, action: "electronically_signed", fileId: signedFileId, isActive: true,
                        createdAt: completedAt, createdByName: "Signature électronique",
                        conventionStatusAfter: "fully_validated", participantStatusAfter: "convention_signed",
                    },
                });
            }
            return;
        }
    }
}

async function createReport(prisma: Any, ctx: SessionContext, participantId: string, spec: ReportSpec | undefined): Promise<void> {
    const staff = HOST_STAFF.get(ctx.host.uai)!;
    const report = spec ?? { kind: "uncompleted" as const };
    const writtenAt = notAfterNow(parisAt(ctx.days[ctx.days.length - 1] + DAY, "17:30"), 3 * HOUR);
    const validatedAt = notAfterNow(new Date(writtenAt.getTime() + 20 * HOUR), HOUR);

    await prisma.report.create({
        data: {
            participantId, needsValidation: true,
            status: report.kind === "uncompleted" ? "uncompleted" : report.kind === "pending" ? "pending" : "completed",
            completedBy: report.kind === "uncompleted" ? null : report.by.id,
            completedAt: report.kind === "uncompleted" ? null : writtenAt,
            validatedBy: report.kind === "validated" ? staff.validator.id : null,
            validatedAt: report.kind === "validated" ? validatedAt : null,
        },
    });
    if (report.kind === "uncompleted") return;

    const good = report.kind === "validated";
    await prisma.reportContent.create({
        data: {
            participantId, feedback: good ? 1 : 2, ponctuality: true,
            behavior: 1, interaction: good ? 1 : 2, communication: 2, interest: 1, initiative: good ? 1 : 2,
            participation: 1, knowledge: 2, motivation: good ? 1 : 2, curiosity: 1,
        },
    });
    if (report.kind === "validated" && report.comment) {
        await prisma.reportComment.create({
            data: { id: nextId(), participantId, professorId: report.comment.by.id, commentary: report.comment.text, createdAt: writtenAt },
        });
    }
}

async function createSessions(prisma: Any, annualAuthorizationId: string): Promise<Map<string, number>> {
    const perSchool = new Map<string, number>();

    for (const spec of SESSIONS) {
        const host = spec.structure.school;
        const staff = HOST_STAFF.get(host.uai)!;
        const nbDays = spec.days ?? 1;
        const firstDay = schoolDay(spec.offset, nbDays);
        const days = Array.from({ length: nbDays }, (_, i) => firstDay + i * DAY);
        const start = parisMidnight(days[0]);
        const end = parisMidnight(days[days.length - 1]);
        const ctx: SessionContext = { spec, host, firstDay, days, start, end };
        const createdAt = notAfterNow(before(start, 35 * DAY), 2 * DAY);
        const active = (spec.participants ?? []).filter((p) => !p.unsubscribed);

        await prisma.ministageSession.create({
            data: {
                id: spec.id, hostSchoolUai: host.uai, hostSchoolSiteId: host.siteId, structureId: spec.structure.id,
                professor1Id: spec.professors[0].id, professor2Id: spec.professors[1]?.id ?? null, professor3Id: spec.professors[2]?.id ?? null,
                description: spec.description, classroom: spec.classroom,
                maxCapacity: spec.capacity, minCapacity: spec.minCapacity ?? 1, allocatedPlaces: active.length,
                startDate: start, endDate: end, status: spec.status,
                // Chaîne JSON, comme `sessionMapper.toPersistence` (JSON.stringify du planning).
                dailySchedules: JSON.stringify(days.map((d) => ({ date: parisMidnight(d).toISOString(), arrivalTime: spec.arrival, departureTime: spec.departure }))),
                unpublishDate: before(start, staff.daysUntilUnpublish * DAY),
                createdBy: U.proviseur.school === host ? U.proviseur.id : U.proviseureCoteaux.id,
                createdAt,
                ...(spec.status === "canceled" ? { deletedAt: notAfterNow(before(start, 5 * DAY), 4 * HOUR), deletedBy: U.proviseur.id } : {}),
            },
        });

        let rank = 0;
        for (const p of spec.participants ?? []) {
            const participantId = nextId();
            const student = p.student;
            const registrationDate = notAfterNow(new Date(createdAt.getTime() + (3 + rank) * DAY), 2 * DAY);
            const registrar = ORIGIN_REGISTRAR.get(student.origin.uai);
            const status = p.unsubscribed
                ? "unsubscribed"
                : p.attendance === "present"
                  ? "attended"
                  : p.attendance === "absent"
                    ? "absent"
                    : p.convention.kind === "validated" || p.convention.kind === "external" || (p.convention.kind === "esign" && p.convention.status === "COMPLETED")
                      ? "convention_signed"
                      : "registered";

            // Préinscription validée des deux côtés : c'est elle qui a produit le participant.
            let registeredBy = registrar?.id ?? staff.validator.id;
            let preregistration: Any = null;
            if (p.viaPreregistration) {
                const bypass = !registrar;
                registeredBy = bypass ? staff.validator.id : registrar!.id;
                preregistration = {
                    id: nextId(), sessionId: spec.id, ...studentColumns(student),
                    submittedBy: registrar?.id ?? staff.validator.id, priority: 1, createdAt: before(registrationDate, 3 * DAY),
                    departureEmail: registrar?.email ?? null,
                    isValidatedDeparture: true, departureDateValidated: before(registrationDate, 2 * DAY), departureValidatedBy: registeredBy,
                    departureValidatedByBypass: bypass,
                    isValidatedArrival: true, arrivalDateValidated: registrationDate, arrivalValidatedBy: staff.validator.id,
                };
            }

            await prisma.participant.create({
                data: {
                    id: participantId, sessionId: spec.id, ...studentColumns(student),
                    registeredBy, status, createdAt: registrationDate,
                    emailToSendConvention: student.origin.dispatchEmail,
                    canteenPaymentDate: p.canteenPaid ? before(start, 2 * DAY) : null,
                    ...(p.unsubscribed
                        ? { deletedAt: notAfterNow(new Date(registrationDate.getTime() + 6 * DAY), 3 * HOUR), deletedBy: registeredBy, unsubscriptionReason: p.unsubscribed }
                        : {}),
                },
            });
            if (preregistration) {
                await prisma.preregistration.create({ data: { ...preregistration, convertedToParticipantId: participantId } });
            }

            await createConvention(prisma, ctx, participantId, p, host === LYCEE_B && staff.annualAuthorization ? annualAuthorizationId : null, registrationDate);
            await createReport(prisma, ctx, participantId, p.report);

            if (p.attendance) {
                await prisma.attendanceRecord.create({
                    data: {
                        participantId, departureAbsence: false, arrivalPresence: p.attendance === "present",
                        recordedBy: staff.recorder.id, createdAt: notAfterNow(parisAt(days[0], "09:05"), 5 * MINUTE),
                    },
                });
            }
            rank++;
        }

        for (const pr of spec.preregistrations ?? []) {
            const registrar = ORIGIN_REGISTRAR.get(pr.student.origin.uai);
            const submittedAt = notAfterNow(new Date(createdAt.getTime() + (4 + rank) * DAY), 2 * DAY);
            const departureAt = notAfterNow(new Date(submittedAt.getTime() + 1 * DAY), 20 * HOUR);
            const arrivalAt = notAfterNow(new Date(departureAt.getTime() + 1 * DAY), 3 * HOUR);
            const base = {
                id: nextId(), sessionId: spec.id, ...studentColumns(pr.student), priority: 1, createdAt: submittedAt,
                departureEmail: registrar?.email ?? pr.student.origin.dispatchEmail,
            };
            const data =
                pr.status === "departure_pending"
                    ? { ...base, submittedBy: pr.submittedBy.id, isValidatedDeparture: null, isValidatedArrival: null }
                    : pr.status === "arrival_pending"
                      ? { ...base, submittedBy: registrar!.id, isValidatedDeparture: true, departureDateValidated: departureAt, departureValidatedBy: registrar!.id, isValidatedArrival: null }
                      : pr.status === "rejected_departure"
                        ? { ...base, submittedBy: registrar!.id, isValidatedDeparture: false, departureDateValidated: departureAt, departureValidatedBy: registrar!.id, departureRejectionReason: pr.reason, isValidatedArrival: null }
                        : {
                              ...base, submittedBy: registrar!.id, isValidatedDeparture: true, departureDateValidated: departureAt, departureValidatedBy: registrar!.id,
                              isValidatedArrival: false, arrivalDateValidated: arrivalAt, arrivalValidatedBy: staff.validator.id, arrivalRejectionReason: pr.reason,
                          };
            await prisma.preregistration.create({ data });
            rank++;
        }

        perSchool.set(host.uai, (perSchool.get(host.uai) ?? 0) + 1);
    }
    return perSchool;
}

function studentColumns(student: StudentDef) {
    return {
        studentFirstName: student.firstName, studentLastName: student.lastName, studentBirthDate: student.birthDate,
        studentClass: student.studentClass, isUlis: student.isUlis ?? false,
        parentEmail: student.parentEmail, studentEmail: student.studentEmail ?? null, studentContact: null,
        originSchoolUai: student.origin.uai, originSchoolSiteId: student.origin.siteId,
    };
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    assertTargetFromUrl();
    const prisma = new PrismaClient();
    try {
        await assertTargetFromServer(prisma);
        console.log(`Base visée : ${TARGET_DATABASE} — année scolaire ${ACADEMIC_YEAR_ID}, jour de référence ${ymd(TODAY)}.`);

        await cleanDemoData(prisma);
        if (process.argv.includes("--clean")) return;

        await createSchools(prisma);
        await createUsers(prisma);
        await createSettings(prisma);
        const annualAuthorizationId = await createAnnualAuthorization(prisma);
        await createSessions(prisma, annualAuthorizationId);

        const counts = {
            établissements: await prisma.school.count({ where: { uai: { startsWith: UAI_PREFIX } } }),
            comptes: await prisma.user.count({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } } }),
            "mini-stages": await prisma.ministageSession.count({ where: { hostSchoolUai: { startsWith: UAI_PREFIX } } }),
            participants: await prisma.participant.count({ where: { session: { hostSchoolUai: { startsWith: UAI_PREFIX } } } }),
            préinscriptions: await prisma.preregistration.count({ where: { session: { hostSchoolUai: { startsWith: UAI_PREFIX } } } }),
            "parcours de signature": await prisma.electronicSignatureProcess.count({ where: { participant: { session: { hostSchoolUai: { startsWith: UAI_PREFIX } } } } }),
        };
        console.log(`✅ Créé : ${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(", ")}.`);
        console.log(`   Mot de passe commun des comptes de démo : ${DEMO_PASSWORD}`);
        for (const user of USERS) {
            console.log(`   ${user.role.padEnd(12)} ${user.email.padEnd(40)} ${user.school.officialName}`);
        }
        for (const warning of warnings) console.warn(`⚠️  ${warning}`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error("❌", error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
