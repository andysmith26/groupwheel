/**
 * IndexedDB-backed StudentRepository.
 *
 * @module infrastructure/repositories/indexedDb/IndexedDbStudentRepository
 */

import type { Student } from '$lib/domain';
import type { StudentRepository, StudentSearchQuery } from '$lib/application/ports/StudentRepository';
import { openDb } from './db';

const STORE_NAME = 'students';

export class IndexedDbStudentRepository implements StudentRepository {
	async getById(id: string): Promise<Student | null> {
		if (typeof indexedDB === 'undefined') return null;
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(id);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || null);
		});
	}

	async getByIds(ids: string[]): Promise<Student[]> {
		if (typeof indexedDB === 'undefined') return [];
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const students: Student[] = [];
			let completed = 0;

			if (ids.length === 0) {
				resolve([]);
				return;
			}

			ids.forEach((id) => {
				const request = store.get(id);
				request.onsuccess = () => {
					if (request.result) {
						students.push(request.result);
					}
					completed++;
					if (completed === ids.length) {
						resolve(students);
					}
				};
				request.onerror = () => {
					completed++;
					if (completed === ids.length) {
						resolve(students);
					}
				};
			});
		});
	}

	async saveMany(students: Student[]): Promise<void> {
		if (typeof indexedDB === 'undefined') return;
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);

			let completed = 0;
			if (students.length === 0) {
				resolve();
				return;
			}

			students.forEach((student) => {
				const request = store.put(student);
				request.onsuccess = () => {
					completed++;
					if (completed === students.length) resolve();
				};
				request.onerror = () => reject(request.error);
			});
		});
	}

	async listByCanonicalId(canonicalId: string): Promise<Student[]> {
		if (typeof indexedDB === 'undefined') return [];
		const allStudents = await this.listAll();
		return allStudents.filter((student) => {
			// A student's effective canonical ID is canonicalId if set, otherwise its own id
			const effectiveCanonicalId = student.canonicalId ?? student.id;
			return effectiveCanonicalId === canonicalId;
		});
	}

	async searchByName(query: StudentSearchQuery): Promise<Student[]> {
		if (typeof indexedDB === 'undefined') return [];
		const allStudents = await this.listAll();
		const firstNameLower = query.firstName?.toLowerCase();
		const lastNameLower = query.lastName?.toLowerCase();

		return allStudents.filter((student) => {
			let matches = true;

			if (firstNameLower) {
				matches = matches && student.firstName.toLowerCase().includes(firstNameLower);
			}

			if (lastNameLower && student.lastName) {
				matches = matches && student.lastName.toLowerCase().includes(lastNameLower);
			} else if (lastNameLower && !student.lastName) {
				matches = false;
			}

			return matches;
		});
	}

	async listAll(): Promise<Student[]> {
		if (typeof indexedDB === 'undefined') return [];
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.getAll();
			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || []);
		});
	}
}
