<script lang="ts">
	import { enhance } from '$app/forms';
	import { Pencil, Plus, Search, Trash2, UserPlus } from '@lucide/svelte';
	import ClassBadge from '#lib/components/ClassBadge.svelte';
	import Combobox from '#lib/components/Combobox.svelte';
	import RoleIcon from '#lib/components/RoleIcon.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import { useT, type MessageKey } from '#lib/i18n/index.ts';

	let { data } = $props();
	const t = useT();

	let tab = $state<'characters' | 'players'>('characters');
	let query = $state('');
	let classFilter = $state('');
	let roleFilter = $state('');
	const CLASS_ROLES = ['tank', 'dps', 'healer', 'support'] as const;

	const filtered = $derived(
		data.characters.filter(
			(c) =>
				(!classFilter || c.classId === classFilter) &&
				(!roleFilter || c.role === roleFilter) &&
				(!query || c.ign.toLowerCase().includes(query.trim().toLowerCase()))
		)
	);

	type Char = (typeof data.characters)[number];
	let charOpen = $state(false);
	let editing: Char | null = $state(null);
	let playerOpen = $state(false);
	let error: string | null = $state(null);

	const canEdit = (c: Char) => data.canEditAny || c.userId === data.me;

	function openChar(c: Char | null) {
		editing = c;
		error = null;
		charOpen = true;
	}

	/** ส่งฟอร์มแบบ progressive: สำเร็จ → ปิด modal, ล้มเหลว → แสดง error key ที่แปลแล้ว */
	const submit = (close?: () => void) => () => async (e: { result: any; update: () => Promise<void> }) => {
		if (e.result.type === 'failure') {
			error = e.result.data?.error ?? 'error.generic';
			return;
		}
		error = null;
		await e.update();
		close?.();
	};

	const ROLES = ['owner', 'officer', 'leader', 'member'] as const;
</script>

<svelte:head><title>{t('members.title')} · {t('app.name')}</title></svelte:head>

<div class="flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-semibold tracking-tight">{t('members.title')}</h1>
	{#if tab === 'characters'}
		<button class="btn-primary" onclick={() => openChar(null)}>
			<Plus size={16} />{t('members.addCharacter')}
		</button>
	{:else if data.canAddPlayers}
		<button
			class="btn-primary"
			onclick={() => {
				error = null;
				playerOpen = true;
			}}
		>
			<UserPlus size={16} />{t('members.addPlayer')}
		</button>
	{/if}
</div>

<div class="mt-5 inline-flex rounded-lg border border-border bg-muted p-0.5 text-sm font-medium" role="tablist">
	{#each ['characters', 'players'] as const as k (k)}
		<button
			role="tab"
			aria-selected={tab === k}
			onclick={() => (tab = k)}
			class="rounded-md px-4 py-1.5 transition {tab === k
				? 'bg-card text-foreground shadow-card'
				: 'text-muted-foreground hover:text-foreground'}"
		>
			{t(`members.tab.${k}`)}
		</button>
	{/each}
</div>

{#if tab === 'characters'}
	<div class="mt-4 flex flex-wrap items-center gap-3">
		<div class="relative min-w-52 flex-1 sm:max-w-xs">
			<Search size={15} class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
			<input class="input pl-9" placeholder={t('members.searchPlaceholder')} bind:value={query} />
		</div>
		<Combobox
			class="w-48"
			bind:value={classFilter}
			ariaLabel={t('members.class')}
			emptyLabel={`${t('common.all')} · ${t('members.class')}`}
			options={data.classes.map((c) => ({ value: c.id, label: c.name }))}
		/>
		<select class="input w-auto" bind:value={roleFilter} aria-label={t('members.role')}>
			<option value="">{t('common.all')} · {t('members.role')}</option>
			{#each CLASS_ROLES as r (r)}<option value={r}>{t(`role.${r}`)}</option>{/each}
		</select>
		<span class="ml-auto text-sm text-muted-foreground">{t('members.total', { n: filtered.length })}</span>
	</div>

	<div class="table-wrap mt-3">
		<table class="table">
			<thead>
				<tr>
					<th>{t('members.ign')}</th>
					<th>{t('members.class')}</th>
					<th>{t('members.role')}</th>
					<th class="text-right">{t('members.level')}</th>
					<th class="text-right">{t('members.cp')}</th>
					<th>{t('members.owner')}</th>
					<th class="w-24"></th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as c (c.id)}
					<tr>
						<td class="font-medium">{c.ign}</td>
						<td>{#if c.className}<ClassBadge name={c.className} color={c.classColor} />{:else}<span class="text-muted-foreground">—</span>{/if}</td>
						<td>
							{#if c.role}
								<span
									title={c.roleOverride ? t('members.roleCustom') : undefined}
									class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold {c.roleOverride
										? 'bg-primary/10 text-primary'
										: 'text-muted-foreground'}"
								>
									<RoleIcon role={c.role} size={14} box={false} />{t(`role.${c.role}`)}
								</span>
							{:else}<span class="text-muted-foreground">—</span>{/if}
						</td>
						<td class="text-right tabular-nums">{c.level ?? '—'}</td>
						<td class="text-right tabular-nums">{c.combatPower?.toLocaleString() ?? '—'}</td>
						<td class="text-muted-foreground">{c.ownerName ?? t('members.unlinked')}</td>
						<td class="text-right whitespace-nowrap">
							{#if canEdit(c)}
								<button class="btn-ghost btn-sm" onclick={() => openChar(c)} aria-label={t('common.edit')}>
									<Pencil size={14} />
								</button>
								<form method="POST" action="?/deleteCharacter" class="inline" use:enhance={submit()}
									onsubmit={(e) => !confirm(t('common.confirmDelete')) && e.preventDefault()}>
									<input type="hidden" name="id" value={c.id} />
									<button class="btn-ghost btn-sm text-danger" aria-label={t('common.delete')}>
										<Trash2 size={14} />
									</button>
								</form>
							{/if}
						</td>
					</tr>
				{:else}
					<tr><td colspan="7" class="py-10 text-center text-muted-foreground">{t('members.noResults')}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class="table-wrap mt-4">
		<table class="table">
			<thead>
				<tr>
					<th>{t('members.owner')}</th>
					<th>{t('members.discordId')}</th>
					<th>{t('members.changeRole')}</th>
					<th class="w-16"></th>
				</tr>
			</thead>
			<tbody>
				{#each data.players as p (p.memberId)}
					<tr>
						<td class="font-medium">
							<span class="flex items-center gap-2.5">
								{#if p.image}
									<img src={p.image} alt="" class="size-7 rounded-full" referrerpolicy="no-referrer" />
								{:else}
									<span class="grid size-7 place-items-center rounded-full bg-accent text-xs text-accent-foreground">{p.name.slice(0, 1)}</span>
								{/if}
								{p.name}
							</span>
						</td>
						<td class="font-mono text-xs text-muted-foreground">{p.discordId ?? '—'}</td>
						<td>
							{#if p.role === 'owner' || !data.canManagePlayers}
								<span class="text-sm">{t(`guildRole.${p.role as (typeof ROLES)[number]}` as MessageKey)}</span>
							{:else}
								<form method="POST" action="?/setRole" use:enhance={submit()}>
									<input type="hidden" name="memberId" value={p.memberId} />
									<select name="role" class="input w-auto py-1.5" value={p.role} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
										{#each ['officer', 'leader', 'member'] as r (r)}
											<option value={r}>{t(`guildRole.${r}` as MessageKey)}</option>
										{/each}
									</select>
								</form>
							{/if}
						</td>
						<td class="text-right">
							{#if p.role !== 'owner' && data.canManagePlayers}
								<form method="POST" action="?/removePlayer" use:enhance={submit()}
									onsubmit={(e) => !confirm(t('common.confirmDelete')) && e.preventDefault()}>
									<input type="hidden" name="memberId" value={p.memberId} />
									<button class="btn-ghost btn-sm text-danger" aria-label={t('common.remove')}><Trash2 size={14} /></button>
								</form>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<Modal bind:open={charOpen} title={editing ? t('members.editCharacter') : t('members.addCharacter')}>
	{#key editing?.id ?? 'new'}
		<form method="POST" action="?/saveCharacter" class="space-y-4" use:enhance={submit(() => (charOpen = false))}>
			{#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
			{#if error}<p class="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{t(error as MessageKey)}</p>{/if}
			<div>
				<label class="label" for="ign">{t('members.ign')}</label>
				<input id="ign" name="ign" class="input" required maxlength="40" value={editing?.ign ?? ''} />
			</div>
			<div>
				<label class="label" for="classId">{t('members.class')}</label>
				<Combobox
					id="classId"
					name="classId"
					value={editing?.classId ?? ''}
					emptyLabel="—"
					options={data.classes.map((c) => ({ value: c.id, label: c.name }))}
				/>
			</div>
			<div>
				<label class="label" for="role">{t('members.role')}</label>
				<select id="role" name="role" class="input" value={editing?.roleOverride ?? ''}>
					<option value="">{t('members.roleDefault')}</option>
					{#each CLASS_ROLES as r (r)}<option value={r}>{t(`role.${r}`)}</option>{/each}
				</select>
				<p class="mt-1 text-xs text-muted-foreground">{t('members.roleHint')}</p>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="label" for="level">{t('members.level')}</label>
					<input id="level" name="level" type="number" min="1" max="300" class="input" value={editing?.level ?? ''} />
				</div>
				<div>
					<label class="label" for="cp">{t('members.cp')}</label>
					<input id="cp" name="combatPower" type="number" min="0" class="input" value={editing?.combatPower ?? ''} />
				</div>
			</div>
			{#if data.canEditAny}
				<div>
					<label class="label" for="discordId">{t('members.linkDiscord')} ({t('common.optional')})</label>
					<input id="discordId" name="discordId" inputmode="numeric" class="input font-mono" value={editing?.discordId ?? ''} />
					<p class="mt-1 text-xs text-muted-foreground">{t('members.linkHint')}</p>
				</div>
			{/if}
			<div>
				<label class="label" for="note">{t('members.note')}</label>
				<textarea id="note" name="note" rows="2" maxlength="300" class="input">{editing?.note ?? ''}</textarea>
			</div>
			<div class="flex justify-end gap-2">
				<button type="button" class="btn-secondary" onclick={() => (charOpen = false)}>{t('common.cancel')}</button>
				<button class="btn-primary">{t('common.save')}</button>
			</div>
		</form>
	{/key}
</Modal>

<Modal bind:open={playerOpen} title={t('members.addPlayer')}>
	<form method="POST" action="?/addPlayer" class="space-y-4" use:enhance={submit(() => (playerOpen = false))}>
		{#if error}<p class="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{t(error as MessageKey)}</p>{/if}
		<div>
			<label class="label" for="pid">{t('members.discordId')}</label>
			<input id="pid" name="discordId" inputmode="numeric" required class="input font-mono" />
			<p class="mt-1 text-xs text-muted-foreground">{t('members.discordIdHint')}</p>
		</div>
		<div class="flex justify-end gap-2">
			<button type="button" class="btn-secondary" onclick={() => (playerOpen = false)}>{t('common.cancel')}</button>
			<button class="btn-primary">{t('common.add')}</button>
		</div>
	</form>
</Modal>
