/**
 * MVP Preference model — matches docs/domain_model.md.
 * payload is intentionally opaque; analytics code will interpret it.
 */
export interface Preference {
	id: string;
	programId: string;
	studentId: string;
	payload: unknown;
}