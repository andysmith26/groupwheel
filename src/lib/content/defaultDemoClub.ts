export interface DemoClubMember {
  firstName: string;
  lastName: string;
}

export const DEFAULT_DEMO_CLUB = {
  id: 'sample-club',
  name: 'Sample Club',
  groupSize: 4,
  members: [
    { firstName: 'Ava', lastName: 'Park' },
    { firstName: 'Ben', lastName: 'Ward' },
    { firstName: 'Cora', lastName: 'Lane' },
    { firstName: 'Dean', lastName: 'Shaw' },
    { firstName: 'Elle', lastName: 'Reed' },
    { firstName: 'Finn', lastName: 'Cole' },
    { firstName: 'Gia', lastName: 'Bell' },
    { firstName: 'Hank', lastName: 'Love' },
    { firstName: 'Ivy', lastName: 'Moss' },
    { firstName: 'Jake', lastName: 'Wolf' },
    { firstName: 'Kira', lastName: 'Pike' },
    { firstName: 'Liam', lastName: 'Kane' },
    { firstName: 'Mila', lastName: 'Rook' },
    { firstName: 'Noah', lastName: 'Tate' },
    { firstName: 'Omar', lastName: 'Lane' },
    { firstName: 'Pia', lastName: 'Duke' }
  ] satisfies DemoClubMember[]
} as const;
