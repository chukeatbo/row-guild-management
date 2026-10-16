<script lang="ts">
	import { Crown, GripVertical, HeartPulse, Lock, Shield, Sparkles, Swords } from '@lucide/svelte';
	import type { Content } from '#lib/landing/content.ts';

	/** ภาพจำลองหน้า Party Builder (HTML ล้วน ไม่ใช่รูป) — สี role ตรงกับเว็บหลัก lib/roles.ts */
	let { c }: { c: Content['mock'] } = $props();

	const ROLE = {
		tank: { color: '#e05d5d', icon: Shield },
		dps: { color: '#e8912e', icon: Swords },
		healer: { color: '#2fb872', icon: HeartPulse },
		support: { color: '#4f8bf0', icon: Sparkles }
	} as const;
	type Role = keyof typeof ROLE;
	type Member = { ign: string; cls: string; color: string; role: Role; leader?: boolean };

	const parties: { members: Member[]; locked?: boolean }[] = [
		{
			members: [
				{ ign: 'IronKnight', cls: 'Lord Knight', color: '#e06666', role: 'tank', leader: true },
				{ ign: 'HolyRose', cls: 'High Priest', color: '#00c853', role: 'healer' },
				{ ign: 'StormMage', cls: 'High Wizard', color: '#4a86e8', role: 'dps' },
				{ ign: 'ShadowFox', cls: 'Assassin Cross', color: '#674ea7', role: 'dps' },
				{ ign: 'น้องแมว12', cls: 'Bard', color: '#e0b400', role: 'support' }
			]
		},
		{
			locked: true,
			members: [
				{ ign: 'SilverPanda', cls: 'Paladin', color: '#cc0000', role: 'tank', leader: true },
				{ ign: 'MoonHeal', cls: 'High Priest', color: '#00c853', role: 'healer' },
				{ ign: 'WildHawk', cls: 'Sniper', color: '#d4a20f', role: 'dps' },
				{ ign: 'FrostDruid', cls: 'Druid', color: '#00bcd4', role: 'dps' }
			]
		}
	];
	const pool: Member[] = [
		{ ign: 'หมูกรอบ7', cls: 'Champion', color: '#6aa84f', role: 'dps' },
		{ ign: 'StarBunny', cls: 'Alchemist', color: '#f6b26b', role: 'support' },
		{ ign: 'NightNinja', cls: 'Night Walker', color: '#b45f06', role: 'dps' }
	];
	const roles = Object.keys(ROLE) as Role[];
</script>

{#snippet chip(m: Member, dragging = false, compact = false)}
	{@const R = ROLE[m.role]}
	<div
		class="flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5 text-xs {dragging
			? 'rotate-[-2deg] border-primary shadow-pop ring-2 ring-primary/30'
			: 'border-border'}"
	>
		<span class="grid size-5 shrink-0 place-items-center rounded-md" style="background:{R.color}22;color:{R.color}">
			<R.icon size={12} />
		</span>
		<span class="min-w-0 flex-1 truncate font-medium">{m.ign}</span>
		{#if m.leader}<Crown size={12} class="shrink-0 text-warning" aria-label={c.leader} />{/if}
		{#if !compact}<span class="hidden shrink-0 rounded px-1.5 py-px text-[0.625rem] font-medium sm:inline" style="background:{m.color}26;color:{m.color}">{m.cls}</span>{/if}
	</div>
{/snippet}

<div class="lp-card overflow-hidden p-0 shadow-pop" aria-hidden="true">
	<!-- แถบหน้าต่าง -->
	<div class="flex items-center gap-1.5 border-b border-border bg-muted/60 px-4 py-2.5">
		<span class="size-2.5 rounded-full bg-danger/70"></span>
		<span class="size-2.5 rounded-full bg-warning/70"></span>
		<span class="size-2.5 rounded-full bg-success/70"></span>
		<span class="ml-3 truncate text-xs font-medium text-muted-foreground">{c.title}</span>
	</div>

	<div class="grid gap-3 p-4 sm:grid-cols-[1fr_9.5rem]">
		<div class="space-y-3">
			<p class="text-xs font-semibold text-muted-foreground">{c.group}</p>
			{#each parties as p, i (i)}
				{@const count = (r: Role) => p.members.filter((m) => m.role === r).length}
				<div class="rounded-xl border border-border bg-background/60 p-2.5">
					<div class="mb-2 flex items-center gap-2 text-xs">
						<span class="font-semibold">{c.party} {i + 1}</span>
						<span class="text-muted-foreground">{p.members.length}/5</span>
						{#if p.locked}<Lock size={11} class="text-muted-foreground" />{/if}
						<span class="ml-auto flex gap-1.5">
							{#each roles as r (r)}
								{@const R = ROLE[r]}
								<span class="flex items-center gap-0.5 {count(r) ? '' : 'opacity-30'}" style="color:{R.color}">
									<R.icon size={11} />{count(r)}
								</span>
							{/each}
						</span>
					</div>
					<div class="space-y-1.5">
						{#each p.members as m (m.ign)}{@render chip(m)}{/each}
						{#if p.members.length < 5}
							<div class="rounded-lg border border-dashed border-primary/50 bg-primary/5 py-2"></div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<div class="hidden space-y-1.5 sm:block">
			<p class="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground"><GripVertical size={12} />{c.unassigned}</p>
			{@render chip(pool[0], true, true)}
			{#each pool.slice(1) as m (m.ign)}{@render chip(m, false, true)}{/each}
			<div class="flex items-center gap-2 rounded-lg border border-border bg-warning/10 px-2 py-1.5 text-xs opacity-70">
				<span class="min-w-0 flex-1 truncate font-medium line-through">LazyCat</span>
				<span class="rounded bg-warning/20 px-1.5 text-[0.625rem] font-medium text-warning">{c.onLeave}</span>
			</div>
		</div>
	</div>
</div>
