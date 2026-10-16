<script lang="ts">
	import { Shield } from '@lucide/svelte';
	import LocaleSwitcher from '#lib/components/LocaleSwitcher.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { authClient } from '#lib/auth-client.ts';
	import { useT } from '#lib/i18n/index.ts';

	const t = useT();
	let loading = $state(false);

	async function login() {
		loading = true;
		await authClient.signIn.social({ provider: 'discord', callbackURL: '/dashboard' });
	}
</script>

<svelte:head><title>{t('app.name')}</title></svelte:head>

<main class="relative grid min-h-dvh place-items-center overflow-hidden px-4">
	<div
		class="pointer-events-none absolute -top-40 left-1/2 size-168 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
	></div>

	<div class="absolute top-4 right-4 flex items-center gap-2">
		<LocaleSwitcher />
		<ThemeToggle />
	</div>

	<div class="card animate-pop relative w-full max-w-md p-8 text-center">
		<div class="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-card">
			<Shield size={28} />
		</div>
		<h1 class="text-2xl font-semibold tracking-tight">{t('login.title')}</h1>
		<p class="mt-2 text-sm text-muted-foreground">{t('login.subtitle')}</p>

		<button class="btn-primary mt-7 w-full py-2.5" onclick={login} disabled={loading}>
			{t('login.discord')}
		</button>
		<p class="mt-4 text-xs text-muted-foreground">{t('login.note')}</p>
	</div>
</main>
