import { createHash } from 'node:crypto';
import {
  AcquisitionMethod,
  DEMO_ACCOUNT_EMAIL,
  ClientType,
  EquipmentStatus,
  UserRole,
  WorksiteStatus,
  clientDisplayName,
  equipmentCostOverPeriod,
  toMinorUnits,
  withSinglePrimary,
  type EquipmentCostInput,
} from '@chantia/shared';

/** The figures below are written in dinars; what is stored is in millimes. */
function minor(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : toMinorUnits(value, 'TND');
}

/**
 * The demo data — what `seed-demo.ts` writes into its own test organization,
 * « Chantia Démo », so there is something to look at: accounts to sign in
 * with, clients, worksites in every status, workers, a fleet bought, leased
 * and hired, and machines booked on worksites past, present and future.
 *
 * A dedicated organization, never a real one: the tenant filter keeps it
 * apart from everybody else's data, and resetting it can delete everything in
 * it without a second thought.
 *
 * Pure: no database, no clock of its own — `today` is handed in — so a test can
 * check the whole set holds together (no machine in two places on a day, no
 * booking outside a machine's contract) without writing a row.
 *
 * **Every id is derived from a key** (`seedId`): running the seed again updates
 * the same rows instead of adding more.
 */

/** The test organization's id — fixed, so every run finds the same one. */
export { DEMO_ORGANIZATION_ID } from '@chantia/shared';
export const DEMO_ORGANIZATION_NAME = 'Chantia Démo';

export interface DemoAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  /** A worker record this account is, for a site role. */
  workerId: string | null;
}

/** A stable UUID from the organization and a key — a v5-style name-based id. */
export function seedId(organizationId: string, key: string): string {
  const hash = createHash('sha1').update(`chantia-demo:${organizationId}:${key}`).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** `today` shifted by `days`, as `YYYY-MM-DD`. */
export function shift(today: string, days: number): string {
  const [year = NaN, month = NaN, date = NaN] = today.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

export interface DemoContact {
  id: string;
  firstName: string | null;
  lastName: string;
  position: string | null;
  mobilePhone: string | null;
  landlinePhone: string | null;
  email: string | null;
  isPrimary: boolean;
}

export interface DemoClient {
  id: string;
  type: ClientType;
  firstName: string | null;
  lastName: string | null;
  legalName: string | null;
  displayName: string;
  billingLine1: string | null;
  billingPostalCode: string | null;
  billingCity: string | null;
  contacts: DemoContact[];
}

export interface DemoWorksite {
  id: string;
  code: string;
  name: string;
  clientId: string | null;
  address: string;
  plannedStartDate: string;
  plannedEndDate: string;
  status: WorksiteStatus;
  totalBudget: number | null;
}

export interface DemoWorker {
  id: string;
  name: string;
  qualification: string | null;
  hourlyRate: number;
  active: boolean;
}

export interface DemoEquipment {
  id: string;
  typeCode: string;
  designation: string;
  fleetNumber: string;
  brand: string | null;
  model: string | null;
  registrationNumber: string | null;
  manufactureYear: number | null;
  status: EquipmentStatus;
  supplier: string | null;
  pricing: EquipmentCostInput & { buyoutValue?: number | null };
}

export interface DemoAssignment {
  id: string;
  equipmentId: string;
  worksiteId: string;
  startDate: string;
  endDate: string;
  pricing: EquipmentCostInput;
  cost: number;
  notes: string | null;
}

/**
 * How far along a planned worksite is meant to look. `late` leaves recent lines
 * unfinished, `control` puts an unfinished check within two days, `ok` keeps
 * everything on schedule.
 */
export type DemoPace = 'late' | 'control' | 'ok';

/** A worksite whose planning the seed builds from a reference plan. */
export interface DemoPlan {
  worksiteId: string;
  /** The `code` of a reference plan of the library. */
  templateCode: string;
  pace: DemoPace;
  /** The accounts that work on it: what « mes chantiers » shows them. */
  memberIds: string[];
}

/** Lines that ended within this many days stay unfinished on a late worksite. */
const LATE_WINDOW_DAYS = 14;

const dayNumber = (day: string): number => Date.parse(`${day}T00:00:00.000Z`) / 86_400_000;

/**
 * The progress a lowest line shows on `today`: done when it should be, under
 * way in proportion to its days, not started before its start. On a late
 * worksite, what should have ended lately has not, and what is under way lags.
 */
export function demoProgress(
  plannedStart: string,
  plannedEnd: string,
  today: string,
  pace: DemoPace,
): number {
  if (plannedEnd < today) {
    return pace === 'late' && dayNumber(today) - dayNumber(plannedEnd) <= LATE_WINDOW_DAYS
      ? 40
      : 100;
  }
  if (plannedStart > today) {
    return 0;
  }
  const elapsed =
    (dayNumber(today) - dayNumber(plannedStart) + 1) /
    (dayNumber(plannedEnd) - dayNumber(plannedStart) + 1);
  const value = elapsed * (pace === 'late' ? 50 : 100);
  return Math.min(100, Math.round(value / 5) * 5);
}

export interface DemoData {
  accounts: DemoAccount[];
  clients: DemoClient[];
  worksites: DemoWorksite[];
  workers: DemoWorker[];
  equipment: DemoEquipment[];
  assignments: DemoAssignment[];
  plans: DemoPlan[];
}

export function buildDemoData(organizationId: string, today: string): DemoData {
  const id = (key: string) => seedId(organizationId, key);
  const day = (days: number) => shift(today, days);

  // --- Clients -------------------------------------------------------------
  const client = (
    key: string,
    props: Omit<DemoClient, 'id' | 'displayName' | 'contacts'>,
    contacts: Omit<DemoContact, 'id' | 'isPrimary'>[],
  ): DemoClient => ({
    id: id(`client:${key}`),
    ...props,
    displayName: clientDisplayName(props),
    contacts: withSinglePrimary(
      // The first becomes primary: none is flagged.
      contacts.map((contact, index) => ({
        ...contact,
        id: id(`contact:${key}:${index}`),
        isPrimary: false,
      })),
    ),
  });

  const sousse = client(
    'sousse',
    {
      type: ClientType.LEGAL_ENTITY,
      firstName: null,
      lastName: null,
      legalName: 'Municipalité de Sousse',
      billingLine1: 'Avenue Habib Bourguiba',
      billingPostalCode: '4000',
      billingCity: 'Sousse',
    },
    [
      {
        firstName: 'Sami',
        lastName: 'Trabelsi',
        position: 'Directeur technique',
        mobilePhone: '+216 98 000 101',
        landlinePhone: '+216 73 000 101',
        email: 'sami.trabelsi@demo.chantia.tn',
      },
      {
        firstName: 'Leïla',
        lastName: 'Gharbi',
        position: 'Service des marchés',
        mobilePhone: null,
        landlinePhone: '+216 73 000 102',
        email: 'marches@demo.chantia.tn',
      },
    ],
  );
  const smt = client(
    'smt',
    {
      type: ClientType.LEGAL_ENTITY,
      firstName: null,
      lastName: null,
      legalName: 'Société Méditerranéenne de Travaux',
      billingLine1: 'Zone industrielle Sidi Abdelhamid',
      billingPostalCode: '4061',
      billingCity: 'Sousse',
    },
    [
      {
        firstName: 'Mehdi',
        lastName: 'Jaziri',
        position: 'Conducteur de travaux',
        mobilePhone: '+216 55 000 201',
        landlinePhone: null,
        email: 'mehdi.jaziri@demo.chantia.tn',
      },
    ],
  );
  const ministry = client(
    'equipement',
    {
      type: ClientType.LEGAL_ENTITY,
      firstName: null,
      lastName: null,
      legalName: 'Direction régionale de l’Équipement de Monastir',
      billingLine1: 'Route de la Corniche',
      billingPostalCode: '5000',
      billingCity: 'Monastir',
    },
    [
      {
        firstName: 'Hatem',
        lastName: 'Ben Salah',
        position: 'Chef d’arrondissement',
        mobilePhone: '+216 22 000 301',
        landlinePhone: '+216 73 000 301',
        email: null,
      },
    ],
  );
  const individual = client(
    'benali',
    {
      type: ClientType.INDIVIDUAL,
      firstName: 'Karim',
      lastName: 'Benali',
      legalName: null,
      billingLine1: 'Rue Ibn Khaldoun',
      billingPostalCode: '4051',
      billingCity: 'Hammam Sousse',
    },
    [
      {
        firstName: 'Karim',
        lastName: 'Benali',
        position: null,
        mobilePhone: '+216 29 000 401',
        landlinePhone: null,
        email: null,
      },
    ],
  );

  // --- Worksites -----------------------------------------------------------
  const worksite = (key: string, props: Omit<DemoWorksite, 'id'>): DemoWorksite => ({
    id: id(`worksite:${key}`),
    ...props,
  });

  // The worksites of « mes chantiers »: one of each kind of trade.
  const oliviers = client(
    'oliviers',
    {
      type: ClientType.LEGAL_ENTITY,
      firstName: null,
      lastName: null,
      legalName: 'SCI Les Oliviers',
      billingLine1: 'Boulevard du 14 Janvier',
      billingPostalCode: '4051',
      billingCity: 'Sahloul',
    },
    [
      {
        firstName: 'Hela',
        lastName: 'Ben Romdhane',
        position: 'Gérante',
        mobilePhone: '+216 98 000 301',
        landlinePhone: null,
        email: 'hela.benromdhane@demo.chantia.tn',
      },
    ],
  );
  const transSahel = client(
    'trans-sahel',
    {
      type: ClientType.LEGAL_ENTITY,
      firstName: null,
      lastName: null,
      legalName: 'Trans Sahel Logistique',
      billingLine1: 'Zone logistique',
      billingPostalCode: '4030',
      billingCity: 'Enfidha',
    },
    [
      {
        firstName: 'Karim',
        lastName: 'Jaziri',
        position: 'Directeur des opérations',
        mobilePhone: '+216 98 000 302',
        landlinePhone: null,
        email: 'karim.jaziri@demo.chantia.tn',
      },
    ],
  );
  const benSalah = client(
    'ben-salah',
    {
      type: ClientType.INDIVIDUAL,
      firstName: 'Mourad',
      lastName: 'Ben Salah',
      legalName: null,
      billingLine1: 'Rue des Jasmins',
      billingPostalCode: '4011',
      billingCity: 'Hammam Sousse',
    },
    [
      {
        firstName: 'Mourad',
        lastName: 'Ben Salah',
        position: null,
        mobilePhone: '+216 98 000 303',
        landlinePhone: null,
        email: null,
      },
    ],
  );
  const sonede = client(
    'sonede',
    {
      type: ClientType.LEGAL_ENTITY,
      firstName: null,
      lastName: null,
      legalName: 'SONEDE, district de Sousse',
      billingLine1: 'Avenue de la République',
      billingPostalCode: '4000',
      billingCity: 'Sousse',
    },
    [
      {
        firstName: 'Nabil',
        lastName: 'Khelifi',
        position: 'Chef de projet',
        mobilePhone: '+216 98 000 304',
        landlinePhone: '+216 73 000 304',
        email: 'nabil.khelifi@demo.chantia.tn',
      },
    ],
  );
  const conseil = client(
    'conseil-regional',
    {
      type: ClientType.LEGAL_ENTITY,
      firstName: null,
      lastName: null,
      legalName: 'Conseil régional de Monastir',
      billingLine1: 'Avenue de l’Environnement',
      billingPostalCode: '5000',
      billingCity: 'Monastir',
    },
    [
      {
        firstName: 'Rim',
        lastName: 'Haddad',
        position: 'Service des routes',
        mobilePhone: null,
        landlinePhone: '+216 73 000 305',
        email: 'rim.haddad@demo.chantia.tn',
      },
    ],
  );

  const worksites = [
    worksite('oliviers', {
      code: 'IMM-03',
      name: 'Immeuble Les Oliviers, Sahloul',
      clientId: oliviers.id,
      address: 'Rue Ibn Khaldoun, Sahloul',
      plannedStartDate: day(-150),
      plannedEndDate: day(90),
      status: WorksiteStatus.IN_PROGRESS,
      totalBudget: 2_600_000,
    }),
    worksite('hangar', {
      code: 'HAN-01',
      name: 'Hangar logistique, Enfidha',
      clientId: transSahel.id,
      address: 'Zone logistique, lot 12',
      plannedStartDate: day(-40),
      plannedEndDate: day(80),
      status: WorksiteStatus.IN_PROGRESS,
      totalBudget: 980_000,
    }),
    worksite('villa', {
      code: 'VIL-07',
      name: 'Villa R+1, Hammam Sousse',
      clientId: benSalah.id,
      address: 'Rue des Jasmins, Hammam Sousse',
      plannedStartDate: day(-50),
      plannedEndDate: day(130),
      status: WorksiteStatus.IN_PROGRESS,
      totalBudget: 420_000,
    }),
    worksite('eau-potable', {
      code: 'EP-12',
      name: 'Réseau d’eau potable, Msaken',
      clientId: sonede.id,
      address: 'Quartier El Borj, Msaken',
      plannedStartDate: day(-35),
      plannedEndDate: day(60),
      status: WorksiteStatus.IN_PROGRESS,
      totalBudget: 610_000,
    }),
    worksite('bembla', {
      code: 'PIS-02',
      name: 'Piste rurale de Bembla',
      clientId: conseil.id,
      address: 'Délégation de Bembla',
      plannedStartDate: day(-20),
      plannedEndDate: day(100),
      status: WorksiteStatus.IN_PROGRESS,
      totalBudget: 540_000,
    }),
    worksite('rn1', {
      code: 'RN1-01',
      name: 'Réfection de la RN1 — section Sousse nord',
      clientId: ministry.id,
      address: 'RN1, PK 138 à PK 146',
      plannedStartDate: day(-60),
      plannedEndDate: day(90),
      status: WorksiteStatus.IN_PROGRESS,
      totalBudget: 1_850_000,
    }),
    worksite('corniche', {
      code: 'SOU-02',
      name: 'Aménagement de la corniche de Sousse',
      clientId: sousse.id,
      address: 'Boulevard de la Corniche, Sousse',
      plannedStartDate: day(-30),
      plannedEndDate: day(45),
      status: WorksiteStatus.IN_PROGRESS,
      totalBudget: 640_000,
    }),
    worksite('rocade', {
      code: 'MON-03',
      name: 'Rocade ouest de Monastir',
      clientId: ministry.id,
      address: 'Rocade ouest, Monastir',
      plannedStartDate: day(-120),
      plannedEndDate: day(-5),
      // Past its planned end and still open — the late case, on purpose.
      status: WorksiteStatus.IN_PROGRESS,
      totalBudget: 2_300_000,
    }),
    worksite('zi', {
      code: 'ZI-04',
      name: 'Voirie de la zone industrielle Sidi Abdelhamid',
      clientId: smt.id,
      address: 'ZI Sidi Abdelhamid, Sousse',
      plannedStartDate: day(-10),
      plannedEndDate: day(20),
      status: WorksiteStatus.IN_PROGRESS,
      totalBudget: 310_000,
    }),
    worksite('parking', {
      code: 'HS-05',
      name: 'Parking et accès — villa Benali',
      clientId: individual.id,
      address: 'Rue Ibn Khaldoun, Hammam Sousse',
      plannedStartDate: day(21),
      plannedEndDate: day(35),
      status: WorksiteStatus.UPCOMING,
      totalBudget: 48_000,
    }),
    worksite('pistes', {
      code: 'PR-06',
      name: 'Pistes rurales de Msaken',
      clientId: sousse.id,
      address: 'Délégation de Msaken',
      plannedStartDate: day(45),
      plannedEndDate: day(150),
      status: WorksiteStatus.UPCOMING,
      totalBudget: null,
    }),
    worksite('giratoire', {
      code: 'GIR-07',
      name: 'Giratoire de Khezama',
      clientId: sousse.id,
      address: 'Carrefour de Khezama, Sousse',
      plannedStartDate: day(-240),
      plannedEndDate: day(-150),
      status: WorksiteStatus.COMPLETED,
      totalBudget: 520_000,
    }),
    worksite('assainissement', {
      code: 'ASS-08',
      name: 'Reprise de chaussée après assainissement',
      clientId: smt.id,
      address: 'Cité Riadh, Sousse',
      plannedStartDate: day(-45),
      plannedEndDate: day(30),
      status: WorksiteStatus.SUSPENDED,
      totalBudget: 175_000,
    }),
  ];
  const [rn1, corniche, rocade, zi, , , giratoire] = worksites;

  // --- Workers -------------------------------------------------------------
  const workers: DemoWorker[] = [
    ['Mohamed Ayari', 'Chef d’équipe', 22],
    ['Anis Hammami', 'Conducteur d’engins', 19.5],
    ['Walid Chaabane', 'Conducteur d’engins', 19.5],
    ['Nabil Mejri', 'Maçon', 16],
    ['Fethi Dridi', 'Manœuvre', 12.5],
    ['Sonia Khelifi', 'Topographe', 21],
    ['Riadh Zouari', 'Manœuvre', 12.5],
  ].map(([name, qualification, hourlyRate], index) => ({
    id: id(`worker:${index}`),
    name: name as string,
    qualification: qualification as string,
    hourlyRate: hourlyRate as number,
    active: index !== 6,
  }));

  // --- Equipment -----------------------------------------------------------
  const machine = (key: string, props: Omit<DemoEquipment, 'id'>): DemoEquipment => ({
    id: id(`equipment:${key}`),
    ...props,
  });

  const equipment = [
    machine('pelle', {
      typeCode: 'crawler_excavator',
      designation: 'Pelle CAT 320',
      fleetNumber: 'PL-01',
      brand: 'Caterpillar',
      model: '320 GC',
      registrationNumber: null,
      manufactureYear: 2022,
      status: EquipmentStatus.IN_SERVICE,
      supplier: 'Tunisie Engins',
      pricing: {
        acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
        acquisitionDate: day(-700),
        purchasePrice: 385_000,
        residualValue: 60_000,
        usefulLifeMonths: 60,
      },
    }),
    machine('niveleuse', {
      typeCode: 'motor_grader',
      designation: 'Niveleuse 140K',
      fleetNumber: 'NV-01',
      brand: 'Caterpillar',
      model: '140K',
      registrationNumber: null,
      manufactureYear: 2020,
      status: EquipmentStatus.IN_SERVICE,
      supplier: 'Leasing Maghreb',
      pricing: {
        acquisitionMethod: AcquisitionMethod.LEASING,
        acquisitionDate: day(-400),
        monthlyPayment: 9_800,
        contractEndDate: day(1060),
        buyoutValue: 45_000,
      },
    }),
    machine('compacteur', {
      typeCode: 'tandem_roller',
      designation: 'Compacteur tandem HAMM HD12',
      fleetNumber: 'CP-01',
      brand: 'HAMM',
      model: 'HD12 VV',
      registrationNumber: null,
      manufactureYear: 2021,
      status: EquipmentStatus.IN_SERVICE,
      supplier: null,
      pricing: {
        acquisitionMethod: AcquisitionMethod.CREDIT_PURCHASE,
        acquisitionDate: day(-500),
        purchasePrice: 175_000,
        residualValue: 20_000,
        usefulLifeMonths: 60,
      },
    }),
    machine('finisseur', {
      typeCode: 'asphalt_paver',
      designation: 'Finisseur Vögele Super 1800',
      fleetNumber: 'FN-01',
      brand: 'Vögele',
      model: 'Super 1800-3i',
      registrationNumber: null,
      manufactureYear: 2019,
      status: EquipmentStatus.IN_SERVICE,
      supplier: 'Loc’Routes',
      pricing: {
        acquisitionMethod: AcquisitionMethod.SHORT_TERM_RENTAL,
        acquisitionDate: day(-20),
        dailyRate: 1_450,
        contractEndDate: day(60),
      },
    }),
    machine('camion', {
      typeCode: 'dump_truck',
      designation: 'Camion benne Volvo FMX',
      fleetNumber: 'CB-01',
      brand: 'Volvo',
      model: 'FMX 440 6x4',
      registrationNumber: '215 TU 4521',
      manufactureYear: 2023,
      status: EquipmentStatus.IN_SERVICE,
      supplier: 'Location Poids Lourds',
      pricing: {
        acquisitionMethod: AcquisitionMethod.LONG_TERM_RENTAL,
        acquisitionDate: day(-200),
        monthlyPayment: 6_200,
        contractEndDate: day(530),
      },
    }),
    machine('station', {
      typeCode: 'total_station',
      designation: 'Station totale Leica TS07',
      fleetNumber: 'TP-01',
      brand: 'Leica',
      model: 'TS07',
      registrationNumber: null,
      manufactureYear: 2022,
      status: EquipmentStatus.UNDER_MAINTENANCE,
      supplier: null,
      pricing: {
        acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
        acquisitionDate: day(-900),
        purchasePrice: 38_000,
        residualValue: 0,
        usefulLifeMonths: 80,
      },
    }),
  ];
  const [pelle, niveleuse, compacteur, finisseur, camion] = equipment;

  // --- Assignments ---------------------------------------------------------
  // Past, present and future, and never one machine in two places on a day —
  // a test checks it.
  const assign = (
    key: string,
    machineRow: DemoEquipment,
    site: DemoWorksite,
    from: number,
    to: number,
    notes: string | null = null,
  ): DemoAssignment => {
    const { buyoutValue: _notPricing, ...inDinars } = machineRow.pricing;
    const pricing = {
      ...inDinars,
      purchasePrice: minor(inDinars.purchasePrice),
      residualValue: minor(inDinars.residualValue),
      monthlyPayment: minor(inDinars.monthlyPayment),
      dailyRate: minor(inDinars.dailyRate),
    };
    const startDate = day(from);
    const endDate = day(to);
    return {
      id: id(`assignment:${key}`),
      equipmentId: machineRow.id,
      worksiteId: site.id,
      startDate,
      endDate,
      pricing,
      cost: equipmentCostOverPeriod(pricing, startDate, endDate),
      notes,
    };
  };

  const assignments = [
    assign('pelle-giratoire', pelle!, giratoire!, -235, -200),
    assign('pelle-rocade', pelle!, rocade!, -110, -40),
    assign('pelle-rn1', pelle!, rn1!, -30, 40, 'Avec chauffeur'),
    assign('niveleuse-rocade', niveleuse!, rocade!, -100, -61),
    assign('niveleuse-rn1', niveleuse!, rn1!, -60, 30),
    assign('compacteur-rocade', compacteur!, rocade!, -90, -20),
    assign('compacteur-zi', compacteur!, zi!, -10, 20),
    assign('finisseur-corniche', finisseur!, corniche!, -5, 15),
    assign('finisseur-zi', finisseur!, zi!, 16, 25),
    assign('camion-rn1', camion!, rn1!, -60, -1),
    assign('camion-corniche', camion!, corniche!, 0, 45),
  ];

  // --- Accounts ------------------------------------------------------------
  // One per point of view: the office that sees money, and the field that
  // does not. The foreman is also a worker — the crew leader on the payroll.
  const accounts: DemoAccount[] = [
    {
      id: id('account:admin'),
      email: 'admin@chantia-demo.test',
      firstName: 'Admin',
      lastName: 'Démo',
      role: UserRole.ADMIN,
      workerId: null,
    },
    {
      id: id('account:site-manager'),
      email: 'conducteur@chantia-demo.test',
      firstName: 'Yassine',
      lastName: 'Belhaj',
      role: UserRole.SITE_MANAGER,
      workerId: null,
    },
    {
      id: id('account:foreman'),
      email: 'chef@chantia-demo.test',
      firstName: 'Mohamed',
      lastName: 'Ayari',
      role: UserRole.FOREMAN,
      workerId: workers[0]!.id,
    },
    {
      // The showcase's « Essayer la démo » opens a session on this one: an
      // office account that sees everything, and cannot hand out accounts.
      id: id('account:demo'),
      email: DEMO_ACCOUNT_EMAIL,
      firstName: 'Visiteur',
      lastName: 'Démo',
      role: UserRole.SITE_MANAGER,
      workerId: null,
    },
  ];

  // --- Plannings and teams --------------------------------------------------
  // Each from a reference plan of the library, built by the seed itself: the
  // library lives in the database. Who works where mirrors « mes chantiers ».
  const siteManager = id('account:site-manager');
  const foreman = id('account:foreman');
  // The visitor's account works on every planned worksite: they all show.
  const visitor = id('account:demo');
  const byCode = (code: string) => worksites.find((worksite) => worksite.code === code)!.id;
  const plans: DemoPlan[] = [
    {
      worksiteId: byCode('RN1-01'),
      templateCode: 'route-neuve',
      pace: 'late',
      memberIds: [siteManager, foreman, visitor],
    },
    {
      worksiteId: byCode('IMM-03'),
      templateCode: 'immeuble',
      pace: 'late',
      memberIds: [siteManager, visitor],
    },
    {
      worksiteId: byCode('HAN-01'),
      templateCode: 'hangar',
      pace: 'control',
      memberIds: [siteManager, foreman, visitor],
    },
    {
      worksiteId: byCode('VIL-07'),
      templateCode: 'villa',
      pace: 'control',
      memberIds: [foreman, visitor],
    },
    {
      worksiteId: byCode('EP-12'),
      templateCode: 'eau-potable',
      pace: 'ok',
      memberIds: [siteManager, visitor],
    },
    {
      worksiteId: byCode('PIS-02'),
      templateCode: 'piste-rurale',
      pace: 'ok',
      memberIds: [foreman, visitor],
    },
  ];

  return {
    accounts,
    clients: [sousse, smt, ministry, individual, oliviers, transSahel, benSalah, sonede, conseil],
    worksites,
    workers,
    equipment,
    assignments,
    plans,
  };
}
