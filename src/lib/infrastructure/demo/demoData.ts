/**
 * Demo data generator for Groupwheel.
 *
 * Creates realistic data that simulates a teacher's full school year,
 * with multiple classes, students with realistic names, and historical
 * grouping activities.
 *
 * Activated via URL parameter: ?demo=true
 * Or keyboard shortcut: Ctrl+Shift+D (when devtools enabled)
 *
 * @module infrastructure/demo/demoData
 */

import type {
  Student,
  Pool,
  Program,
  Preference,
  Scenario,
  Session,
  GroupTemplate,
  Staff,
  Placement
} from '$lib/domain';
import { isStudentPreference, type StudentPreference } from '$lib/domain/preference';

// =============================================================================
// REALISTIC NAME DATA
// =============================================================================

const FIRST_NAMES = [
  // Common US names with diverse origins
  'Aiden',
  'Olivia',
  'Liam',
  'Emma',
  'Noah',
  'Ava',
  'Elijah',
  'Sophia',
  'James',
  'Isabella',
  'William',
  'Mia',
  'Benjamin',
  'Charlotte',
  'Lucas',
  'Amelia',
  'Henry',
  'Harper',
  'Alexander',
  'Evelyn',
  'Mason',
  'Abigail',
  'Michael',
  'Emily',
  'Ethan',
  'Elizabeth',
  'Daniel',
  'Sofia',
  'Jacob',
  'Ella',
  // Additional diverse names
  'Jayden',
  'Camila',
  'Logan',
  'Luna',
  'Jackson',
  'Chloe',
  'Sebastian',
  'Penelope',
  'Mateo',
  'Layla',
  'Jack',
  'Riley',
  'Owen',
  'Zoey',
  'Theodore',
  'Nora',
  'Amir',
  'Lily',
  'Santiago',
  'Eleanor',
  'Isaiah',
  'Hannah',
  'Ryan',
  'Addison',
  'Nathan',
  'Aubrey',
  'Leo',
  'Stella',
  'Adrian',
  'Natalie',
  'Caleb',
  'Leah',
  'Kai',
  'Savannah',
  'Ezra',
  'Brooklyn',
  'Connor',
  'Aria',
  'Aaron',
  'Skylar',
  // More diverse names
  'Hiroshi',
  'Priya',
  'Mohammed',
  'Fatima',
  'Wei',
  'Mei',
  'Dmitri',
  'Anastasia',
  'Carlos',
  'Maria',
  'Andre',
  'Jasmine',
  'Yusuf',
  'Zara',
  'Kofi',
  'Amara',
  'Raj',
  'Ananya',
  'Kenji',
  'Sakura',
  'Omar',
  'Aaliyah',
  'Ivan',
  'Tatiana',
  'Luis',
  'Valentina',
  'Kwame',
  'Nia',
  'Hassan',
  'Laila',
  'Jun',
  'Yuki'
];

const LAST_NAMES = [
  // Common US surnames with diverse origins
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
  'Chen',
  'Kim',
  'Patel',
  'Singh',
  'Wong',
  'Park',
  'Tanaka',
  'Sato',
  'Yamamoto',
  'Okonkwo',
  'Mensah',
  'Ahmed',
  'Khan',
  'Sharma',
  'Kumar',
  'Ivanov',
  'Petrov',
  'Santos',
  'Silva',
  'Costa',
  'Ferreira'
];

// =============================================================================
// ID GENERATORS
// =============================================================================

let studentIdCounter = 0;
let poolIdCounter = 0;
let programIdCounter = 0;
let scenarioIdCounter = 0;
let sessionIdCounter = 0;
let templateIdCounter = 0;
let prefIdCounter = 0;
let groupIdCounter = 0;
let placementIdCounter = 0;

function resetCounters() {
  studentIdCounter = 0;
  poolIdCounter = 0;
  programIdCounter = 0;
  scenarioIdCounter = 0;
  sessionIdCounter = 0;
  templateIdCounter = 0;
  prefIdCounter = 0;
  groupIdCounter = 0;
  placementIdCounter = 0;
}

function generatePlacementId(): string {
  return `demo-placement-${++placementIdCounter}`;
}

function generateStudentId(): string {
  return `demo-stu-${++studentIdCounter}`;
}

function generatePoolId(): string {
  return `demo-pool-${++poolIdCounter}`;
}

function generateProgramId(): string {
  return `demo-prog-${++programIdCounter}`;
}

function generateScenarioId(): string {
  return `demo-scenario-${++scenarioIdCounter}`;
}

function generateSessionId(): string {
  return `demo-session-${++sessionIdCounter}`;
}

function generateTemplateId(): string {
  return `demo-template-${++templateIdCounter}`;
}

function generatePrefId(): string {
  return `demo-pref-${++prefIdCounter}`;
}

function generateGroupId(): string {
  return `demo-grp-${++groupIdCounter}`;
}

// =============================================================================
// RANDOM HELPERS
// =============================================================================

function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function shuffle<T>(array: T[], random: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom<T>(array: T[], random: () => number): T {
  return array[Math.floor(random() * array.length)];
}

function pickRandomN<T>(array: T[], n: number, random: () => number): T[] {
  const shuffled = shuffle(array, random);
  return shuffled.slice(0, Math.min(n, array.length));
}

// =============================================================================
// STUDENT GENERATION
// =============================================================================

function generateStudents(count: number, gradeLevel: string, random: () => number): Student[] {
  const usedNames = new Set<string>();
  const students: Student[] = [];

  const shuffledFirstNames = shuffle([...FIRST_NAMES], random);
  const shuffledLastNames = shuffle([...LAST_NAMES], random);

  for (let i = 0; i < count; i++) {
    let firstName = shuffledFirstNames[i % shuffledFirstNames.length];
    let lastName = shuffledLastNames[i % shuffledLastNames.length];
    let fullName = `${firstName} ${lastName}`;

    // Ensure unique names
    let attempts = 0;
    while (usedNames.has(fullName) && attempts < 100) {
      firstName = pickRandom(FIRST_NAMES, random);
      lastName = pickRandom(LAST_NAMES, random);
      fullName = `${firstName} ${lastName}`;
      attempts++;
    }
    usedNames.add(fullName);

    students.push({
      id: generateStudentId(),
      firstName,
      lastName,
      gradeLevel,
      gender: random() > 0.5 ? 'F' : 'M'
    });
  }

  return students;
}

// =============================================================================
// PREFERENCE GENERATION
// =============================================================================

function generatePreferences(
  programId: string,
  students: Student[],
  groupIds: string[],
  random: () => number
): Preference[] {
  const preferences: Preference[] = [];

  for (const student of students) {
    const avoidStudentIds: string[] = [];
    const likeGroupIds: string[] = [];
    const avoidGroupIds: string[] = [];

    // ~30% of students have someone they want to avoid
    if (random() < 0.3 && students.length > 5) {
      const otherStudents = students.filter((s) => s.id !== student.id);
      const toAvoid = pickRandomN(otherStudents, Math.ceil(random() * 2), random);
      avoidStudentIds.push(...toAvoid.map((s) => s.id));
    }

    // ~40% of students have a group preference
    if (random() < 0.4 && groupIds.length > 0) {
      const preferredGroup = pickRandom(groupIds, random);
      likeGroupIds.push(preferredGroup);
    }

    // ~10% of students want to avoid a specific group
    if (random() < 0.1 && groupIds.length > 1) {
      const groupsToAvoid = groupIds.filter((g) => !likeGroupIds.includes(g));
      if (groupsToAvoid.length > 0) {
        avoidGroupIds.push(pickRandom(groupsToAvoid, random));
      }
    }

    preferences.push({
      id: generatePrefId(),
      programId,
      studentId: student.id,
      payload: {
        studentId: student.id,
        avoidStudentIds,
        likeGroupIds,
        avoidGroupIds
      } satisfies StudentPreference
    });
  }

  return preferences;
}

// =============================================================================
// GROUP & SCENARIO GENERATION
// =============================================================================

interface GroupConfig {
  name: string;
  capacity: number;
}

function generateGroups(
  configs: GroupConfig[]
): { id: string; name: string; capacity: number; memberIds: string[] }[] {
  return configs.map((config) => ({
    id: generateGroupId(),
    name: config.name,
    capacity: config.capacity,
    memberIds: []
  }));
}

function assignStudentsToGroups(
  students: Student[],
  groups: { id: string; name: string; capacity: number | null; memberIds: string[] }[],
  random: () => number
): { id: string; name: string; capacity: number | null; memberIds: string[] }[] {
  const shuffledStudents = shuffle(students, random);
  const result = groups.map((g) => ({ ...g, memberIds: [] as string[] }));

  // Simple round-robin assignment
  let groupIndex = 0;
  for (const student of shuffledStudents) {
    result[groupIndex].memberIds.push(student.id);
    groupIndex = (groupIndex + 1) % result.length;
  }

  return result;
}

/**
 * Generates Placement records for a published session.
 * Placements link students to groups and capture preference rank at assignment time.
 */
function generatePlacementsForSession(
  session: Session,
  scenario: Scenario,
  preferences: Preference[]
): Placement[] {
  const placements: Placement[] = [];
  const publishedAt = session.publishedAt ?? session.createdAt ?? new Date();

  // Build a map of studentId -> StudentPreference (extracted from payload) for quick lookup
  const prefByStudent = new Map<string, StudentPreference>();
  for (const pref of preferences) {
    if (isStudentPreference(pref.payload)) {
      prefByStudent.set(pref.studentId, pref.payload);
    }
  }

  // For each group in the scenario, create placements for each member
  for (const group of scenario.groups) {
    for (const studentId of group.memberIds) {
      // Find the student's preference rank for this group
      const studentPref = prefByStudent.get(studentId);
      let preferenceRank: number | null = null;
      let preferenceSnapshot: string[] | undefined;

      if (studentPref?.likeGroupIds && studentPref.likeGroupIds.length > 0) {
        preferenceSnapshot = studentPref.likeGroupIds;
        const rankIndex = studentPref.likeGroupIds.indexOf(group.id);
        if (rankIndex >= 0) {
          preferenceRank = rankIndex + 1; // 1-indexed rank
        }
      }

      const placement: Placement = {
        id: generatePlacementId(),
        sessionId: session.id,
        studentId,
        groupId: group.id,
        groupName: group.name,
        preferenceRank,
        preferenceSnapshot,
        assignedAt: publishedAt,
        assignedByStaffId: session.createdByStaffId,
        startDate: session.startDate ?? publishedAt,
        type: 'INITIAL'
      };

      placements.push(placement);
    }
  }

  return placements;
}

// =============================================================================
// DEMO DATA STRUCTURE
// =============================================================================

export interface DemoDataSet {
  staff: Staff[];
  students: Student[];
  pools: Pool[];
  programs: Program[];
  preferences: Preference[];
  scenarios: Scenario[];
  sessions: Session[];
  placements: Placement[];
  groupTemplates: GroupTemplate[];
}

// =============================================================================
// MAIN DEMO DATA GENERATOR
// =============================================================================

/**
 * Generates a complete demo dataset simulating a teacher's school year.
 *
 * Includes:
 * - 1 staff member (the demo teacher)
 * - 3 class periods with 20-28 students each
 * - Multiple grouping activities per class
 * - Historical sessions showing past groupings
 * - Realistic student preferences
 * - Group templates for common configurations
 */
export function generateDemoData(seed: number = 42): DemoDataSet {
  resetCounters();
  const random = seededRandom(seed);

  // Staff - use the default 'owner-1' staff that's created by createInMemoryEnvironment
  // We don't create new staff since StaffRepository doesn't have a save method
  const staff: Staff[] = [
    {
      id: 'owner-1',
      name: 'Default Owner',
      roles: ['TEACHER']
    }
  ];

  const staffId = 'owner-1';
  const now = new Date();
  const schoolYearStart = new Date(now.getFullYear(), 7, 15); // Aug 15
  const fallEnd = new Date(now.getFullYear(), 11, 20); // Dec 20
  const springStart = new Date(now.getFullYear() + 1, 0, 8); // Jan 8
  const springEnd = new Date(now.getFullYear() + 1, 5, 10); // Jun 10

  // ==========================================================================
  // CLASS 1: 5th Grade Homeroom (26 students)
  // ==========================================================================
  const class1Students = generateStudents(26, '5', random);
  const class1Pool: Pool = {
    id: generatePoolId(),
    name: '5th Grade - Room 204',
    type: 'CLASS',
    memberIds: class1Students.map((s) => s.id),
    status: 'ACTIVE',
    primaryStaffOwnerId: staffId,
    source: 'IMPORT'
  };

  // Program 1: Science Lab Partners (pairs)
  const scienceLabGroups = generateGroups([
    { name: 'Lab Station 1', capacity: 2 },
    { name: 'Lab Station 2', capacity: 2 },
    { name: 'Lab Station 3', capacity: 2 },
    { name: 'Lab Station 4', capacity: 2 },
    { name: 'Lab Station 5', capacity: 2 },
    { name: 'Lab Station 6', capacity: 2 },
    { name: 'Lab Station 7', capacity: 2 },
    { name: 'Lab Station 8', capacity: 2 },
    { name: 'Lab Station 9', capacity: 2 },
    { name: 'Lab Station 10', capacity: 2 },
    { name: 'Lab Station 11', capacity: 2 },
    { name: 'Lab Station 12', capacity: 2 },
    { name: 'Lab Station 13', capacity: 2 }
  ]);

  const scienceLabProgram: Program = {
    id: generateProgramId(),
    name: 'Science Lab Partners',
    type: 'CLASS_ACTIVITY',
    timeSpan: { termLabel: 'Fall 2024' },
    poolIds: [class1Pool.id],
    primaryPoolId: class1Pool.id,
    ownerStaffIds: [staffId]
  };

  const scienceLabPrefs = generatePreferences(
    scienceLabProgram.id,
    class1Students,
    scienceLabGroups.map((g) => g.id),
    random
  );
  const scienceLabAssigned = assignStudentsToGroups(class1Students, scienceLabGroups, random);

  const scienceLabScenario: Scenario = {
    id: generateScenarioId(),
    programId: scienceLabProgram.id,
    status: 'ADOPTED',
    groups: scienceLabAssigned,
    participantSnapshot: class1Students.map((s) => s.id),
    createdAt: new Date(schoolYearStart.getTime() + 7 * 24 * 60 * 60 * 1000),
    lastModifiedAt: new Date(schoolYearStart.getTime() + 7 * 24 * 60 * 60 * 1000),
    createdByStaffId: staffId
  };

  // Program 2: Reading Groups (4 groups of ~6-7)
  const readingGroups = generateGroups([
    { name: 'Dragons', capacity: 7 },
    { name: 'Phoenix', capacity: 7 },
    { name: 'Griffins', capacity: 7 },
    { name: 'Unicorns', capacity: 7 }
  ]);

  const readingProgram: Program = {
    id: generateProgramId(),
    name: 'Reading Circle Groups',
    type: 'CLASS_ACTIVITY',
    timeSpan: { termLabel: 'Fall 2024' },
    poolIds: [class1Pool.id],
    primaryPoolId: class1Pool.id,
    ownerStaffIds: [staffId]
  };

  const readingPrefs = generatePreferences(
    readingProgram.id,
    class1Students,
    readingGroups.map((g) => g.id),
    random
  );
  const readingAssigned = assignStudentsToGroups(class1Students, readingGroups, random);

  const readingScenario: Scenario = {
    id: generateScenarioId(),
    programId: readingProgram.id,
    status: 'ADOPTED',
    groups: readingAssigned,
    participantSnapshot: class1Students.map((s) => s.id),
    createdAt: new Date(schoolYearStart.getTime() + 14 * 24 * 60 * 60 * 1000),
    lastModifiedAt: new Date(schoolYearStart.getTime() + 14 * 24 * 60 * 60 * 1000),
    createdByStaffId: staffId
  };

  // Program 3: Math Workshop Tables
  const mathGroups = generateGroups([
    { name: 'Table 1', capacity: 5 },
    { name: 'Table 2', capacity: 5 },
    { name: 'Table 3', capacity: 5 },
    { name: 'Table 4', capacity: 5 },
    { name: 'Table 5', capacity: 5 },
    { name: 'Table 6', capacity: 5 }
  ]);

  const mathProgram: Program = {
    id: generateProgramId(),
    name: 'Math Workshop Tables',
    type: 'CLASS_ACTIVITY',
    timeSpan: { termLabel: 'Fall 2024' },
    poolIds: [class1Pool.id],
    primaryPoolId: class1Pool.id,
    ownerStaffIds: [staffId]
  };

  const mathPrefs = generatePreferences(
    mathProgram.id,
    class1Students,
    mathGroups.map((g) => g.id),
    random
  );
  const mathAssigned = assignStudentsToGroups(class1Students, mathGroups, random);

  const mathScenario: Scenario = {
    id: generateScenarioId(),
    programId: mathProgram.id,
    status: 'DRAFT',
    groups: mathAssigned,
    participantSnapshot: class1Students.map((s) => s.id),
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    lastModifiedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    createdByStaffId: staffId
  };

  // ==========================================================================
  // CLASS 2: 6th Grade Science (24 students)
  // ==========================================================================
  const class2Students = generateStudents(24, '6', random);
  const class2Pool: Pool = {
    id: generatePoolId(),
    name: '6th Grade Science - Period 3',
    type: 'CLASS',
    memberIds: class2Students.map((s) => s.id),
    status: 'ACTIVE',
    primaryStaffOwnerId: staffId,
    source: 'IMPORT'
  };

  // Program: Ecology Project Teams
  const ecoGroups = generateGroups([
    { name: 'Rainforest Team', capacity: 6 },
    { name: 'Ocean Team', capacity: 6 },
    { name: 'Desert Team', capacity: 6 },
    { name: 'Tundra Team', capacity: 6 }
  ]);

  const ecoProgram: Program = {
    id: generateProgramId(),
    name: 'Ecology Project Teams',
    type: 'CLASS_ACTIVITY',
    timeSpan: { termLabel: 'Spring 2025' },
    poolIds: [class2Pool.id],
    primaryPoolId: class2Pool.id,
    ownerStaffIds: [staffId]
  };

  const ecoPrefs = generatePreferences(
    ecoProgram.id,
    class2Students,
    ecoGroups.map((g) => g.id),
    random
  );
  const ecoAssigned = assignStudentsToGroups(class2Students, ecoGroups, random);

  const ecoScenario: Scenario = {
    id: generateScenarioId(),
    programId: ecoProgram.id,
    status: 'ADOPTED',
    groups: ecoAssigned,
    participantSnapshot: class2Students.map((s) => s.id),
    createdAt: new Date(springStart.getTime() + 21 * 24 * 60 * 60 * 1000),
    lastModifiedAt: new Date(springStart.getTime() + 21 * 24 * 60 * 60 * 1000),
    createdByStaffId: staffId
  };

  // Program: Lab Partners (different from class 1)
  const class2LabGroups = generateGroups([
    { name: 'Bench A', capacity: 2 },
    { name: 'Bench B', capacity: 2 },
    { name: 'Bench C', capacity: 2 },
    { name: 'Bench D', capacity: 2 },
    { name: 'Bench E', capacity: 2 },
    { name: 'Bench F', capacity: 2 },
    { name: 'Bench G', capacity: 2 },
    { name: 'Bench H', capacity: 2 },
    { name: 'Bench I', capacity: 2 },
    { name: 'Bench J', capacity: 2 },
    { name: 'Bench K', capacity: 2 },
    { name: 'Bench L', capacity: 2 }
  ]);

  const class2LabProgram: Program = {
    id: generateProgramId(),
    name: 'Lab Partners - Period 3',
    type: 'CLASS_ACTIVITY',
    timeSpan: { termLabel: 'Spring 2025' },
    poolIds: [class2Pool.id],
    primaryPoolId: class2Pool.id,
    ownerStaffIds: [staffId]
  };

  const class2LabPrefs = generatePreferences(
    class2LabProgram.id,
    class2Students,
    class2LabGroups.map((g) => g.id),
    random
  );
  const class2LabAssigned = assignStudentsToGroups(class2Students, class2LabGroups, random);

  const class2LabScenario: Scenario = {
    id: generateScenarioId(),
    programId: class2LabProgram.id,
    status: 'DRAFT',
    groups: class2LabAssigned,
    participantSnapshot: class2Students.map((s) => s.id),
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    lastModifiedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    createdByStaffId: staffId
  };

  // ==========================================================================
  // CLASS 3: 5th Grade Social Studies (22 students)
  // ==========================================================================
  const class3Students = generateStudents(22, '5', random);
  const class3Pool: Pool = {
    id: generatePoolId(),
    name: '5th Grade Social Studies - Period 5',
    type: 'CLASS',
    memberIds: class3Students.map((s) => s.id),
    status: 'ACTIVE',
    primaryStaffOwnerId: staffId,
    source: 'MANUAL'
  };

  // Program: History Debate Teams
  const debateGroups = generateGroups([
    { name: 'Federalists', capacity: 6 },
    { name: 'Anti-Federalists', capacity: 6 },
    { name: 'Moderates', capacity: 5 },
    { name: 'Observers', capacity: 5 }
  ]);

  const debateProgram: Program = {
    id: generateProgramId(),
    name: 'Constitutional Debate Teams',
    type: 'CLASS_ACTIVITY',
    timeSpan: { termLabel: 'Fall 2024' },
    poolIds: [class3Pool.id],
    primaryPoolId: class3Pool.id,
    ownerStaffIds: [staffId]
  };

  const debatePrefs = generatePreferences(
    debateProgram.id,
    class3Students,
    debateGroups.map((g) => g.id),
    random
  );
  const debateAssigned = assignStudentsToGroups(class3Students, debateGroups, random);

  const debateScenario: Scenario = {
    id: generateScenarioId(),
    programId: debateProgram.id,
    status: 'ADOPTED',
    groups: debateAssigned,
    participantSnapshot: class3Students.map((s) => s.id),
    createdAt: new Date(schoolYearStart.getTime() + 60 * 24 * 60 * 60 * 1000),
    lastModifiedAt: new Date(schoolYearStart.getTime() + 60 * 24 * 60 * 60 * 1000),
    createdByStaffId: staffId
  };

  // Program: Geography Jigsaw Groups
  const geoGroups = generateGroups([
    { name: 'North America', capacity: 4 },
    { name: 'South America', capacity: 4 },
    { name: 'Europe', capacity: 4 },
    { name: 'Asia', capacity: 4 },
    { name: 'Africa', capacity: 4 },
    { name: 'Oceania', capacity: 2 }
  ]);

  const geoProgram: Program = {
    id: generateProgramId(),
    name: 'Geography Jigsaw',
    type: 'CLASS_ACTIVITY',
    timeSpan: { termLabel: 'Spring 2025' },
    poolIds: [class3Pool.id],
    primaryPoolId: class3Pool.id,
    ownerStaffIds: [staffId]
  };

  const geoPrefs = generatePreferences(
    geoProgram.id,
    class3Students,
    geoGroups.map((g) => g.id),
    random
  );
  const geoAssigned = assignStudentsToGroups(class3Students, geoGroups, random);

  const geoScenario: Scenario = {
    id: generateScenarioId(),
    programId: geoProgram.id,
    status: 'DRAFT',
    groups: geoAssigned,
    participantSnapshot: class3Students.map((s) => s.id),
    createdAt: now,
    lastModifiedAt: now,
    createdByStaffId: staffId
  };

  // ==========================================================================
  // AFTER SCHOOL: Clubs (cross-grade, 45 students)
  // ==========================================================================
  const clubStudents = [
    ...generateStudents(15, '5', random),
    ...generateStudents(15, '6', random),
    ...generateStudents(15, '7', random)
  ];

  const clubPool: Pool = {
    id: generatePoolId(),
    name: 'After School Clubs - All Grades',
    type: 'GRADE',
    memberIds: clubStudents.map((s) => s.id),
    status: 'ACTIVE',
    primaryStaffOwnerId: staffId,
    source: 'IMPORT'
  };

  const clubGroups = generateGroups([
    { name: 'Art Club', capacity: 12 },
    { name: 'Coding Club', capacity: 10 },
    { name: 'Drama Club', capacity: 15 },
    { name: 'Science Olympiad', capacity: 12 },
    { name: 'Book Club', capacity: 8 },
    { name: 'Sports Club', capacity: 15 }
  ]);

  const clubProgram: Program = {
    id: generateProgramId(),
    name: 'After School Clubs',
    type: 'CLUBS',
    timeSpan: { termLabel: 'Spring 2025' },
    poolIds: [clubPool.id],
    primaryPoolId: clubPool.id,
    ownerStaffIds: [staffId]
  };

  const clubPrefs = generatePreferences(
    clubProgram.id,
    clubStudents,
    clubGroups.map((g) => g.id),
    random
  );
  const clubAssigned = assignStudentsToGroups(clubStudents, clubGroups, random);

  const clubScenario: Scenario = {
    id: generateScenarioId(),
    programId: clubProgram.id,
    status: 'ADOPTED',
    groups: clubAssigned,
    participantSnapshot: clubStudents.map((s) => s.id),
    createdAt: new Date(springStart.getTime() + 7 * 24 * 60 * 60 * 1000),
    lastModifiedAt: new Date(springStart.getTime() + 7 * 24 * 60 * 60 * 1000),
    createdByStaffId: staffId
  };

  // ==========================================================================
  // SESSIONS (Historical records)
  // ==========================================================================
  const sessions: Session[] = [
    {
      id: generateSessionId(),
      programId: scienceLabProgram.id,
      name: 'Fall Lab Partners - Week 1',
      academicYear: '2024-2025',
      startDate: new Date(schoolYearStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(fallEnd),
      status: 'PUBLISHED',
      scenarioId: scienceLabScenario.id,
      publishedAt: new Date(schoolYearStart.getTime() + 8 * 24 * 60 * 60 * 1000),
      createdAt: new Date(schoolYearStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdByStaffId: staffId
    },
    {
      id: generateSessionId(),
      programId: readingProgram.id,
      name: 'Reading Groups - Fall Rotation 1',
      academicYear: '2024-2025',
      startDate: new Date(schoolYearStart.getTime() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(schoolYearStart.getTime() + 45 * 24 * 60 * 60 * 1000),
      status: 'PUBLISHED',
      scenarioId: readingScenario.id,
      publishedAt: new Date(schoolYearStart.getTime() + 15 * 24 * 60 * 60 * 1000),
      createdAt: new Date(schoolYearStart.getTime() + 14 * 24 * 60 * 60 * 1000),
      createdByStaffId: staffId
    },
    {
      id: generateSessionId(),
      programId: debateProgram.id,
      name: 'Constitutional Convention Unit',
      academicYear: '2024-2025',
      startDate: new Date(schoolYearStart.getTime() + 60 * 24 * 60 * 60 * 1000),
      endDate: new Date(schoolYearStart.getTime() + 75 * 24 * 60 * 60 * 1000),
      status: 'ARCHIVED',
      scenarioId: debateScenario.id,
      publishedAt: new Date(schoolYearStart.getTime() + 61 * 24 * 60 * 60 * 1000),
      createdAt: new Date(schoolYearStart.getTime() + 60 * 24 * 60 * 60 * 1000),
      createdByStaffId: staffId
    },
    {
      id: generateSessionId(),
      programId: clubProgram.id,
      name: 'Spring Club Assignments',
      academicYear: '2024-2025',
      startDate: springStart,
      endDate: springEnd,
      status: 'PUBLISHED',
      scenarioId: clubScenario.id,
      publishedAt: new Date(springStart.getTime() + 8 * 24 * 60 * 60 * 1000),
      createdAt: new Date(springStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdByStaffId: staffId
    }
  ];

  // ==========================================================================
  // PLACEMENTS (Assignment records for published/archived sessions)
  // ==========================================================================
  // Map sessions to their scenarios and preferences for placement generation
  const sessionScenarioPrefs: Array<{
    session: Session;
    scenario: Scenario;
    preferences: Preference[];
  }> = [
    { session: sessions[0], scenario: scienceLabScenario, preferences: scienceLabPrefs },
    { session: sessions[1], scenario: readingScenario, preferences: readingPrefs },
    { session: sessions[2], scenario: debateScenario, preferences: debatePrefs },
    { session: sessions[3], scenario: clubScenario, preferences: clubPrefs }
  ];

  const allPlacements: Placement[] = [];
  for (const { session, scenario, preferences } of sessionScenarioPrefs) {
    // Only generate placements for published or archived sessions
    if (session.status === 'PUBLISHED' || session.status === 'ARCHIVED') {
      const placements = generatePlacementsForSession(session, scenario, preferences);
      allPlacements.push(...placements);
    }
  }

  // ==========================================================================
  // GROUP TEMPLATES (Reusable configurations)
  // ==========================================================================
  const groupTemplates: GroupTemplate[] = [
    {
      id: generateTemplateId(),
      ownerStaffId: staffId,
      name: 'Lab Partners (13 stations)',
      description: 'Two students per lab station, works for classes up to 26',
      groups: Array.from({ length: 13 }, (_, i) => ({
        id: `template-grp-${i + 1}`,
        name: `Lab Station ${i + 1}`,
        capacity: 2
      })),
      createdAt: schoolYearStart,
      updatedAt: schoolYearStart
    },
    {
      id: generateTemplateId(),
      ownerStaffId: staffId,
      name: 'Small Groups (4-5 per group)',
      description: 'Flexible groups for discussions and projects',
      groups: [
        { id: 'template-sm-1', name: 'Group A', capacity: 5 },
        { id: 'template-sm-2', name: 'Group B', capacity: 5 },
        { id: 'template-sm-3', name: 'Group C', capacity: 5 },
        { id: 'template-sm-4', name: 'Group D', capacity: 5 },
        { id: 'template-sm-5', name: 'Group E', capacity: 5 },
        { id: 'template-sm-6', name: 'Group F', capacity: 5 }
      ],
      createdAt: schoolYearStart,
      updatedAt: schoolYearStart
    },
    {
      id: generateTemplateId(),
      ownerStaffId: staffId,
      name: 'Literature Circles',
      description: 'Four themed reading groups',
      groups: [
        { id: 'template-lit-1', name: 'Mystery Readers', capacity: 7 },
        { id: 'template-lit-2', name: 'Adventure Squad', capacity: 7 },
        { id: 'template-lit-3', name: 'Fantasy League', capacity: 7 },
        { id: 'template-lit-4', name: 'History Buffs', capacity: 7 }
      ],
      createdAt: schoolYearStart,
      updatedAt: schoolYearStart
    },
    {
      id: generateTemplateId(),
      ownerStaffId: staffId,
      name: 'Think-Pair-Share',
      description: 'Pairs for quick collaborative activities',
      groups: Array.from({ length: 15 }, (_, i) => ({
        id: `template-pair-${i + 1}`,
        name: `Pair ${i + 1}`,
        capacity: 2
      })),
      createdAt: schoolYearStart,
      updatedAt: schoolYearStart
    }
  ];

  // ==========================================================================
  // COMPILE ALL DATA
  // ==========================================================================
  const allStudents = [...class1Students, ...class2Students, ...class3Students, ...clubStudents];

  const allPools = [class1Pool, class2Pool, class3Pool, clubPool];

  const allPrograms = [
    scienceLabProgram,
    readingProgram,
    mathProgram,
    ecoProgram,
    class2LabProgram,
    debateProgram,
    geoProgram,
    clubProgram
  ];

  const allPreferences = [
    ...scienceLabPrefs,
    ...readingPrefs,
    ...mathPrefs,
    ...ecoPrefs,
    ...class2LabPrefs,
    ...debatePrefs,
    ...geoPrefs,
    ...clubPrefs
  ];

  const allScenarios = [
    scienceLabScenario,
    readingScenario,
    mathScenario,
    ecoScenario,
    class2LabScenario,
    debateScenario,
    geoScenario,
    clubScenario
  ];

  return {
    staff,
    students: allStudents,
    pools: allPools,
    programs: allPrograms,
    preferences: allPreferences,
    scenarios: allScenarios,
    sessions,
    placements: allPlacements,
    groupTemplates
  };
}

/**
 * Check if demo mode should be activated.
 * Looks for ?demo=true URL parameter.
 */
export function shouldActivateDemoMode(): boolean {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  return params.get('demo') === 'true';
}

/**
 * Check if demo data already exists in storage.
 */
export function isDemoDataLoaded(): boolean {
  if (typeof window === 'undefined') return false;

  return localStorage.getItem('groupwheel-demo-loaded') === 'true';
}

/**
 * Mark demo data as loaded.
 */
export function markDemoDataLoaded(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('groupwheel-demo-loaded', 'true');
}

/**
 * Clear demo data marker.
 */
export function clearDemoDataMarker(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('groupwheel-demo-loaded');
}
