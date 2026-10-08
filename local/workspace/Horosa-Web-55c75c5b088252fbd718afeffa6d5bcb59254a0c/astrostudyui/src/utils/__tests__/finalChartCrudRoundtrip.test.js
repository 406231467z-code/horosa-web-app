import {
	upsertLocalChart,
	listLocalCharts,
	removeLocalChart,
	listLocalChartsTrash,
} from '../localcharts';
import {
	flushUserRecordsWrites,
	hydrateUserRecordsPrimary,
	listUserRecordEnvelopes,
	USER_RECORDS_STORES,
	__installUserRecordsMemoryBackendForTests,
	__resetUserRecordsForTests,
} from '../userRecordsStore';

const CID = 'final-crud-1990';

describe('final chart save load edit delete roundtrip', () => {
	beforeEach(() => {
		window.localStorage.clear();
		__resetUserRecordsForTests();
		__installUserRecordsMemoryBackendForTests();
	});

	afterEach(() => {
		__resetUserRecordsForTests();
		window.localStorage.clear();
	});

	test('create, reload hydrate, edit, delete, reload absent', async () => {
		const created = upsertLocalChart({
			cid: CID,
			name: 'Final CRUD Alpha',
			birth: '1990-06-15 10:30:00',
			zone: '+08:00',
			lat: '26n04',
			lon: '119e19',
			gpsLat: 26.076417371316914,
			gpsLon: 119.31516153077507,
			gender: 1,
			memoAstro: 'memo-v1',
			preserveUpdateTime: true,
			updateTime: '2026-09-24 10:00:00',
		});
		await flushUserRecordsWrites();

		expect(created.cid).toBe(CID);
		expect(created.name).toBe('Final CRUD Alpha');
		expect(created.memoAstro).toBe('memo-v1');

		window.localStorage.removeItem('horosa.localCharts.v1');
		expect(listLocalCharts()).toEqual([]);

		await hydrateUserRecordsPrimary();
		await flushUserRecordsWrites();

		const afterReload = listLocalCharts().find((row) => row.cid === CID);
		expect(afterReload).toBeTruthy();
		expect(afterReload.name).toBe('Final CRUD Alpha');
		expect(afterReload.birth).toBe('1990-06-15 10:30:00');
		expect(afterReload.memoAstro).toBe('memo-v1');

		const idbRows = await listUserRecordEnvelopes(USER_RECORDS_STORES.charts);
		expect(idbRows.some((row) => row.cid === CID && row.record.name === 'Final CRUD Alpha')).toBe(true);

		upsertLocalChart({
			cid: CID,
			name: 'Final CRUD Beta',
			memoAstro: 'memo-v2',
			preserveUpdateTime: true,
			updateTime: '2026-09-24 11:00:00',
		});
		await flushUserRecordsWrites();

		const edited = listLocalCharts().find((row) => row.cid === CID);
		expect(edited.name).toBe('Final CRUD Beta');
		expect(edited.memoAstro).toBe('memo-v2');
		expect(edited.birth).toBe('1990-06-15 10:30:00');

		removeLocalChart(CID);
		await flushUserRecordsWrites();

		expect(listLocalCharts().find((row) => row.cid === CID)).toBeFalsy();
		expect(listLocalChartsTrash().some((row) => row.cid === CID)).toBe(true);

		window.localStorage.removeItem('horosa.localCharts.v1');
		await hydrateUserRecordsPrimary();
		expect(listLocalCharts().find((row) => row.cid === CID)).toBeFalsy();
	});
});
