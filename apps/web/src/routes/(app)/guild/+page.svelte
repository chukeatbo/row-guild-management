<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check } from '@lucide/svelte';
	import { extractDiscordId, isDiscordId, serverIdFromChannelLink } from '@row/shared';
	import { weekdayName } from '#lib/datetime.ts';
	import { useLocale, useT, type MessageKey } from '#lib/i18n/index.ts';

	let { data, form } = $props();
	const t = useT();
	let saved = $state(false);
	let failed = $state<string | null>(null); // error key ของการบันทึกล่าสุดที่ล้มเหลว
	let badField = $state<string | null>(null);
	let savedType = $state<string | null>(null);
	const locale = useLocale();
	const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // จันทร์เป็นวันแรก

	/** วางลิงก์ที่คัดลอกมา → แปลงเป็น ID ให้ทันทีตอนออกจากช่อง */
	const normalize = (e: FocusEvent) => {
		const el = e.currentTarget as HTMLInputElement;
		badField = null;
		const raw = el.value;
		const id = extractDiscordId(raw, el.name === 'discordGuildId' ? 'server' : 'channel');
		if (isDiscordId(id)) el.value = id;
		// วางลิงก์ห้อง + ช่อง server ว่าง → เติม server ID จากลิงก์ด้วย (ก่อนที่ลิงก์จะถูกแปลงเป็น ID ห้อง)
		const sid = serverIdFromChannelLink(raw);
		const serverInput = el.form?.elements.namedItem('discordGuildId') as HTMLInputElement | null;
		if (sid && serverInput && !serverInput.value.trim()) serverInput.value = sid;
	};

	const fields = [
		{ name: 'discordGuildId', label: 'guild.discordGuildId' },
		{ name: 'notifyChannelId', label: 'guild.notifyChannel' },
		{ name: 'auctionChannelId', label: 'guild.auctionChannel' }
	] as const;
	const imageFields = [
		{ name: 'imageGlMainChannelId', label: 'guild.imageGlMain' },
		{ name: 'imageGlSubChannelId', label: 'guild.imageGlSub' },
		{ name: 'imageSiegeChannelId', label: 'guild.imageSiege' },
		{ name: 'imagePolarityChannelId', label: 'guild.imagePolarity' }
	] as const;
</script>

<svelte:head><title>{t('guild.title')} · {t('app.name')}</title></svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">{t('guild.title')}</h1>

<form
	method="POST"
	action="?/save"
	class="mt-6 max-w-2xl space-y-6"
	use:enhance={() => async ({ result, update }) => {
		await update({ reset: false });
		// แสดง "บันทึกแล้ว" เฉพาะเมื่อสำเร็จจริง; ล้มเหลวให้บอกเหตุผลตรงปุ่ม + ไฮไลต์ช่องที่ผิด
		if (result.type === 'success') {
			failed = null;
			badField = null;
			saved = true;
			setTimeout(() => (saved = false), 2000);
		} else {
			saved = false;
			failed = (result.type === 'failure' ? (result.data?.error as string) : null) ?? 'error.generic';
			badField = result.type === 'failure' ? ((result.data?.field as string | undefined) ?? null) : null;
			if (badField) document.getElementById(badField)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
		}
	}}
>
	<fieldset disabled={!data.canEditGuild} class="card space-y-4">
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
		<p class="text-xs text-muted-foreground">{t('guild.discordHint')}</p>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each fields as f (f.name)}
				<div>
					<label class="label" for={f.name}>{t(f.label as MessageKey)}</label>
					<input id={f.name} name={f.name} autocomplete="off" onblur={normalize} placeholder={t('guild.idPlaceholder')} class="input font-mono {badField === f.name ? 'border-danger' : ''}" aria-invalid={badField === f.name} value={data.guild[f.name]} />
				</div>
			{/each}
		</div>
		<div class="border-t border-border pt-4">
			<h3 class="text-sm font-medium">{t('guild.imageSection')}</h3>
			<p class="mt-1 text-xs text-muted-foreground">{t('guild.imageHint')}</p>
			<div class="mt-3 grid gap-4 sm:grid-cols-2">
				{#each imageFields as f (f.name)}
					<div>
						<label class="label" for={f.name}>{t(f.label as MessageKey)}</label>
						<input id={f.name} name={f.name} autocomplete="off" onblur={normalize} placeholder={t('guild.idPlaceholder')} class="input font-mono {badField === f.name ? 'border-danger' : ''}" aria-invalid={badField === f.name} value={data.guild[f.name]} />
					</div>
				{/each}
			</div>
		</div>
	</fieldset>

	{#if data.canEditGuild}
		<div class="flex items-center gap-3">
			<button class="btn-primary">{t('common.save')}</button>
			{#if saved}<span class="animate-pop inline-flex items-center gap-1.5 text-sm text-success"><Check size={15} />{t('common.saved')}</span>{/if}
			{#if failed}<span class="animate-pop text-sm text-danger" role="alert">{t(failed as MessageKey)}</span>{/if}
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
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: false });
				if (result.type !== 'success') return; // ล้มเหลว: ไม่แสดง "บันทึกแล้ว"
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
