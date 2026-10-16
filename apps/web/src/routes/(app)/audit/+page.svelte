<script lang="ts">
	import { ChevronRight, History } from '@lucide/svelte';
	import Combobox from '#lib/components/Combobox.svelte';
	import { formatDateTime } from '#lib/datetime.ts';
	import { useLocale, useT, type MessageKey } from '#lib/i18n/index.ts';
	import { useTimezone } from '#lib/timezone.ts';

	let { data } = $props();
	const t = useT();
	const locale = useLocale();
	const tz = useTimezone();

	// svelte-ignore state_referenced_locally — ค่าเริ่มต้นของตัวกรองมาจาก URL ตอนโหลดหน้า
	let group = $state(data.filters.group);
	// svelte-ignore state_referenced_locally
	let actor = $state(data.filters.actor);
	let form = $state<HTMLFormElement>();

	const label = (action: string) => {
		const key = `audit.action.${action}` as MessageKey;
		const text = t(key);
		return text === key ? action : text; // action ที่ยังไม่มีคำแปลแสดงชื่อดิบ
	};

	/** สรุป detail เป็นข้อความสั้น: เอาเฉพาะค่าที่เป็นข้อความ/ตัวเลข/boolean ไม่เกิน 4 ช่อง */
	const summarize = (detail: unknown) => {
		if (!detail || typeof detail !== 'object') return '';
		return Object.entries(detail as Record<string, unknown>)
			.filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v) && v !== '')
			.slice(0, 4)
			.map(([k, v]) => `${k}: ${v}`)
			.join(' · ');
	};

	const query = (extra: Record<string, string>) => {
		const p = new URLSearchParams();
		if (data.filters.group) p.set('group', data.filters.group);
		if (data.filters.actor) p.set('actor', data.filters.actor);
		for (const [k, v] of Object.entries(extra)) p.set(k, v);
		const s = p.toString();
		return s ? `?${s}` : '?';
	};
</script>

<svelte:head><title>{t('audit.title')} · {t('app.name')}</title></svelte:head>

<h1 class="flex items-center gap-2 text-2xl font-semibold tracking-tight"><History size={22} class="text-primary" />{t('audit.title')}</h1>
<p class="mt-1 text-sm text-muted-foreground">{t('audit.subtitle')}</p>

<form bind:this={form} method="GET" class="mt-5 flex flex-wrap items-end gap-3">
	<div class="w-52">
		<label class="label" for="audit-group">{t('audit.group')}</label>
		<Combobox
			id="audit-group"
			name="group"
			bind:value={group}
			emptyLabel={t('common.all')}
			options={data.groups.map((g) => ({ value: g, label: t(`audit.group.${g}` as MessageKey) }))}
			onchange={() => form?.requestSubmit()}
		/>
	</div>
	<div class="w-60">
		<label class="label" for="audit-actor">{t('audit.actor')}</label>
		<Combobox
			id="audit-actor"
			name="actor"
			bind:value={actor}
			emptyLabel={t('common.all')}
			options={data.actors.map((a) => ({ value: a.id, label: a.name }))}
			onchange={() => form?.requestSubmit()}
		/>
	</div>
	{#if data.filters.before || data.filters.group || data.filters.actor}
		<a href="/audit" class="btn-ghost">{t('audit.reset')}</a>
	{/if}
</form>

{#if data.rows.length === 0}
	<p class="card mt-5 py-10 text-center text-sm text-muted-foreground">{t('audit.empty')}</p>
{:else}
	<!-- มือถือ: การ์ดต่อรายการ (ตารางกว้างเกินจอ) -->
	<ul class="mt-4 divide-y divide-border rounded-lg border border-border bg-card sm:hidden">
		{#each data.rows as r (r.id)}
			<li class="space-y-0.5 px-3 py-2.5" data-action-m={r.action}>
				<p class="text-sm font-medium">{label(r.action)}</p>
				<p class="text-xs text-muted-foreground">{r.actorName ?? t('audit.system')} · {formatDateTime(r.createdAt, locale(), tz())}</p>
				{#if summarize(r.detail)}<p class="truncate text-xs text-muted-foreground">{summarize(r.detail)}</p>{/if}
			</li>
		{/each}
	</ul>

	<div class="table-wrap mt-4 hidden sm:block">
		<table class="table">
			<thead>
				<tr>
					<th>{t('audit.time')}</th>
					<th>{t('audit.actor')}</th>
					<th>{t('audit.what')}</th>
					<th>{t('audit.detail')}</th>
				</tr>
			</thead>
			<tbody>
				{#each data.rows as r (r.id)}
					<tr data-action={r.action}>
						<td class="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.createdAt, locale(), tz())}</td>
						<td class="whitespace-nowrap">{r.actorName ?? t('audit.system')}</td>
						<td class="font-medium">{label(r.action)}</td>
						<td class="max-w-md truncate text-xs text-muted-foreground" title={summarize(r.detail)}>{summarize(r.detail)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div class="mt-3 flex items-center justify-between text-sm">
		{#if data.filters.before}<a href={query({})} class="text-muted-foreground hover:text-foreground">← {t('audit.latest')}</a>{:else}<span></span>{/if}
		{#if data.nextBefore}
			<a href={query({ before: data.nextBefore })} class="inline-flex items-center gap-1 text-primary hover:underline">{t('audit.older')}<ChevronRight size={15} /></a>
		{/if}
	</div>
{/if}
