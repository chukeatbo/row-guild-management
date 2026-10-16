<script lang="ts">
	// แสดงอาชีพด้วยสีเท่านั้น (ยังไม่แสดง icon ตามที่ผู้ใช้สั่ง)
	let { name, color }: { name: string; color?: string | null } = $props();

	// เลือกสีตัวอักษรให้อ่านง่ายบนพื้นสีอาชีพ
	const textColor = $derived.by(() => {
		const hex = (color ?? '#888888').replace('#', '');
		const n = parseInt(hex.length === 3 ? hex.replace(/./g, '$&$&') : hex, 16);
		const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
		return lum > 0.6 ? '#1b1b1b' : '#ffffff';
	});
</script>

<span
	class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap"
	style:background-color={color ?? 'var(--muted)'}
	style:color={color ? textColor : 'var(--muted-foreground)'}
>
	{name}
</span>
