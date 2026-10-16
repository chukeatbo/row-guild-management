<script lang="ts">
	import { CalendarDays, CalendarX, Users } from '@lucide/svelte';
	import { eventLabel, formatDateTime } from '#lib/datetime.ts';
	import { useTimezone } from '#lib/timezone.ts';
	import { useLocale, useT, type MessageKey } from '#lib/i18n/index.ts';

	let { data } = $props();
	const t = useT();
	const locale = useLocale();
	const tz = useTimezone();
	const typeName = (ty: string) => t(`events.type.${ty}` as MessageKey);

	const STATUS_STYLE: Record<string, string> = {
		draft: 'bg-muted text-muted-foreground',
		open: 'bg-success/15 text-success',
		closed: 'bg-warning/15 text-warning',
		done: 'bg-muted text-muted-foreground'
	};
	const TYPE_STYLE: Record<string, string> = {
		guild_league: 'bg-accent text-accent-foreground',
		siege_war: 'bg-danger/10 text-danger',
		polarity_elite: 'bg-warning/15 text-warning'
	};
</script>

<svelte:head><title>{t('events.title')} · {t('app.name')}</title></svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">{t('events.title')}</h1>
<p class="mt-1 text-sm text-muted-foreground">{t('events.standingHint')}</p>

<div class="mt-5 grid gap-3 lg:grid-cols-3">
	{#each data.events as e (e.id)}
		<a href="/events/{e.id}" class="card group flex flex-col gap-4 transition hover:border-primary/50 hover:shadow-pop">
			<div class="flex items-start justify-between gap-3">
				<span class="grid size-11 shrink-0 place-items-center rounded-xl {TYPE_STYLE[e.type]}">
					<CalendarDays size={20} />
				</span>
				<span class="rounded-md px-2 py-0.5 text-xs font-medium {STATUS_STYLE[e.status]}">
					{t(`events.status.${e.status}` as MessageKey)}
				</span>
			</div>
			<div>
				<p class="font-semibold">{eventLabel(e, typeName)}</p>
				<p class="mt-0.5 text-xs text-muted-foreground">{typeName(e.type)}</p>
			</div>
			<div class="text-sm">
				<p class="text-xs text-muted-foreground">{t('events.next')}</p>
				<p class="font-medium">{e.startsAt ? formatDateTime(e.startsAt, locale(), tz()) : t('events.notScheduled')}</p>
			</div>
			<div class="mt-auto flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
				<span class="inline-flex items-center gap-1.5"><Users size={13} />{t('events.assigned', { n: e.assigned })}</span>
				{#if e.type !== 'polarity_elite'}
					<span class="inline-flex items-center gap-1.5"><CalendarX size={13} />{t('events.onLeaveCount', { n: e.onLeave })}</span>
				{/if}
			</div>
		</a>
	{/each}
</div>
