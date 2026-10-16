<script lang="ts">
	import { CircleAlert, CreditCard, Infinity as InfinityIcon, Sparkles } from '@lucide/svelte';
	import { formatDateTime } from '#lib/datetime.ts';
	import { useLocale, useT } from '#lib/i18n/index.ts';
	import { useTimezone } from '#lib/timezone.ts';

	let { data } = $props();
	const t = useT();
	const locale = useLocale();
	const tz = useTimezone();

	const expired = $derived(data.access?.state === 'expired');
	const when = (iso: string) => formatDateTime(iso, locale(), tz());
	const renewHref = $derived(data.renewPlan && data.guildId ? `/checkout/${data.renewPlan}?guild=${data.guildId}` : '/#pricing');
</script>

<svelte:head><title>{t('billing.title')} · {t('app.name')}</title></svelte:head>

<div class="card animate-pop mx-auto mt-10 max-w-md text-center">
	{#if !data.access}
		<h1 class="text-xl font-semibold">{t('billing.noGuild')}</h1>
		<div class="mt-6 flex flex-wrap justify-center gap-2">
			<a href="/start/trial" class="btn-primary"><Sparkles size={15} />{t('noGuild.startTrial')}</a>
			<a href="/#pricing" class="btn-secondary">{t('noGuild.buy')}</a>
		</div>
	{:else}
		<div
			class="mx-auto mb-4 grid size-12 place-items-center rounded-2xl {expired ? 'bg-danger/10 text-danger' : 'bg-accent text-accent-foreground'}"
		>
			{#if expired}<CircleAlert size={24} />{:else if data.access.state === 'exempt'}<InfinityIcon size={24} />{:else}<CreditCard size={24} />{/if}
		</div>
		<p class="text-sm text-muted-foreground">{data.guildName}</p>
		<h1 class="mt-1 text-xl font-semibold">{expired ? t('billing.expiredTitle') : t('billing.title')}</h1>

		{#if expired}
			<p class="mt-2 text-sm text-muted-foreground">{t('billing.expiredBody')}</p>
		{:else if data.access.state === 'exempt'}
			<p class="mt-2 font-medium text-success">{t('billing.statusExempt')}</p>
		{:else if data.access.endsAt}
			<p class="mt-2 font-medium">
				{data.access.isTrial ? t('billing.statusTrial', { date: when(data.access.endsAt) }) : t('billing.statusActive', { date: when(data.access.endsAt) })}
			</p>
		{:else}
			<p class="mt-2 font-medium text-success">{t('billing.statusForever')}</p>
		{/if}

		{#if data.access.state !== 'exempt'}
			{#if data.canRenew}
				<a href={renewHref} class="btn-primary mt-6 w-full py-2.5"><CreditCard size={16} />{t('billing.renew')}</a>
			{:else if expired}
				<p class="mt-6 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t('billing.askOwner')}</p>
			{/if}
		{/if}
	{/if}
</div>
