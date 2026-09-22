import fs from 'fs';
import path from 'path';
import {
	USER_RECORDS_STATUS,
	formatUserRecordsReadinessLabel,
	__resetUserRecordsForTests,
	__setUserRecordsUnavailableForTests,
} from '../../../utils/userRecordsStore';

describe('StorageHealthModal user-records readiness', ()=>{
	afterEach(()=>{
		__resetUserRecordsForTests();
	});

	it('source keeps a dedicated 命盘/事盘 IndexedDB line', ()=>{
		const src = fs.readFileSync(path.resolve(__dirname, '../StorageHealthModal.js'), 'utf8');
		expect(src).toContain("label='命盘/事盘 IndexedDB'");
		expect(src).toContain('formatUserRecordsReadinessLabel');
	});

	it('readiness helper distinguishes 主存 and 兼容回退 states', ()=>{
		__resetUserRecordsForTests();
		expect(formatUserRecordsReadinessLabel()).toBe('未初始化');
		__setUserRecordsUnavailableForTests();
		expect(formatUserRecordsReadinessLabel()).toBe('不可用，使用兼容回退');
		expect(USER_RECORDS_STATUS.ready).toBe('ready');
		expect(USER_RECORDS_STATUS.schemaIncompatible).toBe('schema-incompatible');
	});
});
