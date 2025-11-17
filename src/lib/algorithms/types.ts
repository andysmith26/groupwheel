import type { Group, Student } from '$lib/types';
import type { StudentPreference } from '$lib/types/preferences';

export interface AssignmentOptions {
        groups: Group[];
        studentOrder: string[];
        preferencesById: Record<string, StudentPreference>;
        studentsById: Record<string, Student>;
        swapBudget?: number;
}

export interface AssignmentResult {
        groups: Group[];
        unassignedStudentIds: string[];
}

export interface HappinessContext {
        preferencesById: Record<string, StudentPreference>;
        studentsById: Record<string, Student>;
}
