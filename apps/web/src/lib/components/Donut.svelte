<script lang="ts">
	// โดนัทแบบ SVG ล้วน ใช้กับสัดส่วนหน้าที่ (Tank/DPS/Healer/Support)
	let {
		slices,
		total
	}: { slices: { label: string; value: number; color: string }[]; total: number } = $props();

	const R = 15.9155; // เส้นรอบวง = 100
	const arcs = $derived.by(() => {
		let offset = 0;
		const sum = slices.reduce((s, x) => s + x.value, 0) || 1;
		return slices
			.filter((s) => s.value > 0)
			.map((s) => {
				const len = (s.value / sum) * 100;
				const arc = { ...s, dash: `${len} ${100 - len}`, offset: -offset };
				offset += len;
				return arc;
			});
	});
</script>

<div class="flex flex-wrap items-center gap-6">
	<svg viewBox="0 0 42 42" class="size-32 shrink-0 -rotate-90" role="img" aria-label="role mix">
		<circle cx="21" cy="21" r={R} fill="none" stroke="var(--muted)" stroke-width="5" />
		{#each arcs as a (a.label)}
			<circle
				cx="21"
				cy="21"
				r={R}
				fill="none"
				stroke={a.color}
				stroke-width="5"
				stroke-dasharray={a.dash}
				stroke-dashoffset={a.offset}
				class="transition-all duration-500"
			/>
		{/each}
		<text
			x="21"
			y="21"
			text-anchor="middle"
			dominant-baseline="central"
			class="rotate-90 origin-center fill-foreground text-[8px] font-semibold"
		>
			{total}
		</text>
	</svg>
	<ul class="space-y-1.5 text-sm">
		{#each slices as s (s.label)}
			<li class="flex items-center gap-2">
				<span class="size-2.5 rounded-full" style:background-color={s.color}></span>
				<span class="text-muted-foreground">{s.label}</span>
				<span class="ml-auto pl-4 font-medium tabular-nums">{s.value}</span>
			</li>
		{/each}
	</ul>
</div>
