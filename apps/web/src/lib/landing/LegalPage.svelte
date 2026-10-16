<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { langPath } from '#lib/landing/content.ts';
	import { legalDocs, legalPath, legalUi, type LegalDocId, type LegalLang } from '#lib/landing/legal.ts';
	import { site } from '#lib/landing/site.ts';

	let { lang, doc }: { lang: LegalLang; doc: LegalDocId } = $props();
	const d = $derived(legalDocs[doc][lang]);
	const ui = $derived(legalUi[lang]);
	const effective = $derived(
		new Date(site.legal.effectiveDate + 'T00:00:00').toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);
	const year = new Date().getFullYear();
</script>

<svelte:head>
	<title>{d.title} — {site.name}</title>
	<meta name="description" content={d.intro} />
	<link rel="canonical" href={site.url + legalPath(lang, doc)} />
	<link rel="alternate" hreflang="th" href={site.url + legalPath('th', doc)} />
	<link rel="alternate" hreflang="en" href={site.url + legalPath('en', doc)} />
</svelte:head>

<div class="landing">
<header class="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
	<nav class="lp-container-page flex h-16 items-center gap-4">
		<a href={langPath[lang]} class="flex items-center gap-2 font-bold tracking-tight">
			<img src="/favicon.svg" alt="" class="size-8" />
			<span class="truncate">{site.name}</span>
		</a>
		<a href={langPath[lang]} class="lp-btn-ghost ml-auto"><ArrowLeft size={16} />{ui.back}</a>
	</nav>
</header>

<main class="lp-container-page py-12 sm:py-16">
	<div class="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[15rem_1fr]">
		<aside class="hidden lg:block">
			<nav class="sticky top-24 text-sm">
				<p class="mb-3 font-semibold">{ui.contents}</p>
				<ol class="space-y-1.5 text-muted-foreground">
					{#each d.sections as s, i (s.id)}
						<li><a href="#{s.id}" class="hover:text-foreground">{i + 1}. {s.heading}</a></li>
					{/each}
				</ol>
			</nav>
		</aside>

		<article class="min-w-0">
			<h1 class="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{d.title}</h1>
			<p class="mt-2 text-sm text-muted-foreground">{ui.updated} {effective}</p>
			<p class="mt-6 text-pretty">{d.intro}</p>

			{#each d.sections as s, i (s.id)}
				<section id={s.id} class="mt-10">
					<h2 class="text-xl font-semibold">{i + 1}. {s.heading}</h2>
					{#each s.body as b, j (j)}
						{#if typeof b === 'string'}
							<p class="mt-3 text-pretty text-muted-foreground">{b}</p>
						{:else}
							<ul class="mt-3 list-disc space-y-1.5 pl-6 text-muted-foreground marker:text-primary">
								{#each b as item, k (k)}<li>{item}</li>{/each}
							</ul>
						{/if}
					{/each}
				</section>
			{/each}
		</article>
	</div>
</main>

<footer class="border-t border-border">
	<div class="lp-container-page flex flex-col gap-3 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
		<p>© {year} {site.name}</p>
		<p class="flex gap-4">
			<a href={legalPath(lang, 'terms')} class="hover:text-foreground">{ui.terms}</a>
			<a href={legalPath(lang, 'privacy')} class="hover:text-foreground">{ui.privacy}</a>
		</p>
	</div>
</footer>
</div>
