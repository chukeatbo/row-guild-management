<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { CircleCheck, CircleX, Clock, LoaderCircle } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import NewGuildForm from '#lib/components/NewGuildForm.svelte';
	import { formatDateTime } from '#lib/datetime.ts';
	import { useLocale, useT } from '#lib/i18n/index.ts';
	import { methodLabel } from '#lib/payment-methods.ts';
	import { useTimezone } from '#lib/timezone.ts';

	let { data } = $props();
	const t = useT();
	const locale = useLocale();
	const tz = useTimezone();

	const o = $derived(data.order);
	const p = $derived(data.payment);
	const price = $derived('฿' + (o.amountSatang / 100).toLocaleString(locale() === 'th' ? 'th-TH' : 'en-US'));

	// รอจ่าย → ถามสถานะใหม่ทุก 3 วินาที (server ดึง charge ล่าสุดจาก Omise ให้)
	onMount(() => {
		const timer = setInterval(() => {
			if (data.order.status === 'pending') invalidateAll();
		}, 3000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head><title>{t('order.title')} · {t('app.name')}</title></svelte:head>

<div class="card animate-pop mx-auto mt-10 max-w-md text-center">
	<p class="text-xs text-muted-foreground">{t('order.no', { no: o.orderNo })} · {o.packageName} · {price}</p>

	{#if o.status === 'pending'}
		{#if p?.qr}
			<h1 class="mt-3 text-xl font-semibold">{t('order.pending')}</h1>
			<img src={p.qr} alt="QR" class="mx-auto mt-4 aspect-square w-64 rounded-lg bg-white p-2" />
			<p class="mt-3 text-sm text-muted-foreground">{t('order.scanQr')}</p>
			<p class="mt-1 text-xs text-muted-foreground">{methodLabel(p.method)}{#if p.expiresAt} · <Clock size={11} class="inline" /> {formatDateTime(p.expiresAt, locale(), tz())}{/if}</p>
		{:else}
			<LoaderCircle size={36} class="mx-auto mt-4 animate-spin text-primary" />
			<h1 class="mt-3 text-xl font-semibold">{t('order.waiting')}</h1>
			{#if p?.authorizeUri}<a href={p.authorizeUri} class="btn-secondary mt-4">{methodLabel(p.method)}</a>{/if}
		{/if}
	{:else if o.status === 'paid'}
		<CircleCheck size={40} class="mx-auto mt-4 text-success" />
		<h1 class="mt-3 text-xl font-semibold">{t('order.paid')}</h1>
		{#if o.email}<p class="mt-1 text-sm text-muted-foreground">{t('order.emailSent', { email: o.email })}</p>{/if}
		{#if o.needsGuild}
			<p class="mt-5 mb-4 text-sm">{t('order.paidCreate')}</p>
			<NewGuildForm action="?/claim" />
		{:else}
			{#if o.isRenew && o.guildEndsAt}<p class="mt-3 font-medium">{t('order.paidRenew', { date: formatDateTime(o.guildEndsAt, locale(), tz()) })}</p>{/if}
			<a href="/dashboard" class="btn-primary mt-6 w-full">{t('order.goDashboard')}</a>
		{/if}
	{:else}
		<CircleX size={40} class="mx-auto mt-4 text-danger" />
		<h1 class="mt-3 text-xl font-semibold">{o.status === 'expired' ? t('order.expired') : t('order.failed')}</h1>
		{#if p?.failure}<p class="mt-1 text-sm text-muted-foreground">{p.failure}</p>{/if}
		<a href="/checkout/{o.packageCode}" class="btn-primary mt-6 w-full">{t('order.tryAgain')}</a>
	{/if}
</div>
