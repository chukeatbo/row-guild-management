<script lang="ts">
	import { enhance } from '$app/forms';
	import { CalendarX, Clock, X } from '@lucide/svelte';
	import ClassBadge from '#lib/components/ClassBadge.svelte';
	import Combobox from '#lib/components/Combobox.svelte';
	import { eventLabel, formatDateTime } from '#lib/datetime.ts';
	import { useTimezone } from '#lib/timezone.ts';
	import { useLocale, useT, type MessageKey } from '#lib/i18n/index.ts';

	let { data } = $props();
	const t = useT();
	const locale = useLocale();
	const tz = useTimezone();

	let error = $state<string | null>(null);
	let errorTimer: ReturnType<typeof setTimeout> | undefined;

	/** ล้มเหลว → แสดง error key ที่แปลแล้วชั่วคราว; สำเร็จ → โหลดข้อมูลใหม่ + ล้างฟอร์ม */
	const submit = () => async (e: { result: any; update: (o?: { reset?: boolean }) => Promise<void> }) => {
		if (e.result.type === 'failure') {
			error = e.result.data?.error ?? 'error.generic';
			clearTimeout(errorTimer);
			errorTimer = setTimeout(() => (error = null), 4000);
			return;
		}
		error = null;
		await e.update();
	};

	const leaveOf = (ev: (typeof data.events)[number], characterId: string) =>
		ev.leaves.find((l) => l.characterId === characterId);
</script>

<svelte:head><title>{t('leave.title')} · {t('app.name')}</title></svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">{t('leave.title')}</h1>

{#if error}
	<p class="animate-pop mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{t(error as MessageKey)}</p>
{/if}

{#if data.events.length === 0}
	<p class="card mt-5 py-10 text-center text-sm text-muted-foreground">{t('leave.noEvents')}</p>
{/if}

<div class="mt-5 space-y-5">
	{#each data.events as ev (ev.id)}
		<section class="card space-y-4">
			<div class="flex flex-wrap items-start justify-between gap-2">
				<div class="min-w-0">
					<a href="/events/{ev.id}" class="font-semibold hover:text-primary">{eventLabel(ev, (ty) => t(`events.type.${ty}` as MessageKey))}</a>
					<p class="mt-0.5 text-xs text-muted-foreground">
						{t(`events.type.${ev.type}` as MessageKey)} · {formatDateTime(ev.startsAt, locale(), tz())}
					</p>
				</div>
				<span
					class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium {ev.deadlinePassed
						? 'bg-danger/10 text-danger'
						: 'bg-muted text-muted-foreground'}"
				>
					<Clock size={13} />
					{#if ev.deadlinePassed}{t('leave.deadlinePassed')}
					{:else if ev.leaveDeadline}{t('leave.deadline', { time: formatDateTime(ev.leaveDeadline, locale(), tz()) })}
					{:else}{t('leave.noDeadline')}{/if}
				</span>
			</div>

			<!-- ตัวละครของฉัน -->
			<div>
				<h2 class="mb-2 text-sm font-medium">{t('leave.myCharacters')}</h2>
				{#if data.mine.length === 0}
					<p class="text-sm text-muted-foreground">{t('leave.noCharacters')}</p>
				{:else}
					<ul class="divide-y divide-border rounded-lg border border-border">
						{#each data.mine as c (c.id)}
							{@const lv = leaveOf(ev, c.id)}
							<li class="flex flex-wrap items-center gap-2 px-3 py-2">
								<span class="min-w-0 flex-1 truncate text-sm font-medium">{c.ign}</span>
								{#if c.className}<ClassBadge name={c.className} color={c.classColor} />{/if}
								{#if lv}
									<span class="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">{t('leave.onLeave')}</span>
									{#if lv.canCancel}
										<form method="POST" action="?/cancel" use:enhance={submit}>
											<input type="hidden" name="leaveId" value={lv.id} />
											<button class="btn-secondary btn-sm">{t('leave.cancel')}</button>
										</form>
									{/if}
								{:else if ev.deadlinePassed && !data.canAny}
									<span class="text-xs text-muted-foreground">{t('leave.deadlinePassed')}</span>
								{:else}
									<form method="POST" action="?/take" use:enhance={submit} class="flex flex-1 basis-full items-center gap-2 sm:basis-auto sm:flex-none">
										<input type="hidden" name="eventId" value={ev.id} />
										<input type="hidden" name="characterId" value={c.id} />
										<input name="reason" class="input min-w-0 flex-1 py-1.5 text-xs sm:w-44" maxlength="200" placeholder={t('leave.reason')} />
										<button class="btn-primary btn-sm"><CalendarX size={14} />{t('leave.take')}</button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- รายชื่อคนลา -->
			<div>
				<h2 class="mb-2 text-sm font-medium">{t('leave.all', { n: ev.leaves.length })}</h2>
				{#if ev.leaves.length === 0}
					<p class="text-sm text-muted-foreground">{t('leave.none')}</p>
				{:else}
					<ul class="grid gap-1.5 sm:grid-cols-2">
						{#each ev.leaves as l (l.id)}
							<li class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm">
								<span class="min-w-0 flex-1">
									<span class="block truncate font-medium">{l.ign}</span>
									{#if l.reason || (l.filedByName && !l.mine)}
										<span class="block truncate text-xs text-muted-foreground">
											{l.reason ?? ''}{#if l.filedByName && !l.mine}{l.reason ? ' · ' : ''}{t('leave.filedBy', { name: l.filedByName })}{/if}
										</span>
									{/if}
								</span>
								{#if l.className}<ClassBadge name={l.className} color={l.classColor} />{/if}
								{#if l.canCancel && !l.mine}
									<form method="POST" action="?/cancel" use:enhance={submit}>
										<input type="hidden" name="leaveId" value={l.id} />
										<button class="btn-ghost btn-sm p-1 text-danger" aria-label={t('leave.cancel')}><X size={14} /></button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- ลาแทนผู้อื่น (Officer ขึ้นไป) -->
			{#if data.canAny}
				<form method="POST" action="?/take" use:enhance={submit} class="flex flex-wrap items-end gap-2 border-t border-border pt-4">
					<input type="hidden" name="eventId" value={ev.id} />
					<div class="min-w-48 flex-1">
						<label class="label" for="who-{ev.id}">{t('leave.addFor')}</label>
						<Combobox
							id="who-{ev.id}"
							name="characterId"
							placeholder={t('leave.pickCharacter')}
							required
							options={data.everyone.filter((c) => !leaveOf(ev, c.id)).map((c) => ({ value: c.id, label: c.ign, hint: c.className }))}
						/>
					</div>
					<input name="reason" class="input w-full flex-1 sm:w-auto" maxlength="200" placeholder={t('leave.reason')} />
					<button class="btn-primary"><CalendarX size={15} />{t('leave.take')}</button>
				</form>
			{/if}
		</section>
	{/each}
</div>
