import { auditLog } from '@row/db';
import { db } from './db.ts';

/** ทุก mutation สำคัญต้องเรียกฟังก์ชันนี้ (CLAUDE.md ข้อ 9) */
export async function writeAudit(entry: {
	organizationId: string | null;
	actorUserId: string;
	action: string;
	targetType?: string;
	targetId?: string;
	detail?: unknown;
}) {
	await db.insert(auditLog).values(entry);
}
