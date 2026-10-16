<script lang="ts">
	import { Gavel } from '@lucide/svelte';
	import ClassBadge from '#lib/components/ClassBadge.svelte';
	import { useT } from '#lib/i18n/index.ts';

	let { data } = $props();
	const t = useT();
</script>

<svelte:head>
	<title>{t('auction.title')}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main id="render-root" class="mx-auto w-[1200px] bg-background p-8 text-foreground">
	<h1 class="border-b border-border pb-4 text-3xl font-bold tracking-tight">{t('auction.title')}</h1>
	<div class="mt-5 grid grid-cols-3 gap-4">
		{#each data.queues as q (q.id)}
			<section class="card space-y-2 p-4" data-queue={q.itemName}>
				<h2 class="flex items-center gap-2 text-lg font-semibold"><Gavel size={18} class="text-primary" />{q.itemName}</h2>
				<p class="text-sm text-muted-foreground">{t('auction.inQueue', { n: q.entries.length })}</p>
				{#each q.entries as e, i (e.id)}
					<div class="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1 text-sm">
						<span class="grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold {i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">{i + 1}</span>
						<span class="min-w-0 flex-1 truncate font-medium">{e.ign}</span>
						{#if e.className}<ClassBadge name={e.className} color={e.classColor} />{/if}
					</div>
				{:else}
					<p class="py-3 text-center text-sm text-muted-foreground">—</p>
				{/each}
			</section>
		{:else}
			<p class="col-span-3 py-10 text-center text-muted-foreground">{t('auction.empty')}</p>
		{/each}
	</div>
</main>
