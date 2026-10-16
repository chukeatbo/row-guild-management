<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check } from '@lucide/svelte';
	import { weekdayName } from '#lib/datetime.ts';
	import { useLocale, useT, type MessageKey } from '#lib/i18n/index.ts';

	let { data, form } = $props();
	const t = useT();
	let saved = $state(false);
	let savedType = $state<string | null>(null);
	const locale = useLocale();
	const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // จันทร์เป็นวันแรก

	const fields = [
		{ name: 'discordGuildId', label: 'guild.discordGuildId' },
		{ name: 'notifyChannelId', label: 'guild.notifyChannel' },
		{ name: 'imageChannelId', label: 'guild.imageChannel' },
		{ name: 'auctionChannelId', label: 'guild.auctionChannel' }
	] as const;
</script>

<svelte:head><title>{t('guild.title')} · {t('app.name')}</title></svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">{t('guild.title')}</h1>

<form
	method="POST"
	action="?/save"
	class="mt-6 max-w-2xl space-y-6"
	use:enhance={() => async ({ update }) => {
		await update({ reset: false });
		saved = true;
		setTimeout(() => (saved = false), 2000);
	}}
>
	<fieldset disabled={!data.canEditGuild} class="card space-y-4">
		{#if form?.error}<p class="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{t(form.error as MessageKey)}</p>{/if}
		<div>
			<label class="label" for="name">{t('guild.name')}</label>
			<input id="name" name="name" class="input" required maxlength="60" value={data.guild.name} />
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label class="label" for="server">{t('guild.server')}</label>
				<input id="server" name="server" class="input" maxlength="60" value={data.guild.server} />
			</div>
			<div>
				<span class="label">Slug</span>
				<input class="input font-mono" readonly value={data.guild.slug} />
			</div>
		</div>
		<div>
			<label class="label" for="description">{t('guild.description')}</label>
			<textarea id="description" name="description" rows="4" maxlength="1000" class="input">{data.guild.description}</textarea>
		</div>
	</fieldset>

	<fieldset disabled={!data.canEditGuild} class="card space-y-4">
		<h2 class="font-medium">{t('guild.discordSection')}</h2>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each fields as f (f.name)}
				<div>
					<label class="label" for={f.name}>{t(f.label as MessageKey)}</label>
					<input id={f.name} name={f.name} inputmode="numeric" class="input font-mono" value={data.guild[f.name]} />
				</div>
			{/each}
		</div>
	</fieldset>

	{#if data.canEditGuild}
		<div class="flex items-center gap-3">
			<button class="btn-primary">{t('common.save')}</button>
			{#if saved}<span class="animate-pop inline-flex items-center gap-1.5 text-sm text-success"><Check size={15} />{t('common.saved')}</span>{/if}
		</div>
	{/if}
</form>

<!-- ตารางกิจกรรมรายสัปดาห์ -->
<section class="mt-10 max-w-2xl space-y-4">
	<div>
		<h2 class="text-lg font-semibold">{t('schedule.title')}</h2>
		<p class="mt-1 text-sm text-muted-foreground">{t('schedule.hint')}</p>
	</div>

	{#each data.schedules as s (s.type)}
		<form
			method="POST"
			action="?/saveSchedule"
			class="card"
			use:enhance={() => async ({ update }) => {
				await update({ reset: false });
				savedType = s.type;
				setTimeout(() => (savedType = null), 2000);
			}}
		>
			<fieldset disabled={!data.canEditGuild} class="space-y-4">
				<input type="hidden" name="type" value={s.type} />
				<div class="flex items-center justify-between gap-3">
					<h3 class="font-medium">{t(`events.type.${s.type}` as MessageKey)}</h3>
					<label class="flex cursor-pointer items-center gap-2 text-sm">
						<input type="checkbox" name="enabled" checked={s.enabled} class="size-4 accent-[var(--primary)]" />
						{t('schedule.enabled')}
					</label>
				</div>

				<div>
					<span class="label">{t('schedule.weekdays')}</span>
					<div class="flex flex-wrap gap-1.5">
						{#each WEEK_ORDER as d (d)}
							<label class="cursor-pointer">
								<input type="checkbox" name="weekdays" value={d} checked={s.weekdays.includes(d)} class="peer sr-only" />
								<span
									class="inline-flex min-w-12 items-center justify-center rounded-lg border border-input bg-card px-3 py-1.5 text-sm font-medium transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
								>
									{weekdayName(d, locale())}
								</span>
							</label>
						{/each}
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<div>
						<label class="label" for="time-{s.type}">{t('schedule.time')}</label>
						<input id="time-{s.type}" name="startTime" type="time" required class="input" value={s.startTime} />
					</div>
					<div>
						<label class="label" for="lh-{s.type}">{t('schedule.leaveHours')}</label>
						<input id="lh-{s.type}" name="leaveDeadlineHours" type="number" min="0" max="336" class="input" value={s.leaveDeadlineHours ?? ''} />
						<p class="mt-1 text-xs text-muted-foreground">{t('schedule.leaveHint')}</p>
					</div>
				</div>

				{#if data.canEditGuild}
					<div class="flex items-center gap-3">
						<button class="btn-primary">{t('common.save')}</button>
						{#if savedType === s.type}<span class="animate-pop inline-flex items-center gap-1.5 text-sm text-success"><Check size={15} />{t('common.saved')}</span>{/if}
					</div>
				{/if}
			</fieldset>
		</form>
	{/each}
	<p class="text-xs text-muted-foreground">{t('schedule.note')}</p>
</section>
