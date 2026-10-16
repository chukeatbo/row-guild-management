<script lang="ts">
	import { page } from '$app/state';
	import {
		ArrowRight,
		Bot,
		CalendarX,
		Check,
		ChevronDown,
		Gavel,
		Globe,
		Languages,
		LogIn,
		Menu,
		MessageCircle,
		Moon,
		Repeat,
		ShieldCheck,
		Sun,
		Swords,
		Users,
		X
	} from '@lucide/svelte';
	import PartyMock from '#lib/landing/PartyMock.svelte';
	import { content, langLocale, langPath, langs, type FeatureIcon, type Lang } from '#lib/landing/content.ts';
	import { legalPath } from '#lib/landing/legal.ts';
	import { localizePackage, type LandingPackage } from '#lib/landing/packages.ts';
	import { site } from '#lib/landing/site.ts';
	import { saveThemePref } from '#lib/theme.ts';

	let { lang }: { lang: Lang } = $props();
	const c = $derived(content[lang]);

	const ICONS: Record<FeatureIcon, typeof Swords> = {
		swords: Swords,
		calendar: CalendarX,
		repeat: Repeat,
		gavel: Gavel,
		bot: Bot,
		users: Users,
		shield: ShieldCheck,
		globe: Globe
	};

	const contacts = $derived(
		(
			[
				{ key: 'discord', href: site.contact.discord, label: c.contact.discord, cls: 'bg-[#5865f2] text-white hover:bg-[#4752c4]' },
				{ key: 'line', href: site.contact.line, label: c.contact.line, cls: 'bg-[#06c755] text-white hover:bg-[#05a548]' },
				{ key: 'facebook', href: site.contact.facebook, label: c.contact.facebook, cls: 'bg-[#1877f2] text-white hover:bg-[#1465d0]' }
			] as const
		).filter((x) => x.href)
	);

	const fmtPrice = (n: number) => '฿' + n.toLocaleString(langLocale[lang]);

	let menuOpen = $state(false);
	let langOpen = $state(false);
	let dark = $state(false);
	$effect(() => {
		dark = document.documentElement.dataset.theme === 'dark';
	});
	/** ธีมของหน้า landing แยกจากระบบ (cookie `site-theme`, ค่าเริ่มต้น light) — ดู lib/theme.ts */
	const toggleTheme = () => {
		dark = !dark;
		saveThemePref('site', dark ? 'dark' : 'light');
	};

	/** ปุ่มเข้าระบบ / ทดลองใช้ฟรี / ปุ่มแพ็กเกจ: login แล้ว = ไปภาพรวม (/dashboard), ยังไม่ login = ไปหน้า login (Discord) */
	const loggedIn = $derived(!!page.data.user);
	const appHref = $derived(loggedIn ? '/dashboard' : '/login');
	const appLabel = $derived(loggedIn ? c.nav.dashboard : c.nav.login);

	/** แพ็กเกจจาก DB — โหลดใน (marketing)/+layout.server.ts */
	const packages = $derived((page.data.packages ?? []) as LandingPackage[]);
	/** ปุ่มบนการ์ดแพ็กเกจ → /start/<code> (ทดลองใช้: สร้างกิลด์เลย / ต้องจ่าย: ต่อไปหน้า checkout) — ยังไม่ login จะผ่านหน้า login ก่อน */
	const planHref = (p: LandingPackage) => `/start/${p.code}`;

	const navLinks = $derived([
		{ href: '#features', label: c.nav.features },
		{ href: '#pricing', label: c.nav.pricing },
		{ href: '#faq', label: c.nav.faq },
		{ href: '#contact', label: c.nav.contact }
	]);
	const year = new Date().getFullYear();
</script>

<svelte:head>
	<title>{c.meta.title}</title>
	<meta name="description" content={c.meta.description} />
	<link rel="canonical" href={site.url + langPath[lang]} />
	{#each langs as l (l)}
		<link rel="alternate" hreflang={l} href={site.url + langPath[l]} />
	{/each}
	<meta property="og:type" content="website" />
	<meta property="og:title" content={c.meta.title} />
	<meta property="og:description" content={c.meta.description} />
	<meta property="og:url" content={site.url + langPath[lang]} />
</svelte:head>

<div class="landing">
<!-- Nav -->
<header class="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
	<nav class="lp-container-page flex h-16 items-center gap-4">
		<a href={langPath[lang]} class="flex items-center gap-2 font-bold tracking-tight">
			<img src="/favicon.svg" alt="" class="size-8" />
			<span class="truncate">{site.name}</span>
		</a>
		<div class="ml-auto hidden items-center gap-1 md:flex">
			{#each navLinks as l (l.href)}
				<a href={l.href} class="lp-btn-ghost text-base">{l.label}</a>
			{/each}
		</div>
		<div class="ml-auto flex items-center gap-1 md:ml-2">
			<details class="relative" bind:open={langOpen}>
				<summary class="lp-btn-ghost cursor-pointer list-none [&::-webkit-details-marker]:hidden" aria-label={c.langName}>
					<Languages size={18} /><span class="text-sm font-semibold uppercase">{lang}</span>
				</summary>
				<div class="absolute right-0 z-50 mt-2 min-w-44 rounded-xl border border-border bg-background p-1 shadow-lg">
					{#each langs as l (l)}
						<a
							href={langPath[l]}
							hreflang={l}
							data-sveltekit-reload
							lang={l}
							class="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
							class:font-semibold={l === lang}
							aria-current={l === lang ? 'page' : undefined}
							onclick={() => (langOpen = false)}
						>
							{content[l].langName}
							{#if l === lang}<Check size={14} class="text-primary" />{/if}
						</a>
					{/each}
				</div>
			</details>
			<button class="lp-btn-ghost" onclick={toggleTheme} aria-label={dark ? c.theme.light : c.theme.dark}>
				{#if dark}<Sun size={16} />{:else}<Moon size={16} />{/if}
			</button>
			<a href={appHref} class="lp-btn-secondary hidden px-4 sm:inline-flex"><LogIn size={15} />{appLabel}</a>
			<button class="lp-btn-ghost md:hidden" onclick={() => (menuOpen = !menuOpen)} aria-label="Menu" aria-expanded={menuOpen}>
				{#if menuOpen}<X size={18} />{:else}<Menu size={18} />{/if}
			</button>
		</div>
	</nav>
	{#if menuOpen}
		<div class="border-t border-border px-4 py-2 md:hidden">
			{#each navLinks as l (l.href)}
				<a href={l.href} class="block rounded-lg px-3 py-2.5 font-medium hover:bg-muted" onclick={() => (menuOpen = false)}>{l.label}</a>
			{/each}
			<a href={appHref} class="block rounded-lg px-3 py-2.5 font-medium text-primary hover:bg-muted">{appLabel}</a>
		</div>
	{/if}
</header>

<main>
	<!-- Hero -->
	<section class="relative overflow-hidden">
		<div
			class="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[36rem] max-w-7xl rounded-full blur-3xl"
			style="background: radial-gradient(closest-side, var(--glow), transparent)"
		></div>
		<div class="lp-container-page grid items-center gap-12 pt-16 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-24 xl:gap-16 2xl:pt-32 2xl:pb-28">
			<div>
				<span class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
					<span class="size-1.5 rounded-full bg-success"></span>{c.hero.badge}
				</span>
				<h1 class="mt-5 text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl 2xl:text-6xl">
					{c.hero.title}<br /><span class="text-primary">{c.hero.highlight}</span>
				</h1>
				<p class="mt-6 max-w-xl text-base text-pretty text-muted-foreground 2xl:max-w-2xl 2xl:text-lg">{c.hero.lead}</p>
				<div class="mt-8 flex flex-wrap gap-3">
					<a href={appHref} class="lp-btn-primary px-6 py-3 text-base">
						{c.hero.cta}<ArrowRight size={17} />
					</a>
					<a href="#features" class="lp-btn-secondary px-6 py-3 text-base">{c.hero.ctaSecondary}</a>
				</div>
				<ul class="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
					{#each c.hero.points as p (p)}
						<li class="flex items-center gap-1.5"><Check size={15} class="text-success" />{p}</li>
					{/each}
				</ul>
			</div>
			<PartyMock c={c.mock} />
		</div>
	</section>

	<!-- Features -->
	<section id="features" class="border-y border-border bg-card/50">
		<div class="lp-section">
			<p class="lp-eyebrow">{c.features.eyebrow}</p>
			<h2 class="lp-section-title">{c.features.title}</h2>
			<p class="lp-section-lead">{c.features.lead}</p>
			<div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:gap-6">
				{#each c.features.items as f (f.title)}
					{@const Icon = ICONS[f.icon]}
					<article class="lp-card p-6 transition hover:-translate-y-0.5 hover:shadow-pop">
						<span class="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground"><Icon size={21} /></span>
						<h3 class="mt-4 font-semibold">{f.title}</h3>
						<p class="mt-2 text-sm text-muted-foreground">{f.body}</p>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<!-- Steps -->
	<section class="lp-section">
		<p class="lp-eyebrow">{c.steps.eyebrow}</p>
		<h2 class="lp-section-title">{c.steps.title}</h2>
		<ol class="mt-12 grid gap-4 md:grid-cols-3 xl:gap-6">
			{#each c.steps.items as s, i (s.title)}
				<li class="lp-card relative p-6">
					<span class="grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
					<h3 class="mt-4 font-semibold">{s.title}</h3>
					<p class="mt-2 text-sm text-muted-foreground">{s.body}</p>
				</li>
			{/each}
		</ol>
	</section>

	<!-- Pricing -->
	<section id="pricing" class="border-y border-border bg-card/50">
		<div class="lp-section">
			<div class="text-center">
				<p class="lp-eyebrow">{c.pricing.eyebrow}</p>
				<h2 class="lp-section-title">{c.pricing.title}</h2>
				<p class="lp-section-lead mx-auto">{c.pricing.lead}</p>
			</div>
			{#if packages.length === 0}
				<p class="mx-auto mt-12 max-w-md text-center text-muted-foreground">{c.pricing.empty}</p>
			{/if}
			<!-- แพ็กเกจจาก DB (ตาราง packages) — ไม่ hardcode ราคาในหน้า -->
			<div
				class="mx-auto mt-12 grid gap-4 xl:gap-6 {packages.length >= 3
					? 'max-w-6xl md:grid-cols-3'
					: packages.length === 2
						? 'max-w-4xl md:grid-cols-2'
						: 'max-w-md'}"
			>
				{#each packages as p (p.code)}
					{@const t = localizePackage(p, lang)}
					<div class="lp-card relative flex flex-col p-6 {p.isFeatured ? 'border-primary ring-2 ring-primary/30 md:-my-3 md:py-9' : ''}">
						{#if p.isFeatured}
							<span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
								{c.pricing.popular}
							</span>
						{/if}
						<h3 class="text-lg font-semibold">{t.name}</h3>
						<p class="mt-1 text-sm text-muted-foreground">{t.description}</p>
						<p class="mt-5 flex items-baseline gap-1">
							{#if p.priceSatang === 0}
								<span class="text-4xl font-extrabold tracking-tight">{c.pricing.free}</span>
							{:else}
								<span class="text-4xl font-extrabold tracking-tight">{fmtPrice(p.priceSatang / 100)}</span>
								{#if p.durationDays}
									<span class="text-sm text-muted-foreground"
										>{p.durationDays === 30 ? c.pricing.perMonth : c.pricing.perDays.replace('{n}', String(p.durationDays))}</span
									>
								{/if}
							{/if}
						</p>
						<ul class="mt-6 flex-1 space-y-2.5 text-sm">
							{#each t.features as f (f)}
								<li class="flex gap-2"><Check size={16} class="mt-0.5 shrink-0 text-success" />{f}</li>
							{/each}
						</ul>
						<a href={planHref(p)} class="{p.isFeatured ? 'lp-btn-primary' : 'lp-btn-secondary'} mt-8 w-full"
							>{p.isTrial ? c.pricing.ctaTrial : c.pricing.ctaBuy}</a
						>
					</div>
				{/each}
			</div>
			<p class="mt-8 text-center text-sm text-muted-foreground">{c.pricing.note}</p>
		</div>
	</section>

	<!-- FAQ -->
	<section id="faq" class="lp-section">
		<div class="grid gap-10 lg:grid-cols-[1fr_2fr]">
			<div>
				<p class="lp-eyebrow">{c.faq.eyebrow}</p>
				<h2 class="lp-section-title">{c.faq.title}</h2>
			</div>
			<div class="divide-y divide-border rounded-card border border-border bg-card">
				{#each c.faq.items as f (f.q)}
					<details class="group px-5 py-4">
						<summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
							{f.q}<ChevronDown size={18} class="shrink-0 text-muted-foreground transition group-open:rotate-180" />
						</summary>
						<p class="mt-3 text-sm text-muted-foreground">{f.a}</p>
					</details>
				{/each}
			</div>
		</div>
	</section>

	<!-- Contact -->
	<section id="contact" class="lp-container-page pb-20 2xl:pb-28">
		<div class="overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-pop sm:px-12">
			<MessageCircle size={36} class="mx-auto opacity-90" />
			<h2 class="mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{c.contact.title}</h2>
			<p class="mx-auto mt-4 max-w-xl text-lg opacity-85">{c.contact.lead}</p>
			<div class="mt-8 flex flex-wrap justify-center gap-3">
				{#each contacts as x (x.key)}
					<a href={x.href} target="_blank" rel="noopener" class="lp-btn-primary px-6 py-3 text-base shadow-pop {x.cls}">{x.label}</a>
				{/each}
			</div>
		</div>
	</section>
</main>

<footer class="border-t border-border">
	<div class="lp-container-page flex flex-col gap-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
		<div class="space-y-2">
			<p>© {year} {site.name} · {c.footer.rights}</p>
			<p class="flex flex-wrap gap-x-4 gap-y-1">
				<a href={legalPath(lang, 'terms')} class="hover:text-foreground">{c.footer.terms}</a>
				<a href={legalPath(lang, 'privacy')} class="hover:text-foreground">{c.footer.privacy}</a>
				<a href="{legalPath(lang, 'terms')}#refund" class="hover:text-foreground">{c.footer.refund}</a>
			</p>
		</div>
		<p class="max-w-xl text-xs md:text-right">{c.footer.disclaimer}</p>
	</div>
</footer>
</div>
