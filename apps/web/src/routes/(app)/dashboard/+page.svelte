<script lang="ts">
	import { Check, Copy, UserX, Users, UsersRound } from '@lucide/svelte';
	import BarList from '#lib/components/BarList.svelte';
	import Donut from '#lib/components/Donut.svelte';
	import { useT } from '#lib/i18n/index.ts';

	let { data } = $props();
	const t = useT();

	const ROLE_COLORS = {
		tank: '#e05d5d',
		dps: '#e0a23a',
		healer: '#3fbf7f',
		support: '#5b8def'
	} as const;

	let copied = $state(false);
	async function copyId() {
		if (!data.empty || !data.discordId) return;
		await navigator.clipboard.writeText(data.discordId);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<svelte:head><title>{t('nav.dashboard')} · {t('app.name')}</title></svelte:head>

{#if data.empty}
	<div class="card animate-pop mx-auto mt-10 max-w-md text-center">
		<div class="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
			<UsersRound size={24} />
		</div>
		<h1 class="text-xl font-semibold">{t('noGuild.title')}</h1>
		<p class="mt-2 text-sm text-muted-foreground">{t('noGuild.body')}</p>
		<div class="mt-5 text-left">
			<span class="label">{t('noGuild.yourId')}</span>
			<div class="flex gap-2">
				<input class="input font-mono" readonly value={data.discordId ?? '—'} />
				<button class="btn-secondary" onclick={copyId} disabled={!data.discordId}>
					{#if copied}<Check size={15} />{t('common.copied')}{:else}<Copy size={15} />{t('common.copy')}{/if}
				</button>
			</div>
		</div>
	</div>
{:else}
	<h1 class="text-2xl font-semibold tracking-tight">{t('dashboard.welcome', { name: data.name })}</h1>

	<div class="mt-6 grid gap-4 sm:grid-cols-3">
		{#each [{ icon: Users, label: 'dashboard.characters', value: data.total }, { icon: UsersRound, label: 'dashboard.players', value: data.players }, { icon: UserX, label: 'dashboard.unlinked', value: data.unlinked }] as s (s.label)}
			<div class="card flex items-center gap-4">
				<span class="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
					<s.icon size={20} />
				</span>
				<div>
					<p class="text-2xl leading-none font-semibold tabular-nums">{s.value}</p>
					<p class="mt-1 text-xs text-muted-foreground">{t(s.label as 'dashboard.characters')}</p>
				</div>
			</div>
		{/each}
	</div>

	{#if data.total === 0}
		<p class="card mt-4 text-center text-sm text-muted-foreground">{t('dashboard.empty')}</p>
	{:else}
		<div class="mt-4 grid items-start gap-4 lg:grid-cols-5">
			<section class="card lg:col-span-2">
				<h2 class="mb-4 font-medium">{t('dashboard.roleMix')}</h2>
				<Donut
					total={data.total}
					slices={(['tank', 'dps', 'healer', 'support'] as const).map((r) => ({
						label: t(`role.${r}`),
						value: data.byRole[r] ?? 0,
						color: ROLE_COLORS[r]
					}))}
				/>
			</section>
			<section class="card lg:col-span-3">
				<h2 class="mb-4 font-medium">{t('dashboard.classMix')}</h2>
				<BarList items={data.classes} />
			</section>
		</div>
	{/if}
{/if}
