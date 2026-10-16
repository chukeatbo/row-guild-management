<script lang="ts">
	import { enhance } from '$app/forms';
	import { Plus } from '@lucide/svelte';
	import { useT, type MessageKey } from '#lib/i18n/index.ts';

	/** ฟอร์มสร้างกิลด์ของผู้ใช้เอง (ชื่อ + เซิร์ฟเวอร์) — ใช้ทั้งทดลองใช้และหลังชำระเงิน */
	let { action = '' }: { action?: string } = $props();
	const t = useT();
	let error = $state<string | null>(null);
	let busy = $state(false);
</script>

<form
	method="POST"
	{action}
	class="space-y-4 text-left"
	use:enhance={() => {
		busy = true;
		error = null;
		return async ({ result, update }) => {
			if (result.type === 'failure') error = (result.data?.error as string) ?? 'error.generic';
			await update({ reset: false });
			busy = false;
		};
	}}
>
	<div>
		<label class="label" for="guild-name">{t('start.guildName')}</label>
		<input id="guild-name" name="name" class="input" maxlength="60" required autocomplete="off" />
	</div>
	<div>
		<label class="label" for="guild-server">{t('start.server')}</label>
		<input id="guild-server" name="server" class="input" maxlength="60" placeholder={t('start.serverPlaceholder')} autocomplete="off" />
	</div>
	{#if error}
		<p class="animate-pop rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{t(error as MessageKey)}</p>
	{/if}
	<button class="btn-primary w-full py-2.5" disabled={busy}><Plus size={16} />{t('start.create')}</button>
</form>
