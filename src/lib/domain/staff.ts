export type StaffRole = 'TEACHER' | 'ADMIN' | 'COUNSELOR' | 'STAFF' | 'CLUB_LEADER' | 'OTHER';

export interface Staff {
	id: string;
	name: string;
	roles: StaffRole[];
}
