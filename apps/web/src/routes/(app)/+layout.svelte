<script lang="ts">
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { CalendarDays, CreditCard, CalendarX, Gavel, History, LayoutDashboard, LogOut, Shield, ShieldCheck, Swords, Users } from '@lucide/svelte';
	import LocaleSwitcher from '#lib/components/LocaleSwitcher.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { authClient } from '#lib/auth-client.ts';
	import { useLocale, useT, type MessageKey } from '#lib/i18n/index.ts';
	import { langPath, langs, type Lang } from '#lib/landing/content.ts';

	let { data, children } = $props();
	const t = useT();
	const locale = useLocale();

	const nav = $derived(
		[
			{ href: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard, show: true },
			{ href: '/members', key: 'nav.members', icon: Users, show: !!data.guild },
			{ href: '/events', key: 'nav.events', icon: CalendarDays, show: !!data.guild },
			{ href: '/leave', key: 'nav.leave', icon: CalendarX, show: !!data.guild },
			{ href: '/auction', key: 'nav.auction', icon: Gavel, show: !!data.guild },
			{ href: '/guild', key: 'nav.guild', icon: Swords, show: !!data.guild },
			{ href: '/audit', key: 'nav.audit', icon: History, show: !!data.guild && data.canReadAudit },
			{ href: '/billing', key: 'nav.billing', icon: CreditCard, show: !!data.guild && (data.isSuper || data.role === 'owner') },
			{ href: '/admin', key: 'nav.admin', icon: ShieldCheck, show: data.isSuper }
		].filter((n) => n.show) as { href: string; key: MessageKey; icon: typeof Users }[]
	);

	const isActive = (href: string) => page.url.pathname.startsWith(href);

	async function switchGuild(e: Event) {
		document.cookie = `guild=${(e.currentTarget as HTMLSelectElement).value}; path=/; max-age=31536000; samesite=lax`;
		await invalidateAll();
	}

	async function signOut() {
		await authClient.signOut();
		// ออกแล้วไปหน้า landing ตามภาษาที่ใช้อยู่ (ภาษาที่ landing ไม่มี → หน้าไทย)
		const l = locale();
		location.href = (langs as string[]).includes(l) ? langPath[l as Lang] : '/';
	}
</script>

{#snippet guildSwitcher()}
	{#if data.guilds.length > 1}
		<select
			value={data.guild?.id}
			onchange={switchGuild}
			class="w-full cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium"
		>
			{#each data.guilds as g (g.id)}
				<option value={g.id}>{g.name}</option>
			{/each}
		</select>
	{:else if data.guild}
		<p class="truncate px-1 text-sm font-semibold">{data.guild.name}</p>
	{/if}
{/snippet}

<div class="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
	<!-- Sidebar (desktop) -->
	<aside class="themed sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-card p-4 lg:flex">
		<a href="/dashboard" class="flex items-center gap-2.5 px-1">
			<span class="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
				<Shield size={18} />
			</span>
			<span class="font-semibold tracking-tight">{t('app.name')}</span>
		</a>

		{@render guildSwitcher()}

		<nav class="flex flex-1 flex-col gap-1">
			{#each nav as n (n.href)}
				<a
					href={n.href}
					aria-current={isActive(n.href) ? 'page' : undefined}
					class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition {isActive(n.href)
						? 'bg-accent text-accent-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
				>
					<n.icon size={17} />
					{t(n.key)}
				</a>
			{/each}
		</nav>

		<div class="space-y-2">
			<LocaleSwitcher class="w-full" />
			<ThemeToggle class="flex w-full" />
			<button class="btn-ghost w-full justify-start" onclick={signOut}>
				<LogOut size={16} />
				{t('common.signOut')}
			</button>
		</div>
	</aside>

	<div class="min-w-0">
		<!-- Top bar (mobile/tablet) -->
		<header
			class="themed sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-card/85 px-4 py-2.5 backdrop-blur lg:hidden"
		>
			<a href="/dashboard" class="flex min-w-0 items-center gap-2">
				<span class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
					<Shield size={16} />
				</span>
				<span class="truncate text-sm font-semibold">{data.guild?.name ?? t('app.name')}</span>
			</a>
			<div class="flex items-center gap-2">
				<LocaleSwitcher />
				<ThemeToggle />
				<button class="btn-ghost btn-sm" onclick={signOut} aria-label={t('common.signOut')}>
					<LogOut size={16} />
				</button>
			</div>
		</header>

		<main class="mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
			{@render children()}
		</main>

		<!-- Bottom nav (mobile/tablet) -->
		<nav
			class="themed fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
			style:grid-template-columns="repeat({nav.length}, minmax(0, 1fr))"
		>
			{#each nav as n (n.href)}
				<a
					href={n.href}
					aria-current={isActive(n.href) ? 'page' : undefined}
					class="flex min-w-0 flex-col items-center gap-0.5 py-2 font-medium transition {nav.length > 6 ? 'text-[10px]' : 'text-[11px]'} {isActive(n.href)
						? 'text-primary'
						: 'text-muted-foreground'}"
				>
					<n.icon size={20} />
					<span class="max-w-full truncate px-0.5">{t(n.key)}</span>
				</a>
			{/each}
		</nav>
	</div>
</div>
