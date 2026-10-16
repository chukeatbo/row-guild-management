<script lang="ts">
	import { CircleAlert, Sparkles } from '@lucide/svelte';
	import NewGuildForm from '#lib/components/NewGuildForm.svelte';
	import { useT } from '#lib/i18n/index.ts';

	let { data } = $props();
	const t = useT();
</script>

<svelte:head><title>{t('start.trial.title')} · {t('app.name')}</title></svelte:head>

<div class="card animate-pop mx-auto mt-10 max-w-md text-center">
	{#if data.used}
		<div class="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-warning/15 text-warning">
			<CircleAlert size={24} />
		</div>
		<h1 class="text-xl font-semibold">{t('start.trial.used')}</h1>
		<p class="mt-2 text-sm text-muted-foreground">{t('start.trial.usedBody')}</p>
		<a href="/#pricing" class="btn-primary mt-6">{t('start.seePlans')}</a>
	{:else}
		<div class="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
			<Sparkles size={24} />
		</div>
		<h1 class="text-xl font-semibold">{t('start.trial.title')}</h1>
		<p class="mt-2 mb-6 text-sm text-muted-foreground">{t('start.trial.lead', { days: data.trialDays })}</p>
		<NewGuildForm />
	{/if}
</div>
