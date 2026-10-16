import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/organization/access';

/**
 * Resource -> action ตาม docs/permissions.md
 * Super Admin ไม่อยู่ที่นี่: มาจาก admin plugin (user.role === 'admin') เช็คด้วย isSuperAdmin()
 * "own" actions (ลา/จอง/ลงประมูล/แก้ตัวละครตัวเอง) ทุก role ทำได้ แต่ต้องเช็คเจ้าของใน server code
 */
export const statements = {
  ...defaultStatements, // organization, member, invitation, team, ac
  guild: ['update', 'configure_discord'],
  character: ['create_own', 'update_own', 'update_any'],
  event: ['create', 'update', 'delete'],
  party: ['assign', 'lock', 'send_discord'], // assign ของ leader จำกัดเฉพาะปาร์ตี้ตัวเอง (เช็ค leaderCharacterId)
  leave: ['create_own', 'create_any', 'delete_any'],
  bossBooking: ['create', 'cancel_any'],
  auction: ['enter', 'close'],
  auditLog: ['read']
} as const;

export const ac = createAccessControl(statements);

const own = {
  character: ['create_own', 'update_own'],
  leave: ['create_own'],
  bossBooking: ['create'],
  auction: ['enter']
} as const;

export const member = ac.newRole({ ...own });

export const leader = ac.newRole({
  ...own,
  party: ['assign', 'send_discord']
});

export const officer = ac.newRole({
  ...own,
  member: ['create', 'update', 'delete'], // ห้ามเปลี่ยน role ของ owner -> เช็คใน server
  invitation: ['create', 'cancel'],
  character: ['create_own', 'update_own', 'update_any'],
  event: ['create', 'update', 'delete'],
  party: ['assign', 'lock', 'send_discord'],
  leave: ['create_own', 'create_any', 'delete_any'],
  bossBooking: ['create', 'cancel_any'],
  auction: ['enter', 'close'],
  auditLog: ['read']
});

export const owner = ac.newRole({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  guild: ['update', 'configure_discord'],
  character: ['create_own', 'update_own', 'update_any'],
  event: ['create', 'update', 'delete'],
  party: ['assign', 'lock', 'send_discord'],
  leave: ['create_own', 'create_any', 'delete_any'],
  bossBooking: ['create', 'cancel_any'],
  auction: ['enter', 'close'],
  auditLog: ['read']
});

export const roles = { owner, officer, leader, member };

/** Super Admin ผ่านทุกการเช็คระดับกิลด์ (ระดับระบบจาก admin plugin) */
export const isSuperAdmin = (user: { role?: string | null } | null | undefined) =>
  !!user?.role?.split(',').includes('admin');

/** เช็คสิทธิ์ตาม role ใน guild (ไม่รวมกฎ "own"/leader/lock ที่ต้องเช็คใน server code) */
export function can(
	role: string | null | undefined,
	resource: keyof typeof statements,
	action: string
): boolean {
	if (!role || !(role in roles)) return false;
	return roles[role as keyof typeof roles].authorize({ [resource]: [action] } as never).success;
}
