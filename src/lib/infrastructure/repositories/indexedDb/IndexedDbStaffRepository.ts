/**
 * IndexedDB-backed StaffRepository.
 *
 * @module infrastructure/repositories/indexedDb/IndexedDbStaffRepository
 */

import type { Staff } from '$lib/domain';
import type { StaffRepository } from '$lib/application/ports/StaffRepository';
import { openDb } from './db';

const STORE_NAME = 'staff';

export class IndexedDbStaffRepository implements StaffRepository {
	async getById(id: string): Promise<Staff | null> {
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

	async getByIds(ids: string[]): Promise<Staff[]> {
		if (typeof indexedDB === 'undefined') return [];
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const staff: Staff[] = [];
			let completed = 0;

			if (ids.length === 0) {
				resolve([]);
				return;
			}

			ids.forEach((id) => {
				const request = store.get(id);
				request.onsuccess = () => {
					if (request.result) {
						staff.push(request.result);
					}
					completed++;
					if (completed === ids.length) {
						resolve(staff);
					}
				};
				request.onerror = () => {
					completed++;
					if (completed === ids.length) {
						resolve(staff);
					}
				};
			});
		});
	}
}
