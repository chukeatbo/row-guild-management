<script lang="ts">
	import { Crown } from '@lucide/svelte';
	import ClassBadge from '#lib/components/ClassBadge.svelte';
	import RoleIcon from '#lib/components/RoleIcon.svelte';
	import { eventLabel, formatDateTime, GUILD_ZONE } from '#lib/datetime.ts';
	import { useLocale, useT, type MessageKey } from '#lib/i18n/index.ts';
	import { ROLE_ORDER } from '#lib/roles.ts';

	let { data } = $props();
	const t = useT();
	const locale = useLocale();

	const flat = $derived(data.event.type === 'polarity_elite');
	const label = $derived(eventLabel(data.event, (ty) => t(`events.type.${ty}` as MessageKey)));
	const all = $derived(data.groups.flatMap((g) => g.parties.flatMap((p) => p.members)));
	const totals = $derived(ROLE_ORDER.map((r) => ({ r, n: all.filter((m) => m.role === r).length })));
	const comp = (members: { role: string | null }[]) => ROLE_ORDER.map((r) => ({ r, n: members.filter((m) => m.role === r).length }));
	// รูปส่งลง Discord ใช้เวลากิลด์ (Bangkok) เสมอ ไม่ขึ้นกับเครื่องที่แคป
	const when = $derived(data.event.startsAt ? formatDateTime(data.event.startsAt, locale(), GUILD_ZONE.tz) : '');
</script>

<svelte:head>
	<title>{label}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main id="render-root" class="mx-auto w-[1500px] bg-background p-8 text-foreground">
	<header class="flex items-end justify-between gap-6 border-b border-border pb-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{label}{#if data.field} · {t(`builder.field.${data.field}` as MessageKey)}{/if}</h1>
			{#if when}<p class="mt-1 text-lg text-muted-foreground">{when}</p>{/if}
		</div>
		<div class="flex flex-wrap items-center justify-end gap-2 text-base">
			<span class="rounded-md bg-muted px-3 py-1 font-medium">{t('events.assigned', { n: all.length })}</span>
			{#each totals as x (x.r)}
				<span class="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-medium">
					<RoleIcon role={x.r} size={16} box={false} />{x.n}
				</span>
			{/each}
			{#if data.onLeave.length}<span class="rounded-md bg-warning/15 px-3 py-1 font-medium text-warning">{t('leave.onLeave')} {data.onLeave.length}</span>{/if}
		</div>
	</header>

	<div class="mt-5 space-y-6">
		{#each data.groups as g (g.id)}
			<section>
				{#if !flat}
					<h2 class="mb-2 flex items-center gap-2 text-lg font-semibold">
						<span>{g.name}</span>
						{#if g.field === 'main' || g.field === 'sub'}<span class="rounded-md bg-accent px-2 py-0.5 text-sm text-accent-foreground">{t(`builder.field.${g.field}` as MessageKey)}</span>{/if}
						{#if g.lane === 'top' || g.lane === 'mid' || g.lane === 'bottom'}<span class="rounded-md bg-muted px-2 py-0.5 text-sm text-muted-foreground">{t(`builder.lane.${g.lane}` as MessageKey)}</span>{/if}
					</h2>
				{/if}
				<div class="grid grid-cols-4 gap-3">
					{#each g.parties as p (p.id)}
						<div class="card space-y-1.5 p-3" data-party={p.name}>
							<div class="flex items-center justify-between">
								<span class="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">{p.name}</span>
								<span class="flex items-center gap-1.5">
									{#each comp(p.members) as x (x.r)}
										<span class="inline-flex items-center gap-0.5 text-xs font-medium {x.n ? '' : 'opacity-25'}"><RoleIcon role={x.r} size={13} box={false} />{x.n}</span>
									{/each}
								</span>
							</div>
							{#each p.members as m (m.id)}
								<div class="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1 text-sm" style:border-left="3px solid {m.classColor ?? 'var(--border)'}">
									{#if m.role}<RoleIcon role={m.role} size={14} />{/if}
									{#if p.leaderCharacterId === m.id}<Crown size={13} class="shrink-0 text-warning" />{/if}
									<span class="min-w-0 flex-1 truncate font-medium">{m.ign}</span>
									{#if m.className}<ClassBadge name={m.className} color={m.classColor} />{/if}
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</main>
