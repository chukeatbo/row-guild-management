<script lang="ts">
	// กราฟแท่งแนวนอนแบบเบา (ไม่พึ่ง lib) ใช้กับสรุปอาชีพ/หน้าที่
	let {
		items
	}: { items: { label: string; value: number; color?: string | null }[] } = $props();

	const max = $derived(Math.max(1, ...items.map((i) => i.value)));
</script>

<ul class="space-y-2.5">
	{#each items as item (item.label)}
		<li class="grid grid-cols-[minmax(0,7.5rem)_1fr_2rem] items-center gap-3 text-sm">
			<span class="truncate text-muted-foreground">{item.label}</span>
			<span class="h-2.5 overflow-hidden rounded-full bg-muted">
				<span
					class="block h-full rounded-full transition-[width] duration-500 ease-out"
					style:width="{(item.value / max) * 100}%"
					style:background-color={item.color ?? 'var(--primary)'}
				></span>
			</span>
			<span class="text-right font-medium tabular-nums">{item.value}</span>
		</li>
	{/each}
</ul>
