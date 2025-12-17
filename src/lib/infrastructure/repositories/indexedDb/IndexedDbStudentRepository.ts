/**
 * IndexedDB-backed StudentRepository.
 *
 * @module infrastructure/repositories/indexedDb/IndexedDbStudentRepository
 */

import type { Student } from '$lib/domain';
import type { StudentRepository } from '$lib/application/ports/StudentRepository';
import { browser } from '$app/environment';
import { openDb } from './db';

const STORE_NAME = 'students';

export class IndexedDbStudentRepository implements StudentRepository {
	async getById(id: string): Promise<Student | null> {
		if (!browser) return null;
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
		if (!browser) return [];
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
		if (!browser) return;
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
}
