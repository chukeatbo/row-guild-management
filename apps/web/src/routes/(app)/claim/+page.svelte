<script lang="ts">
	import { CircleAlert } from '@lucide/svelte';
	import { useT } from '#lib/i18n/index.ts';

	let { data } = $props();
	const t = useT();
	const MESSAGE = { invalid: 'claim.invalid', expired: 'claim.expired', wrongUser: 'claim.wrongUser' } as const;
</script>

<svelte:head><title>{t('app.name')}</title></svelte:head>

<div class="card animate-pop mx-auto mt-10 max-w-md text-center">
	<div class="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-warning/15 text-warning"><CircleAlert size={24} /></div>
	<p class="font-medium">{t(MESSAGE[data.state])}</p>
	<a href="/dashboard" class="btn-primary mt-6">{t('order.goDashboard')}</a>
</div>
