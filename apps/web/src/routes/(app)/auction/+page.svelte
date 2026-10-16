<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check, ChevronLeft, ChevronRight, Gavel, History, LogIn, LogOut, Plus, Send, Trash2, X } from '@lucide/svelte';
	import ClassBadge from '#lib/components/ClassBadge.svelte';
	import Combobox from '#lib/components/Combobox.svelte';
	import { formatDateTime } from '#lib/datetime.ts';
	import { useLocale, useT, type MessageKey } from '#lib/i18n/index.ts';
	import { useTimezone } from '#lib/timezone.ts';

	let { data } = $props();
	const t = useT();
	const locale = useLocale();
	const tz = useTimezone();

	/** log การมอบ: หน้าละกี่รายการ + หน้าปัจจุบันของแต่ละคิว (0-based) */
	const HISTORY_PAGE_SIZE = 5;
	let historyPage = $state<Record<string, number>>({});

	let error = $state<string | null>(null);
	let errorTimer: ReturnType<typeof setTimeout> | undefined;

	let notice = $state<string | null>(null);
	const sendSubmit = () => async (e: { result: any }) => {
		if (e.result.type === 'failure') {
			error = e.result.data?.error ?? 'error.generic';
			clearTimeout(errorTimer);
			errorTimer = setTimeout(() => (error = null), 4000);
		} else {
			notice = 'discord.queued';
			setTimeout(() => (notice = null), 4000);
		}
	};

	/** ล้มเหลว → แสดง error key ที่แปลแล้วชั่วคราว; สำเร็จ → โหลดข้อมูลใหม่ + ล้างฟอร์ม */
	const submit = () => async (e: { result: any; update: (o?: { reset?: boolean }) => Promise<void> }) => {
		if (e.result.type === 'failure') {
			error = e.result.data?.error ?? 'error.generic';
			clearTimeout(errorTimer);
			errorTimer = setTimeout(() => (error = null), 4000);
			await e.update({ reset: false });
			return;
		}
		error = null;
		await e.update();
	};
</script>

<svelte:head><title>{t('auction.title')} · {t('app.name')}</title></svelte:head>

<div class="flex flex-wrap items-center justify-between gap-2">
	<h1 class="text-2xl font-semibold tracking-tight">{t('auction.title')}</h1>
	{#if data.canManage}
		<form method="POST" action="?/sendDiscord" use:enhance={sendSubmit}>
			<button class="btn-secondary"><Send size={15} />{t('discord.send')}</button>
		</form>
	{/if}
</div>
{#if notice}
	<p class="animate-pop mt-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success" role="status">{t(notice as MessageKey)}</p>
{/if}

{#if error}
	<p class="animate-pop mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{t(error as MessageKey)}</p>
{/if}

{#if data.canManage}
	<form method="POST" action="?/addQueue" use:enhance={submit} class="card mt-5 flex flex-wrap items-end gap-2">
		<div class="min-w-56 flex-1">
			<label class="label" for="item-name">{t('auction.addItem')}</label>
			<input id="item-name" name="name" class="input" list="item-list" maxlength="80" required autocomplete="off" placeholder={t('auction.itemPlaceholder')} />
			<datalist id="item-list">
				{#each data.items as i (i.id)}<option value={i.name}></option>{/each}
			</datalist>
		</div>
		<button class="btn-primary"><Plus size={15} />{t('auction.add')}</button>
	</form>
{/if}

{#if data.mine.length === 0}
	<p class="mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t('auction.noCharacters')}</p>
{/if}

{#if data.queues.length === 0}
	<p class="card mt-5 py-10 text-center text-sm text-muted-foreground">{t('auction.empty')}</p>
{/if}

<div class="mt-5 grid gap-4 lg:grid-cols-2">
	{#each data.queues as q (q.id)}
		{@const mineEntry = q.entries.find((e) => e.mine)}
		<section class="card space-y-3" data-queue={q.itemName}>
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0">
					<h2 class="flex items-center gap-2 font-semibold"><Gavel size={16} class="shrink-0 text-primary" /><span class="truncate">{q.itemName}</span></h2>
					<p class="mt-0.5 text-xs text-muted-foreground">{t('auction.inQueue', { n: q.entries.length })}</p>
				</div>
				{#if data.canManage}
					<form method="POST" action="?/cancelQueue" use:enhance={submit}>
						<input type="hidden" name="auctionId" value={q.id} />
						<button class="btn-ghost btn-sm text-danger" title={t('auction.cancelQueue')} aria-label={t('auction.cancelQueue')}><Trash2 size={14} /></button>
					</form>
				{/if}
			</div>

			{#if q.entries.length === 0}
				<p class="rounded-lg bg-muted/50 px-3 py-4 text-center text-sm text-muted-foreground">{t('auction.noEntries')}</p>
			{:else}
				<ol class="space-y-1.5">
					{#each q.entries as e, i (e.id)}
						<li
							data-entry={e.ign}
							class="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm {e.mine ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}"
						>
							<span
								class="grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold {i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
							>{i + 1}</span>
							<span class="min-w-0 flex-1 truncate font-medium">{e.ign}</span>
							{#if i === 0}<span class="rounded bg-primary/10 px-1.5 text-[10px] font-medium text-primary">{t('auction.next')}</span>{/if}
							{#if e.mine}<span class="rounded bg-muted px-1.5 text-[10px] font-medium">{t('auction.you')}</span>{/if}
							{#if e.className}<ClassBadge name={e.className} color={e.classColor} />{/if}
							{#if data.canManage}
								<form method="POST" action="?/award" use:enhance={submit}>
									<input type="hidden" name="entryId" value={e.id} />
									<button class="btn-ghost btn-sm p-1 text-success" title={t('auction.award')} aria-label={t('auction.award')}><Check size={14} /></button>
								</form>
							{/if}
							{#if data.canManage && !e.mine}
								<form method="POST" action="?/leave" use:enhance={submit}>
									<input type="hidden" name="entryId" value={e.id} />
									<button class="btn-ghost btn-sm p-1 text-danger" title={t('auction.remove')} aria-label={t('auction.remove')}><X size={14} /></button>
								</form>
							{/if}
						</li>
					{/each}
				</ol>
			{/if}

			{#if data.canManage}
				<!-- Officer ขึ้นไป: เลือกสมาชิกคนไหนก็ได้ที่ยังไม่อยู่ในคิวนี้ -->
				{#if q.available.length}
					<form method="POST" action="?/join" use:enhance={submit} class="flex gap-2">
						<input type="hidden" name="auctionId" value={q.id} />
						<Combobox
							name="characterId"
							class="min-w-0 flex-1"
							ariaLabel={t('auction.addFor')}
							placeholder={t('auction.addFor')}
							required
							options={q.available.map((c) => ({ value: c.id, label: c.ign, hint: c.className }))}
						/>
						<button class="btn-primary shrink-0"><LogIn size={15} />{t('auction.join')}</button>
					</form>
				{/if}
				{#if mineEntry}
					<form method="POST" action="?/leave" use:enhance={submit}>
						<input type="hidden" name="entryId" value={mineEntry.id} />
						<button class="btn-secondary w-full"><LogOut size={15} />{t('auction.leave')}</button>
					</form>
				{/if}
			{:else if mineEntry}
				<form method="POST" action="?/leave" use:enhance={submit}>
					<input type="hidden" name="entryId" value={mineEntry.id} />
					<button class="btn-secondary w-full"><LogOut size={15} />{t('auction.leave')}</button>
				</form>
			{:else if data.mine.length === 1}
				<form method="POST" action="?/join" use:enhance={submit}>
					<input type="hidden" name="auctionId" value={q.id} />
					<input type="hidden" name="characterId" value={data.mine[0].id} />
					<button class="btn-primary w-full"><LogIn size={15} />{t('auction.join')} · {data.mine[0].ign}</button>
				</form>
			{:else if data.mine.length > 1}
				<form method="POST" action="?/join" use:enhance={submit} class="flex gap-2">
					<input type="hidden" name="auctionId" value={q.id} />
					<Combobox
						name="characterId"
						class="min-w-0 flex-1"
						ariaLabel={t('auction.joinAs')}
						placeholder={t('auction.joinAs')}
						required
						options={data.mine.map((c) => ({ value: c.id, label: c.ign, hint: c.className }))}
					/>
					<button class="btn-primary shrink-0"><LogIn size={15} />{t('auction.join')}</button>
				</form>
			{/if}

			{#if q.history.length}
				{@const pages = Math.ceil(q.history.length / HISTORY_PAGE_SIZE)}
				{@const page = Math.min(historyPage[q.id] ?? 0, pages - 1)}
				<!-- log การมอบของคิวนี้ -->
				<details class="group border-t border-border pt-2" data-history={q.itemName}>
					<summary class="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground select-none hover:text-foreground">
						<ChevronRight size={14} class="transition group-open:rotate-90" />
						<History size={13} />{t('auction.history')} ({q.history.length})
					</summary>
					<ul class="mt-2 space-y-1">
						{#each q.history.slice(page * HISTORY_PAGE_SIZE, (page + 1) * HISTORY_PAGE_SIZE) as h (h.id)}
							<li class="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md bg-muted/50 px-2 py-1 text-xs">
								<span class="text-muted-foreground">{t('auction.wonBy')}</span>
								<span class="min-w-0 truncate font-medium">{h.ign}</span>
								{#if h.className}<ClassBadge name={h.className} color={h.classColor} />{/if}
								<span class="ml-auto text-muted-foreground">{formatDateTime(h.at, locale(), tz())}</span>
							</li>
						{/each}
					</ul>
					{#if pages > 1}
						<div class="mt-2 flex items-center justify-end gap-1 text-xs text-muted-foreground">
							<button
								type="button"
								class="btn-ghost btn-sm p-1"
								disabled={page === 0}
								aria-label={t('auction.prevPage')}
								onclick={() => (historyPage[q.id] = page - 1)}><ChevronLeft size={14} /></button
							>
							<span class="tabular-nums">{page + 1} / {pages}</span>
							<button
								type="button"
								class="btn-ghost btn-sm p-1"
								disabled={page >= pages - 1}
								aria-label={t('auction.nextPage')}
								onclick={() => (historyPage[q.id] = page + 1)}><ChevronRight size={14} /></button
							>
						</div>
					{/if}
				</details>
			{/if}
		</section>
	{/each}
</div>
