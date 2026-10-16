<script lang="ts">
	import { useT } from '#lib/i18n/index.ts';
	import { ROLE_COLORS, ROLE_ICONS, type Role } from '#lib/roles.ts';

	/** box: กล่องสีอ่อนหลังไอคอน (ใช้ในชิปตัวละคร); box=false: ไอคอนเปล่าใช้ในแถวสรุป */
	let {
		role,
		size = 14,
		box = true,
		class: cls = ''
	}: { role: Role; size?: number; box?: boolean; class?: string } = $props();

	const t = useT();
	const Icon = $derived(ROLE_ICONS[role]);
</script>

<span
	data-role={role}
	title={t(`role.${role}`)}
	class="inline-grid shrink-0 place-items-center rounded-md {box ? 'size-6' : ''} {cls}"
	style:color={ROLE_COLORS[role]}
	style:background-color={box ? `color-mix(in srgb, ${ROLE_COLORS[role]} 18%, transparent)` : undefined}
>
	<Icon {size} strokeWidth={2.4} />
</span>
