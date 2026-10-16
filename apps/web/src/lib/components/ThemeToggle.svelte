<script lang="ts">
	import { Monitor, Moon, Sun } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { useT } from '#lib/i18n/index.ts';
	import { readThemePref, saveThemePref, type ThemePref } from '#lib/theme.ts';

	/** ปุ่มธีมของหน้าระบบ (cookie `app-theme`, ค่าเริ่มต้น dark) — หน้า landing มีปุ่มของตัวเอง */
	let { class: cls = '' }: { class?: string } = $props();
	const t = useT();
	let pref: ThemePref = $state('dark');

	onMount(() => {
		pref = readThemePref('app');
	});

	const set = (p: ThemePref) => {
		pref = p;
		saveThemePref('app', p);
	};

	const options = [
		{ v: 'light', icon: Sun, key: 'common.theme.light' },
		{ v: 'dark', icon: Moon, key: 'common.theme.dark' },
		{ v: 'system', icon: Monitor, key: 'common.theme.system' }
	] as const;
</script>

<div class="inline-flex rounded-lg border border-border bg-muted p-0.5 {cls}" role="group" aria-label={t('common.theme')}>
	{#each options as o (o.v)}
		<button
			type="button"
			title={t(o.key)}
			aria-label={t(o.key)}
			aria-pressed={pref === o.v}
			onclick={() => set(o.v)}
			class="flex flex-1 items-center justify-center rounded-md p-1.5 transition {pref === o.v
				? 'bg-accent text-accent-foreground shadow-card ring-1 ring-primary/30'
				: 'text-muted-foreground hover:text-foreground'}"
		>
			<o.icon size={15} />
		</button>
	{/each}
</div>
