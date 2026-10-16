# Permission Matrix

Role ใน Guild (Better Auth organization plugin): `owner` = Guild Master, `officer`, `leader` = Party Leader, `member`
Super Admin มาจาก admin plugin (ระดับระบบ, `user.role = 'admin'`) ผ่านทุกการเช็ค
โค้ดอยู่ที่ [packages/auth/src/permissions.ts](../packages/auth/src/permissions.ts) — ตารางนี้ต้องตรงกับไฟล์นั้น

| ความสามารถ | Permission | Super Admin | Guild Master | Officer | Party Leader | Member |
|---|---|:-:|:-:|:-:|:-:|:-:|
| จัดการ Master data (บอส, อาชีพ, ไอเทม) | admin plugin | ✅ | | | | |
| สร้าง/ระงับกิลด์ | admin plugin | ✅ | | | | |
| แก้ไขรายละเอียดกิลด์ | `guild:update` | ✅ | ✅ | | | |
| ตั้งค่า Discord channel / scheduler | `guild:configure_discord` | ✅ | ✅ | | | |
| เชิญ/เตะสมาชิก, เปลี่ยน role | `member:*`, `invitation:*` | ✅ | ✅ | ✅ (ไม่แตะ owner) | | |
| แก้ข้อมูลตัวละครคนอื่น | `character:update_any` | ✅ | ✅ | ✅ | | |
| เพิ่ม/แก้ตัวละครตัวเอง | `character:create_own`, `update_own` | ✅ | ✅ | ✅ | ✅ | ✅ |
| ดูรายชื่อ + กราฟอาชีพ | (สมาชิกกิลด์ทุกคน) | ✅ | ✅ | ✅ | ✅ | ✅ |
| สร้าง/แก้/ลบ Event (GL/Siege/Polarity) | `event:*` | ✅ | ✅ | ✅ | | |
| จัดปาร์ตี้ (ลาก-วาง) | `party:assign` | ✅ | ✅ | ✅ | ✅ (เฉพาะปาร์ตี้ตัวเอง) | |
| Lock/Unlock ปาร์ตี้ | `party:lock` | ✅ | ✅ | ✅ | | |
| Send to Discord (รูปปาร์ตี้) | `party:send_discord` | ✅ | ✅ | ✅ | ✅ | |
| ลา (ตัวเอง) | `leave:create_own` | ✅ | ✅ | ✅ | ✅ | ✅ |
| ลาแทนคนอื่น | `leave:create_any` | ✅ | ✅ | ✅ | | |
| ลบการลาของคนอื่น | `leave:delete_any` | ✅ | ✅ | ✅ | | |
| จองบอสดันกิลด์ | `bossBooking:create` | ✅ | ✅ | ✅ | ✅ | ✅ |
| ยกเลิกจองของคนอื่น | `bossBooking:cancel_any` | ✅ | ✅ | ✅ | | |
| ลงคิวประมูล | `auction:enter` | ✅ | ✅ | ✅ | ✅ | ✅ |
| ปิดประมูล / บันทึกผู้ชนะ | `auction:close` | ✅ | ✅ | ✅ | | |
| ดู Audit Log | `auditLog:read` | ✅ | ✅ | ✅ | | |

## กฎที่ role อย่างเดียวบังคับไม่ได้ (ต้องเช็คใน server code)

- Party Leader แก้ได้เฉพาะปาร์ตี้ที่ `party.leaderCharacterId` เป็นตัวละครของตัวเอง
- สมาชิกแก้/ลา/จองได้เฉพาะตัวละครที่ `character.userId` = ตัวเอง
- Officer เปลี่ยน role ของ owner ไม่ได้ (และไม่ตั้งใครเป็น owner)
- ปาร์ตี้ที่ `locked = true` แก้ไม่ได้ ยกเว้นผู้มีสิทธิ์ `party:lock`
- ลาหลัง `guild_event.leaveDeadline` ไม่ได้ (ยกเว้น Officer ขึ้นไป)
- ทุก mutation ข้างบน (จัดปาร์ตี้, ประมูล, เปลี่ยน role, lock) ต้องเขียน `audit_log`
- ต้องเช็คด้วยว่า resource เป็นของ `organizationId` ที่ session กำลังใช้อยู่ (กันข้ามกิลด์)
