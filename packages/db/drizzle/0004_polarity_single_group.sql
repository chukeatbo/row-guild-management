-- Polarity ไม่มี group: รวมทุก group ของ event ประเภท polarity_elite เป็นกลุ่มเดียว (ปาร์ตี้ 10 ใบ)
-- party_slot อ้าง party.id จึงไม่เสียข้อมูลที่จัดไว้
-- ขั้นที่ 1: ย้ายทุกปาร์ตี้ไป group แรก โดยเลื่อน position +1000 กันชน unique (group_id, position)
WITH ranked AS (
	SELECT p.id,
		(row_number() OVER (PARTITION BY p.event_id ORDER BY g.position, p.position) - 1) AS newpos,
		first_value(g.id) OVER (PARTITION BY p.event_id ORDER BY g.position) AS keeper
	FROM party p
	JOIN party_group g ON g.id = p.group_id
	JOIN guild_event e ON e.id = p.event_id
	WHERE e.type = 'polarity_elite'
)
UPDATE party p SET group_id = r.keeper, position = r.newpos + 1000
FROM ranked r WHERE p.id = r.id;--> statement-breakpoint
-- ขั้นที่ 2: คืน position เป็น 0..n-1 และตั้งชื่อ P1..Pn ต่อเนื่อง
UPDATE party p SET position = p.position - 1000, name = 'P' || (p.position - 1000 + 1)
FROM guild_event e
WHERE p.event_id = e.id AND e.type = 'polarity_elite' AND p.position >= 1000;--> statement-breakpoint
-- ขั้นที่ 3: ลบ group ที่ว่างแล้ว
DELETE FROM party_group g USING guild_event e
WHERE g.event_id = e.id AND e.type = 'polarity_elite'
	AND NOT EXISTS (SELECT 1 FROM party p WHERE p.group_id = g.id);--> statement-breakpoint
-- ขั้นที่ 4: เพดานปาร์ตี้ต่อ group ของ Polarity = 10
UPDATE guild_event SET config = jsonb_set(config, '{maxPartiesPerGroup}', '10'::jsonb)
WHERE type = 'polarity_elite';
