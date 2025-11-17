import { json } from '@sveltejs/kit';
import { google } from 'googleapis';
import { env } from '$env/dynamic/private';
import { parseSheetRows } from '$lib/data/roster';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const clientEmail = env.GOOGLE_SA_EMAIL;
		const privateKey = env.GOOGLE_SA_KEY;
		const sheetId = env.SHEET_ID;

		if (!clientEmail || !privateKey || !sheetId) {
			console.error('Missing Google Sheets configuration env vars');
			return json(
				{
					error:
						'Server is not configured to access Google Sheets. Please set GOOGLE_SA_EMAIL, GOOGLE_SA_KEY and SHEET_ID.'
				},
				{ status: 500 }
			);
		}

		// Authenticate
		const auth = new google.auth.GoogleAuth({
			credentials: {
				client_email: clientEmail,
				private_key: privateKey.replace(/\\n/g, '\n')
			},
			scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
		});

		const sheets = google.sheets({ version: 'v4', auth });

		// Fetch both tabs in parallel
		const [studentsResponse, connectionsResponse] = await Promise.all([
			sheets.spreadsheets.values.get({
				spreadsheetId: sheetId,
				range: 'Students!A:D' // ID, FirstName, LastName, Gender
			}),
			sheets.spreadsheets.values.get({
				spreadsheetId: sheetId,
				range: 'Connections!A:Z' // display name, id, friend ids...
			})
		]);

                const { students, connections } = parseSheetRows(
                        studentsResponse.data.values,
                        connectionsResponse.data.values
                );

                if (students.length === 0) {
                        return json({ error: 'No student data found' }, { status: 404 });
                }

		return json({
			success: true,
			students,
			connections,
			studentCount: students.length,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Google Sheets API Error:', error);
		return json(
			{
				error: 'Failed to fetch data from Google Sheets',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
