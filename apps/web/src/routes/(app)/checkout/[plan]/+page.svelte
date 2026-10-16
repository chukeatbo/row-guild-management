<script lang="ts">
	import { enhance } from '$app/forms';
	import { CreditCard, Lock, QrCode, Landmark, Wallet } from '@lucide/svelte';
	import { formatDateTime } from '#lib/datetime.ts';
	import { useLocale, useT, type MessageKey } from '#lib/i18n/index.ts';
	import { methodGroup, methodLabel } from '#lib/payment-methods.ts';
	import { useTimezone } from '#lib/timezone.ts';

	let { data } = $props();
	const t = useT();
	const locale = useLocale();
	const tz = useTimezone();

	const planName = $derived(data.plan.translations?.[locale()]?.name || data.plan.name);
	const price = $derived('฿' + (data.plan.priceSatang / 100).toLocaleString(locale() === 'th' ? 'th-TH' : 'en-US'));
	const GROUP_ICON = { card: CreditCard, qr: QrCode, bank: Landmark, wallet: Wallet } as const;

	// svelte-ignore state_referenced_locally — ค่าเริ่มต้นจาก load ครั้งเดียว ผู้ใช้แก้ต่อเอง
	let target = $state(data.target);
	// svelte-ignore state_referenced_locally
	let email = $state(data.email);
	// svelte-ignore state_referenced_locally
	let method = $state(data.methods[0] ?? '');
	/** กันกดซ้ำ: key เดียวต่อการเปิดหน้านี้ (ลองจ่ายใหม่ = ออเดอร์เดิม) */
	const idem = crypto.randomUUID();

	let card = $state({ name: '', number: '', expiry: '', cvc: '' });
	let error = $state<string | null>(null);
	let busy = $state(false);

	type OmiseJs = {
		setPublicKey: (k: string) => void;
		createToken: (type: 'card', card: Record<string, string>, cb: (status: number, res: { id?: string; message?: string }) => void) => void;
	};
	let omisePromise: Promise<OmiseJs> | null = null;
	/** โหลด Omise.js เฉพาะตอนจ่ายด้วยบัตร (ใช้ public key แปลงบัตรเป็น token ในเบราว์เซอร์) */
	function loadOmise(): Promise<OmiseJs> {
		omisePromise ??= new Promise((resolve, reject) => {
			const w = window as unknown as { Omise?: OmiseJs };
			if (w.Omise) return resolve(w.Omise);
			const s = document.createElement('script');
			s.src = 'https://cdn.omise.co/omise.js';
			s.onload = () => (w.Omise ? resolve(w.Omise) : reject(new Error('omise.js')));
			s.onerror = () => {
				omisePromise = null;
				reject(new Error('omise.js'));
			};
			document.head.appendChild(s);
		});
		return omisePromise;
	}

	async function tokenizeCard(): Promise<string> {
		const Omise = await loadOmise();
		Omise.setPublicKey(data.publicKey);
		const [mm, yy] = card.expiry.split('/').map((v) => v.trim());
		return new Promise((resolve, reject) =>
			Omise.createToken(
				'card',
				{
					name: card.name,
					number: card.number.replace(/\s+/g, ''),
					expiration_month: mm ?? '',
					expiration_year: yy && yy.length === 2 ? '20' + yy : (yy ?? ''),
					security_code: card.cvc
				},
				(status, res) => (status === 200 && res.id ? resolve(res.id) : reject(new Error(res.message ?? 'card')))
			)
		);
	}

	const fmtExpiry = (v: string) => {
		const d = v.replace(/\D/g, '').slice(0, 4);
		return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
	};
	const fmtNumber = (v: string) =>
		v
			.replace(/\D/g, '')
			.slice(0, 19)
			.replace(/(.{4})/g, '$1 ')
			.trim();
</script>

<svelte:head><title>{t('checkout.title')} · {t('app.name')}</title></svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">{t('checkout.title')}</h1>

<form
	method="POST"
	action="?/pay"
	class="mt-6 grid gap-5 lg:grid-cols-[1fr_22rem]"
	use:enhance={async ({ formData, cancel }) => {
		error = null;
		busy = true;
		if (method === 'card') {
			try {
				formData.set('cardToken', await tokenizeCard());
			} catch {
				error = 'error.cardInvalid';
				busy = false;
				cancel();
				return;
			}
		}
		return async ({ result, update }) => {
			if (result.type === 'success' && typeof result.data?.redirectTo === 'string') {
				location.href = result.data.redirectTo; // ไปหน้าธนาคาร / 3DS
				return;
			}
			if (result.type === 'failure') error = (result.data?.error as string) ?? 'error.generic';
			await update({ reset: false, invalidateAll: false });
			busy = false;
		};
	}}
>
	<div class="space-y-5">
		<!-- ใช้กับกิลด์ไหน -->
		<section class="card space-y-3">
			<h2 class="font-semibold">{t('checkout.forGuild')}</h2>
			<label class="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 {target === 'new' ? 'border-primary bg-primary/5' : 'border-border'}">
				<input type="radio" name="target" value="new" bind:group={target} class="accent-primary" />
				<span class="text-sm font-medium">{t('checkout.newGuild')}</span>
			</label>
			{#each data.owned as g (g.id)}
				<label class="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 {target === g.id ? 'border-primary bg-primary/5' : 'border-border'}">
					<input type="radio" name="target" value={g.id} bind:group={target} class="accent-primary" />
					<span class="min-w-0 flex-1 truncate text-sm font-medium">{t('checkout.renewGuild', { name: g.name })}</span>
					<span class="shrink-0 text-xs {g.state === 'expired' ? 'text-danger' : 'text-muted-foreground'}">
						{g.state === 'expired' || !g.endsAt ? t('billing.statusExpired') : t('billing.statusActive', { date: formatDateTime(g.endsAt, locale(), tz()) })}
					</span>
				</label>
			{/each}
		</section>

		<!-- อีเมลรับใบเสร็จ (บังคับ) -->
		<section class="card">
			<label class="label" for="email">{t('checkout.email')}</label>
			<input id="email" name="email" type="email" class="input" required maxlength="200" autocomplete="email" bind:value={email} />
			<p class="mt-1.5 text-xs text-muted-foreground">{t('checkout.emailHint')}</p>
		</section>

		<!-- ช่องทางชำระเงิน -->
		<section class="card space-y-3">
			<h2 class="font-semibold">{t('checkout.method')}</h2>
			{#if data.methods.length === 0}
				<p class="text-sm text-muted-foreground">{t('checkout.noMethods')}</p>
			{:else}
				<div class="grid gap-2 sm:grid-cols-2">
					{#each data.methods as m (m)}
						{@const Icon = GROUP_ICON[methodGroup(m)]}
						<label
							class="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm {method === m ? 'border-primary bg-primary/5 font-medium' : 'border-border'}"
						>
							<input type="radio" name="method" value={m} bind:group={method} class="accent-primary" />
							<Icon size={16} class="shrink-0 text-muted-foreground" />
							<span class="truncate">{m === 'card' ? t('checkout.card.label') : methodLabel(m)}</span>
						</label>
					{/each}
				</div>
			{/if}

			{#if method === 'card'}
				<!-- ไม่มี name: ข้อมูลบัตรไม่ถูกส่งมาที่เซิร์ฟเวอร์เรา (Omise.js แปลงเป็น token ก่อน) -->
				<div class="grid gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-2">
					<div class="sm:col-span-2">
						<label class="label" for="cc-name">{t('checkout.card.name')}</label>
						<input id="cc-name" class="input" autocomplete="cc-name" required bind:value={card.name} />
					</div>
					<div class="sm:col-span-2">
						<label class="label" for="cc-number">{t('checkout.card.number')}</label>
						<input
							id="cc-number"
							class="input font-mono"
							inputmode="numeric"
							autocomplete="cc-number"
							required
							value={card.number}
							oninput={(e) => (card.number = e.currentTarget.value = fmtNumber(e.currentTarget.value))}
						/>
					</div>
					<div>
						<label class="label" for="cc-exp">{t('checkout.card.expiry')}</label>
						<input
							id="cc-exp"
							class="input font-mono"
							inputmode="numeric"
							autocomplete="cc-exp"
							placeholder="MM/YY"
							required
							value={card.expiry}
							oninput={(e) => (card.expiry = e.currentTarget.value = fmtExpiry(e.currentTarget.value))}
						/>
					</div>
					<div>
						<label class="label" for="cc-cvc">{t('checkout.card.cvc')}</label>
						<input id="cc-cvc" class="input font-mono" inputmode="numeric" autocomplete="cc-csc" maxlength="4" required bind:value={card.cvc} />
					</div>
					<p class="flex items-center gap-1.5 text-xs text-muted-foreground sm:col-span-2"><Lock size={12} />{t('checkout.card.secure')}</p>
				</div>
			{/if}
		</section>
	</div>

	<!-- สรุป -->
	<aside class="card h-fit space-y-4 lg:sticky lg:top-6">
		<h2 class="font-semibold">{t('checkout.summary')}</h2>
		<div>
			<p class="text-lg font-semibold">{planName}</p>
			{#if data.plan.durationDays}<p class="text-sm text-muted-foreground">{t('checkout.duration', { days: data.plan.durationDays })}</p>{/if}
		</div>
		<div class="flex items-baseline justify-between border-t border-border pt-4">
			<span class="text-sm text-muted-foreground">{t('checkout.total')}</span>
			<span class="text-2xl font-bold">{price}</span>
		</div>
		<input type="hidden" name="idem" value={idem} />
		{#if error}
			<p class="animate-pop rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{t(error as MessageKey)}</p>
		{/if}
		<button class="btn-primary w-full py-3 text-base" disabled={busy || !method || data.methods.length === 0}>
			{busy ? t('checkout.processing') : t('checkout.pay', { amount: price })}
		</button>
	</aside>
</form>
