<script lang="ts">
	import { Monitor, Moon, Sun } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { useT } from '#lib/i18n/index.ts';

	type Pref = 'light' | 'dark' | 'system';
	let { class: cls = '' }: { class?: string } = $props();
	const t = useT();
	let pref: Pref = $state('system');

	const apply = (p: Pref) => {
		const dark = p === 'dark' || (p === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
		document.documentElement.dataset.theme = dark ? 'dark' : 'light';
	};

	onMount(() => {
		const m = document.cookie.match(/(?:^|; )theme=(light|dark|system)/);
		pref = (m?.[1] as Pref) ?? 'system';
		const mq = matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => pref === 'system' && apply('system');
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	const set = (p: Pref) => {
		pref = p;
		document.cookie = `theme=${p}; path=/; max-age=31536000; samesite=lax`;
		apply(p);
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
