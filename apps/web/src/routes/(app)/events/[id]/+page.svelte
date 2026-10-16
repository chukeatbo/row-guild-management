<script lang="ts">
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		ArrowLeft,
		Check,
		Lock,
		LockOpen,
		Pencil,
		Plus,
		Send,
		Trash2,
		TriangleAlert
	} from '@lucide/svelte';
	import { dndzone } from 'svelte-dnd-action';
	import CharChip from '#lib/components/CharChip.svelte';
	import RoleIcon from '#lib/components/RoleIcon.svelte';
	import { ROLE_COLORS, ROLE_ORDER, type Role } from '#lib/roles.ts';
	import Modal from '#lib/components/Modal.svelte';
	import { eventLabel, formatDateTime, zoneNote, toInput } from '#lib/datetime.ts';
	import { useTimezone } from '#lib/timezone.ts';
	import { useLocale, useT, type MessageKey } from '#lib/i18n/index.ts';

	let { data } = $props();
	const t = useT();
	const locale = useLocale();
	const tz = useTimezone();
	const title = $derived(eventLabel(data.event, (ty) => t(`events.type.${ty}` as MessageKey)));

	// id ถูกไลบรารี dnd แทนที่ใน shadow placeholder จึงเก็บ id ตัวละครไว้ใน cid ด้วย
	type Item = { id: string; cid: string };

	const charById = $derived(new Map(data.characters.map((c) => [c.id, c])));
	const leaveSet = $derived(new Set(data.onLeave));
	const partySize = $derived(data.event.config.partySize);
	/** Polarity ไม่มีชั้น group — ซ่อนส่วนหัว/ปุ่มจัดการ group ทั้งหมด */
	const flat = $derived(data.event.type === 'polarity_elite');

	// ---- สถานะกระดาน (client) — รีเซ็ตทุกครั้งที่ server data เปลี่ยน ----
	let lists = $state<Record<string, Item[]>>({});
	$effect(() => {
		const next: Record<string, Item[]> = {};
		const assigned = new Set<string>();
		for (const g of data.groups)
			for (const p of g.parties) {
				next[p.id] = p.members.map((id) => ({ id, cid: id }));
				p.members.forEach((id) => assigned.add(id));
			}
		next.pool = data.characters
			.filter((c) => !assigned.has(c.id) && !leaveSet.has(c.id))
			.map((c) => ({ id: c.id, cid: c.id }));
		lists = next;
	});

	// ---- บันทึกอัตโนมัติ (debounce + ส่งต่อคิว) ----
	let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let saveError = $state<string | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let inFlight = false;
	let dirty = false;

	function scheduleSave() {
		dirty = true;
		clearTimeout(timer);
		timer = setTimeout(flush, 250);
	}

	async function flush() {
		if (inFlight || !dirty) return;
		inFlight = true;
		dirty = false;
		saveState = 'saving';
		const layout = data.groups.flatMap((g) =>
			g.parties.map((p) => ({ partyId: p.id, characterIds: (lists[p.id] ?? []).map((i) => i.cid) }))
		);
		const body = new FormData();
		body.set('layout', JSON.stringify(layout));
		try {
			const res = await fetch('?/saveLayout', { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } });
			const result = deserialize(await res.text());
			if (result.type === 'success') {
				saveState = 'saved';
				saveError = null;
				setTimeout(() => saveState === 'saved' && (saveState = 'idle'), 1800);
			} else {
				saveState = 'error';
				saveError = (result as any).data?.error ?? 'error.generic';
				dirty = false;
				await invalidateAll(); // กลับไปใช้ข้อมูลจริงจาก server
			}
		} catch {
			saveState = 'error';
			saveError = 'error.generic';
			await invalidateAll();
		} finally {
			inFlight = false;
			if (dirty) flush();
		}
	}

	const onDnd = (key: string) => (e: CustomEvent<{ items: Item[]; info: { trigger: string } }>) => {
		lists[key] = e.detail.items;
	};
	const onFinalize = (key: string) => (e: CustomEvent<{ items: Item[] }>) => {
		lists[key] = e.detail.items;
		scheduleSave();
	};

	// ---- สรุป ----
	const roleCount = (key: string) => {
		const c: Record<Role, number> = { tank: 0, dps: 0, healer: 0, support: 0 };
		for (const i of lists[key] ?? []) {
			const r = charById.get(i.cid)?.role;
			if (r) c[r]++;
		}
		return c;
	};
	/** จำนวนแต่ละ role ของคนที่จัดลงปาร์ตี้แล้วทั้งหมด (ทุก group) */
	const roleTotals = $derived.by(() => {
		const c: Record<Role, number> = { tank: 0, dps: 0, healer: 0, support: 0 };
		for (const g of data.groups)
			for (const p of g.parties)
				for (const [r, n] of Object.entries(roleCount(p.id))) c[r as Role] += n;
		return c;
	});
	/** จำนวนแต่ละ role ในรายชื่อ "ยังไม่ได้จัด" */
	const poolRoles = $derived(roleCount('pool'));
	const groupTotal = (g: (typeof data.groups)[number]) =>
		g.parties.reduce((s, p) => s + (lists[p.id]?.length ?? 0), 0);
	const total = $derived(data.groups.flatMap((g) => g.parties).reduce((s, p) => s + (lists[p.id]?.length ?? 0), 0));
	const fieldTotals = $derived(
		(data.event.config.fields ?? []).map((f) => ({
			...f,
			n: data.groups
				.filter((g) => g.field === f.key)
				.reduce((s, g) => s + groupTotal(g), 0)
		}))
	);

	// ---- pool filter ----
	let query = $state('');
	let roleFilter = $state<Role | ''>('');
	const matches = (id: string) =>
		(!roleFilter || charById.get(id)?.role === roleFilter) &&
		(!query || (charById.get(id)?.ign ?? '').toLowerCase().includes(query.trim().toLowerCase()));

	// ---- modal แก้ event ----
	let editOpen = $state(false);
	let formError = $state<string | null>(null);

	const submit = (close?: () => void) => () => async (e: { result: any; update: () => Promise<void> }) => {
		if (e.result.type === 'failure') {
			formError = e.result.data?.error ?? 'error.generic';
			toast = { key: formError as MessageKey, params: e.result.data?.params };
			setTimeout(() => (toast = null), 3500);
			return;
		}
		if (e.result.type === 'redirect') return applyAction(e.result);
		formError = null;
		await e.update();
		close?.();
	};
	let sending = $state(false);
	const sendSubmit = () => async (e: { result: any }) => {
		sending = false;
		const failed = e.result.type === 'failure';
		toast = { key: failed ? (e.result.data?.error ?? 'error.generic') : 'discord.queued' };
		setTimeout(() => (toast = null), 3500);
	};
	let toast = $state<{ key: MessageKey; params?: Record<string, number> } | null>(null);

	const overCap = (f: { maxMembers?: number; n: number }) => !!f.maxMembers && f.n > f.maxMembers;
	const eventOver = $derived(!!data.event.config.maxMembers && total > data.event.config.maxMembers);
	const STATUS_STYLE: Record<string, string> = {
		draft: 'bg-muted text-muted-foreground',
		open: 'bg-success/15 text-success',
		closed: 'bg-warning/15 text-warning',
		done: 'bg-muted text-muted-foreground'
	};
	const anyEditable = $derived(data.groups.some((g) => g.parties.some((p) => p.editable)));
</script>

<svelte:head><title>{title} · {t('app.name')}</title></svelte:head>

<a href="/events" class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
	<ArrowLeft size={15} />{t('events.title')}
</a>

<!-- Header -->
<div class="mt-2 flex flex-wrap items-start justify-between gap-3">
	<div class="min-w-0">
		<h1 class="truncate text-2xl font-semibold tracking-tight">{title}</h1>
		<p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
			<span>{t(`events.type.${data.event.type}` as MessageKey)}</span>
			<span>{data.event.startsAt ? formatDateTime(data.event.startsAt, locale(), tz()) : t('events.notScheduled')}</span>
			<span class="rounded-md px-2 py-0.5 text-xs font-medium {STATUS_STYLE[data.event.status]}">
				{t(`events.status.${data.event.status}` as MessageKey)}
			</span>
		</p>
	</div>
	<div class="flex items-center gap-2">
		<span class="min-w-24 text-right text-sm" aria-live="polite">
			{#if saveState === 'saving'}<span class="text-muted-foreground">{t('builder.saving')}</span>
			{:else if saveState === 'saved'}<span class="inline-flex items-center gap-1 text-success"><Check size={14} />{t('builder.saved')}</span>
			{:else if saveState === 'error'}<span class="text-danger">{t('builder.saveFailed')}</span>{/if}
		</span>
		{#if data.perms.canSend}
			<form method="POST" action="?/sendDiscord" use:enhance={() => { sending = true; return sendSubmit(); }}>
				<button class="btn-secondary" disabled={sending || saveState === 'saving'}><Send size={15} />{t('discord.send')}</button>
			</form>
		{/if}
		{#if data.perms.canManage}
			<button class="btn-secondary" onclick={() => { formError = null; editOpen = true; }}><Pencil size={15} />{t('common.edit')}</button>
		{/if}
	</div>
</div>

{#if saveError && saveState === 'error'}
	<p class="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{t(saveError as MessageKey)}</p>
{/if}
{#if !anyEditable && data.perms.canAssign}
	<p class="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t('builder.readOnly')}</p>
{/if}

<!-- Totals -->
<div class="mt-4 flex flex-wrap gap-2 text-sm">
	<span class="rounded-lg border border-border bg-card px-3 py-1.5 {eventOver ? 'border-danger text-danger' : ''}">
		{t('builder.total', { n: total })}{data.event.config.maxMembers ? ` / ${data.event.config.maxMembers}` : ''}
	</span>
	{#each fieldTotals as f (f.key)}
		<span class="rounded-lg border border-border bg-card px-3 py-1.5 {overCap(f) ? 'border-danger text-danger' : ''}">
			{t(`builder.field.${f.key}` as MessageKey)}: {f.n}{f.maxMembers ? ` / ${f.maxMembers}` : ''}
			{#if overCap(f)}<TriangleAlert size={13} class="ml-1 inline" />{/if}
		</span>
	{/each}
	<!-- สรุป role ของคนที่จัดแล้ว (มีชื่อ role กำกับ ใช้เป็นคำอธิบายสัญลักษณ์ไปด้วย) -->
	<span class="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-card px-3 py-1.5" data-role-totals>
		{#each ROLE_ORDER as r (r)}
			<span class="inline-flex items-center gap-1.5" data-total-role={r}>
				<RoleIcon role={r} size={13} />
				<span class="text-muted-foreground">{t(`role.${r}`)}</span>
				<span class="font-semibold tabular-nums" style:color={ROLE_COLORS[r]}>{roleTotals[r]}</span>
			</span>
		{/each}
	</span>
</div>

<div class="mt-4 grid gap-4 lg:grid-cols-[17rem_1fr] lg:items-start">
	<!-- Pool -->
	<aside class="card flex flex-col gap-3 p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)]">
		<div class="flex items-center justify-between">
			<h2 class="font-medium">{t('builder.pool')}</h2>
			<span class="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums">{lists.pool?.length ?? 0}</span>
		</div>
		<input class="input py-1.5" placeholder={t('builder.search')} bind:value={query} />
		<!-- กรองรายชื่อตาม role (ซ่อนด้วย CSS ไม่ถอด item ออกจากโซนลาก) -->
		<div class="flex flex-wrap gap-1" role="group" aria-label={t('members.role')}>
			<button
				type="button"
				aria-pressed={roleFilter === ''}
				onclick={() => (roleFilter = '')}
				class="rounded-md border px-2 py-1 text-xs font-medium transition {roleFilter === ''
					? 'border-primary bg-primary/10 text-primary'
					: 'border-border text-muted-foreground hover:bg-muted'}"
			>
				{t('common.all')}
			</button>
			{#each ROLE_ORDER as r (r)}
				<button
					type="button"
					data-filter-role={r}
					aria-pressed={roleFilter === r}
					title={t(`role.${r}`)}
					onclick={() => (roleFilter = roleFilter === r ? '' : r)}
					class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold tabular-nums transition {roleFilter === r
						? 'border-primary bg-primary/10'
						: 'border-border hover:bg-muted'} {poolRoles[r] ? '' : 'opacity-40'}"
					style:color={ROLE_COLORS[r]}
				>
					<RoleIcon role={r} size={12} box={false} />{poolRoles[r]}
				</button>
			{/each}
		</div>
		<div
			class="-mx-1 flex max-h-72 min-h-16 flex-col gap-1.5 overflow-y-auto px-1 lg:max-h-none lg:flex-1"
			use:dndzone={{
				items: lists.pool ?? [],
				flipDurationMs: 0,
				type: 'char',
				dragDisabled: !data.perms.canAssign,
				dropTargetStyle: { outline: '2px dashed var(--primary)', 'outline-offset': '-2px' }
			}}
			onconsider={onDnd('pool')}
			onfinalize={onFinalize('pool')}
		>
			{#each lists.pool ?? [] as item (item.id)}
				{@const c = charById.get(item.cid)}
				<!-- ต้อง render wrapper ให้ทุก item รวม shadow placeholder ของ dnd ไม่งั้นไลบรารีซ่อน element ผิดตัว -->
				<div class:hidden={!!c && !matches(item.cid)}>
					{#if c}
						<CharChip ign={c.ign} className={c.className} classColor={c.classColor} role={c.role} draggable={data.perms.canAssign} />
					{/if}
				</div>
			{/each}
		</div>
		{#if (lists.pool?.length ?? 0) === 0}
			<p class="text-center text-xs text-muted-foreground">{t('builder.poolEmpty')}</p>
		{/if}
		{#if data.onLeave.length}
			<div class="border-t border-border pt-3">
				<p class="mb-1.5 text-xs font-medium text-muted-foreground">{t('builder.onLeave')} · {data.onLeave.length}</p>
				<div class="flex max-h-32 flex-col gap-1 overflow-y-auto">
					{#each data.onLeave as id (id)}
						{@const c = charById.get(id)}
						{#if c}<CharChip ign={c.ign} className={c.className} classColor={c.classColor} role={c.role} draggable={false} />{/if}
					{/each}
				</div>
			</div>
		{/if}
	</aside>

	<!-- Groups -->
	<div class="space-y-5">
		{#each data.groups as g (g.id)}
			<section class="card p-4">
				<div class="mb-3 flex flex-wrap items-center gap-2">
					{#if flat}
						<!-- Polarity: ไม่มีชั้น group แสดงแค่ปาร์ตี้ย่อย -->
					{:else if data.perms.canManage}
						<form method="POST" action="?/renameGroup" use:enhance={submit()} class="contents">
							<input type="hidden" name="groupId" value={g.id} />
							<input
								name="name"
								value={g.name}
								maxlength="20"
								aria-label={t('builder.groupName')}
								class="w-20 rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-semibold hover:border-input focus:border-ring focus:outline-none"
								onchange={(e) => e.currentTarget.form?.requestSubmit()}
							/>
						</form>
					{:else}
						<h2 class="px-2 text-base font-semibold">{g.name}</h2>
					{/if}
					{#if !flat && g.field && (g.field === 'main' || g.field === 'sub')}
						<span class="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{t(`builder.field.${g.field}` as MessageKey)}</span>
					{/if}
					{#if !flat && g.lane && ['top', 'mid', 'bottom'].includes(g.lane)}
						<span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t(`builder.lane.${g.lane}` as MessageKey)}</span>
					{/if}
					<span class="text-xs text-muted-foreground">{t('builder.partiesCount', { n: g.parties.length })} · {groupTotal(g)}</span>

					{#if data.perms.canManage}
						<div class="ml-auto flex items-center gap-1">
							<form method="POST" action="?/addParty" use:enhance={submit()}>
								<input type="hidden" name="groupId" value={g.id} />
								<button class="btn-ghost btn-sm" disabled={g.parties.length >= data.event.config.maxPartiesPerGroup}>
									<Plus size={14} />{t('builder.addParty')}
								</button>
							</form>
							{#if !flat}
								<form method="POST" action="?/deleteGroup" use:enhance={submit()}
									onsubmit={(e) => !confirm(t('common.confirmDelete')) && e.preventDefault()}>
									<input type="hidden" name="groupId" value={g.id} />
									<button class="btn-ghost btn-sm text-danger" aria-label={t('builder.deleteGroup')}><Trash2 size={14} /></button>
								</form>
							{/if}
						</div>
					{/if}
				</div>

				<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 min-[1750px]:grid-cols-4">
					{#each g.parties as p (p.id)}
						{@const list = lists[p.id] ?? []}
						{@const rc = roleCount(p.id)}
						<div class="flex flex-col rounded-xl border border-border bg-background/60 p-2.5 {p.editable ? '' : 'opacity-90'}">
							<div class="mb-2 flex items-center gap-1.5">
								<span class="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">{p.name}</span>
								<span class="text-xs tabular-nums {list.length >= partySize ? 'text-success' : 'text-muted-foreground'}">
									{list.length}/{partySize}
								</span>
								<span class="ml-auto flex items-center">
									{#if data.perms.canLock}
										<form method="POST" action="?/toggleLock" use:enhance={submit()}>
											<input type="hidden" name="partyId" value={p.id} />
											<button class="btn-ghost btn-sm p-1" aria-label={p.locked ? t('builder.unlock') : t('builder.lock')} title={p.locked ? t('builder.unlock') : t('builder.lock')}>
												{#if p.locked}<Lock size={13} class="text-warning" />{:else}<LockOpen size={13} />{/if}
											</button>
										</form>
									{:else if p.locked}
										<Lock size={13} class="text-warning" aria-label={t('builder.locked')} />
									{/if}
									{#if data.perms.canManage}
										<form method="POST" action="?/deleteParty" use:enhance={submit()}
											onsubmit={(e) => !confirm(t('common.confirmDelete')) && e.preventDefault()}>
											<input type="hidden" name="partyId" value={p.id} />
											<button class="btn-ghost btn-sm p-1 text-danger" aria-label={t('builder.deleteParty')}><Trash2 size={13} /></button>
										</form>
									{/if}
								</span>
							</div>

							<!-- องค์ประกอบ role ของปาร์ตี้: แสดงครบ 4 role, role ที่ไม่มีเลยจะจาง (เห็นทันทีว่าขาด Tank/Healer ฯลฯ) -->
							<div class="mb-2 grid grid-cols-4 gap-1" data-comp>
								{#each ROLE_ORDER as r (r)}
									<span
										title={t(`role.${r}`)}
										class="inline-flex items-center justify-center gap-1 rounded-md py-0.5 text-xs font-bold tabular-nums {rc[r] ? '' : 'opacity-30'}"
										style:color={ROLE_COLORS[r]}
										style:background-color="color-mix(in srgb, {ROLE_COLORS[r]} {rc[r] ? 14 : 6}%, transparent)"
									>
										<RoleIcon role={r} size={12} box={false} />{rc[r]}
									</span>
								{/each}
							</div>

							<div
								class="flex min-h-[calc(5*2.4rem)] flex-1 flex-col gap-1.5 rounded-lg {list.length === 0 ? 'border border-dashed border-input' : ''}"
								use:dndzone={{
									items: list,
									flipDurationMs: 0,
									type: 'char',
									dragDisabled: !p.editable,
									dropFromOthersDisabled: !p.editable || list.length >= partySize,
									dropTargetStyle: { outline: '2px dashed var(--primary)', 'outline-offset': '-2px' }
								}}
								onconsider={onDnd(p.id)}
								onfinalize={onFinalize(p.id)}
							>
								{#each list as item (item.id)}
									{@const c = charById.get(item.cid)}
									<div>
										{#if c}
											<CharChip
												ign={c.ign}
												className={c.className}
												classColor={c.classColor}
												role={c.role}
												leader={p.leaderCharacterId === c.id}
												draggable={p.editable}
											/>
										{/if}
									</div>
								{/each}
							</div>

							{#if data.perms.canManage && list.length}
								<form method="POST" action="?/setLeader" use:enhance={submit()} class="mt-2">
									<input type="hidden" name="partyId" value={p.id} />
									<select
										name="characterId"
										class="input py-1 text-xs"
										aria-label={t('builder.leader')}
										value={p.leaderCharacterId ?? ''}
										onchange={(e) => e.currentTarget.form?.requestSubmit()}
									>
										<option value="">{t('builder.leader')}: {t('builder.noLeader')}</option>
										{#each list as item (item.id)}
											<option value={item.cid}>{charById.get(item.cid)?.ign}</option>
										{/each}
									</select>
								</form>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/each}

		{#if data.perms.canManage && !flat}
			<form method="POST" action="?/addGroup" use:enhance={submit()} class="flex flex-wrap gap-2">
				<button class="btn-secondary"><Plus size={15} />{t('builder.addGroup')}</button>
				{#each data.event.config.fields ?? [] as f (f.key)}
					<button class="btn-secondary" name="field" value={f.key}>
						<Plus size={15} />{t('builder.addGroup')} · {t(`builder.field.${f.key}` as MessageKey)}
					</button>
				{/each}
			</form>
		{/if}
	</div>
</div>

{#if toast}
	<div class="animate-pop fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2.5 text-sm text-background shadow-pop lg:bottom-6">
		{t(toast.key, toast.params)}
	</div>
{/if}

<Modal bind:open={editOpen} title={t('events.edit')}>
	<form method="POST" action="?/updateEvent" class="space-y-4" use:enhance={submit(() => (editOpen = false))}>
		{#if formError}<p class="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{t(formError as MessageKey)}</p>{/if}
		<div>
			<label class="label" for="ev-title">{t('events.eventTitle')}</label>
			<input id="ev-title" name="title" class="input" maxlength="80" placeholder={t('events.autoTitle')} value={data.event.title} />
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label" for="ev-start">{t('events.startsAt')}</label>
				<input id="ev-start" name="startsAt" type="datetime-local" class="input" value={toInput(data.event.startsAt, tz())} />
			</div>
			<div>
				<label class="label" for="ev-leave">{t('events.leaveDeadline')}</label>
				<input id="ev-leave" name="leaveDeadline" type="datetime-local" class="input" value={toInput(data.event.leaveDeadline, tz())} />
			</div>
		</div>
		<div>
			<label class="label" for="ev-status">{t('events.status')}</label>
			<select id="ev-status" name="status" class="input" value={data.event.status}>
				{#each ['draft', 'open', 'closed'] as s (s)}<option value={s}>{t(`events.status.${s}` as MessageKey)}</option>{/each}
			</select>
		</div>
		<p class="text-xs text-muted-foreground">{t('events.timezone', { zone: zoneNote(tz()) })}</p>
		<div class="flex items-center justify-end gap-2">
			<div class="flex gap-2">
				<button type="button" class="btn-secondary" onclick={() => (editOpen = false)}>{t('common.cancel')}</button>
				<button class="btn-primary">{t('common.save')}</button>
			</div>
		</div>
	</form>
</Modal>
