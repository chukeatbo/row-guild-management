<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Languages } from '@lucide/svelte';
	import { LOCALES, isLocale, useLocale, useT } from '#lib/i18n/index.ts';

	let { class: cls = '' }: { class?: string } = $props();
	const t = useT();
	const locale = useLocale();

	async function change(e: Event) {
		const value = (e.currentTarget as HTMLSelectElement).value;
		if (!isLocale(value)) return;
		document.cookie = `locale=${value}; path=/; max-age=31536000; samesite=lax`;
		await invalidateAll(); // hooks อ่าน cookie ใหม่ → layout load ส่ง locale ใหม่
	}
</script>

<label class="relative inline-flex items-center {cls}">
	<Languages size={15} class="pointer-events-none absolute left-2.5 text-muted-foreground" />
	<select
		aria-label={t('common.language')}
		value={locale()}
		onchange={change}
		class="w-full cursor-pointer appearance-none rounded-lg border border-border bg-card py-1.5 pr-3 pl-8 text-xs font-medium text-foreground transition hover:bg-muted"
	>
		{#each LOCALES as l (l.code)}
			<option value={l.code}>{l.label}</option>
		{/each}
	</select>
</label>
