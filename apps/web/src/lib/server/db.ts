import { createDb, type Db } from '@row/db';

// เก็บไว้ที่ globalThis กัน pool งอกเมื่อ HMR ตอน dev
const g = globalThis as unknown as { __rowDb?: Db };
export const db: Db = (g.__rowDb ??= createDb());
