<script lang="ts">
	import { enhance } from '$app/forms';
	import { Ban, CircleCheck, Infinity as InfinityIcon, Pencil, Plus } from '@lucide/svelte';
	import ClassBadge from '#lib/components/ClassBadge.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import { formatDateTime } from '#lib/datetime.ts';
	import { useLocale, useT, type MessageKey } from '#lib/i18n/index.ts';
	import { useTimezone } from '#lib/timezone.ts';

	let { data } = $props();
	const t = useT();
	const locale = useLocale();
	const tz = useTimezone();

	type Tab = 'classes' | 'bosses' | 'guilds';
	let tab = $state<Tab>('classes');
	let open = $state(false);
	let editing: Record<string, any> | null = $state(null);
	let error: string | null = $state(null);

	const TABS: Tab[] = ['classes', 'bosses', 'guilds'];
	const ACTIONS = { classes: 'saveClass', bosses: 'saveBoss', guilds: 'createGuild' } as const;
	const ADD_LABEL = { classes: 'admin.addClass', bosses: 'admin.addBoss', guilds: 'admin.createGuild' } as const;
	const ROLES = ['tank', 'dps', 'healer', 'support'] as const;

	function openEditor(row: Record<string, any> | null) {
		editing = row;
		error = null;
		open = true;
	}

	const submit = () => async (e: { result: any; update: () => Promise<void> }) => {
		if (e.result.type === 'failure') {
			error = e.result.data?.error ?? 'error.generic';
			return;
		}
		await e.update();
		open = false;
	};

	const masterRows = $derived(data.bosses);
</script>

<svelte:head><title>{t('admin.title')} · {t('app.name')}</title></svelte:head>

<div class="flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-semibold tracking-tight">{t('admin.title')}</h1>
	<button class="btn-primary" onclick={() => openEditor(null)}>
		<Plus size={16} />{t(ADD_LABEL[tab])}
	</button>
</div>

<div class="mt-5 inline-flex flex-wrap rounded-lg border border-border bg-muted p-0.5 text-sm font-medium" role="tablist">
	{#each TABS as k (k)}
		<button
			role="tab"
			aria-selected={tab === k}
			onclick={() => (tab = k)}
			class="rounded-md px-4 py-1.5 transition {tab === k ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'}"
		>
			{t(`admin.tab.${k}`)}
		</button>
	{/each}
</div>

<div class="table-wrap mt-4">
	<table class="table">
		{#if tab === 'classes'}
			<thead><tr><th>{t('common.name')}</th><th>{t('admin.role')}</th><th>{t('admin.color')}</th><th></th><th class="w-14"></th></tr></thead>
			<tbody>
				{#each data.classes as c (c.id)}
					<tr class:opacity-50={!c.active}>
						<td><ClassBadge name={c.name} color={c.color} /></td>
						<td>{t(`role.${c.role}`)}</td>
						<td class="font-mono text-xs text-muted-foreground">{c.color}</td>
						<td class="text-xs text-muted-foreground">{c.active ? '' : t('common.inactive')}</td>
						<td><button class="btn-ghost btn-sm" onclick={() => openEditor(c)} aria-label={t('common.edit')}><Pencil size={14} /></button></td>
					</tr>
				{/each}
			</tbody>
		{:else if tab === 'guilds'}
			<thead><tr><th>{t('guild.name')}</th><th>{t('admin.slug')}</th><th>{t('admin.plan')}</th><th class="text-right">{t('nav.members')}</th><th></th></tr></thead>
			<tbody>
				{#each data.guilds as g (g.id)}
					<tr class:opacity-60={g.suspended}>
						<td class="font-medium">{g.name}{#if g.suspended}<span class="ml-2 text-xs text-danger">{t('admin.suspended')}</span>{/if}</td>
						<td class="font-mono text-xs text-muted-foreground">{g.slug}</td>
						<td class="text-xs whitespace-nowrap">
							{#if g.billingExempt}<span class="text-success">{t('billing.statusExempt')}</span>
							{:else if g.planEndsAt && new Date(g.planEndsAt) > new Date()}{formatDateTime(g.planEndsAt, locale(), tz())}
							{:else if g.hasPlan && !g.planEndsAt}<span class="text-success">{t('billing.statusForever')}</span>
							{:else}<span class="text-danger">{t('billing.statusExpired')}</span>{/if}
						</td>
						<td class="text-right tabular-nums">{g.members}</td>
						<td class="text-right whitespace-nowrap">
							<form method="POST" action="?/toggleExempt" use:enhance class="inline">
								<input type="hidden" name="id" value={g.id} />
								<button class="btn-ghost btn-sm {g.billingExempt ? 'text-success' : ''}" title={t('admin.toggleExempt')} aria-label={t('admin.toggleExempt')}>
									<InfinityIcon size={15} />
								</button>
							</form>
							<form method="POST" action="?/toggleSuspend" use:enhance class="inline">
								<input type="hidden" name="id" value={g.id} />
								<button class="btn-ghost btn-sm" aria-label="suspend">
									{#if g.suspended}<CircleCheck size={15} class="text-success" />{:else}<Ban size={15} />{/if}
								</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		{:else}
			<thead><tr><th>{t('common.name')}</th><th></th><th class="w-14"></th></tr></thead>
			<tbody>
				{#each masterRows as r (r.id)}
					<tr class:opacity-50={!r.active}>
						<td class="font-medium">{r.name}</td>
						<td class="text-xs text-muted-foreground">{r.active ? '' : t('common.inactive')}</td>
						<td><button class="btn-ghost btn-sm" onclick={() => openEditor(r)} aria-label={t('common.edit')}><Pencil size={14} /></button></td>
					</tr>
				{:else}
					<tr><td colspan="3" class="py-10 text-center text-muted-foreground">—</td></tr>
				{/each}
			</tbody>
		{/if}
	</table>
</div>

<Modal bind:open title={editing ? t('common.edit') : t(ADD_LABEL[tab])}>
	{#key `${tab}-${editing?.id ?? 'new'}`}
		<form method="POST" action="?/{ACTIONS[tab]}" class="space-y-4" use:enhance={submit}>
			{#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
			{#if error}<p class="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{t(error as MessageKey)}</p>{/if}

			<div>
				<label class="label" for="a-name">{tab === 'guilds' ? t('guild.name') : t('common.name')}</label>
				<input id="a-name" name="name" class="input" required maxlength="60" value={editing?.name ?? ''} />
			</div>

			{#if tab === 'classes'}
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="label" for="a-role">{t('admin.role')}</label>
						<select id="a-role" name="role" class="input" value={editing?.role ?? 'dps'}>
							{#each ROLES as r (r)}<option value={r}>{t(`role.${r}`)}</option>{/each}
						</select>
					</div>
					<div>
						<label class="label" for="a-color">{t('admin.color')}</label>
						<input id="a-color" name="color" type="color" class="input h-[38px] cursor-pointer p-1" value={editing?.color ?? '#4f5bd5'} />
					</div>
				</div>
			{/if}

			{#if tab === 'guilds'}
				<div>
					<label class="label" for="a-slug">{t('admin.slug')}</label>
					<input id="a-slug" name="slug" class="input font-mono" required pattern="[a-z0-9\-]+" maxlength="40" />
				</div>
				<div>
					<label class="label" for="a-owner">{t('admin.ownerDiscordId')} ({t('common.optional')})</label>
					<input id="a-owner" name="ownerDiscordId" inputmode="numeric" class="input font-mono" />
					<p class="mt-1 text-xs text-muted-foreground">{t('admin.ownerHint')}</p>
				</div>
			{:else}
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" name="active" checked={editing?.active ?? true} class="size-4 accent-[var(--primary)]" />
					{t('common.active')}
				</label>
			{/if}

			<div class="flex justify-end gap-2">
				<button type="button" class="btn-secondary" onclick={() => (open = false)}>{t('common.cancel')}</button>
				<button class="btn-primary">{t('common.save')}</button>
			</div>
		</form>
	{/key}
</Modal>
