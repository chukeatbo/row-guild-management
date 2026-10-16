<script lang="ts">
	import { Check, ChevronDown } from '@lucide/svelte';
	import { tick } from 'svelte';
	import { useT } from '#lib/i18n/index.ts';

	export interface ComboOption {
		value: string;
		label: string;
		/** ข้อความรอง (เช่นชื่ออาชีพ) — ใช้ค้นหาได้ด้วย */
		hint?: string | null;
	}

	/**
	 * dropdown ที่พิมพ์ค้นหาได้ (ใช้แทน <select> เมื่อรายการยาว)
	 * ส่งค่าผ่าน hidden input `name` จึงใช้ในฟอร์ม/form action ได้เหมือน select
	 */
	let {
		options,
		value = $bindable(''),
		name,
		id,
		placeholder = '',
		emptyLabel,
		required = false,
		ariaLabel,
		class: cls = '',
		onchange
	}: {
		options: ComboOption[];
		value?: string;
		name?: string;
		id?: string;
		placeholder?: string;
		/** ถ้าระบุ จะมีตัวเลือกแรก value="" ใช้ล้างค่า */
		emptyLabel?: string;
		required?: boolean;
		ariaLabel?: string;
		class?: string;
		onchange?: (value: string) => void;
	} = $props();

	const t = useT();
	const listId = `cb-${Math.random().toString(36).slice(2, 9)}`;

	let open = $state(false);
	let query = $state('');
	let active = $state(0);
	let input = $state<HTMLInputElement>();
	let list = $state<HTMLUListElement>();

	const all = $derived<ComboOption[]>(emptyLabel !== undefined ? [{ value: '', label: emptyLabel }, ...options] : options);
	const selected = $derived(all.find((o) => o.value === value));
	const shown = $derived(
		open && query.trim()
			? all.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
			: all
	);
	const display = $derived(open ? query : value ? (selected?.label ?? '') : '');

	$effect(() => {
		// ค่าที่เลือกไว้หายจากรายการ (เช่นคนนั้นเข้าคิวไปแล้ว) → ล้างทิ้ง กันส่งค่าเก่า
		if (value && !all.some((o) => o.value === value)) value = '';
	});

	$effect(() => {
		// required: ใช้ validity ของ input ที่มองเห็น (hidden input ไม่ถูกตรวจ)
		input?.setCustomValidity(required && !value ? t('common.required') : '');
	});

	const openList = () => {
		if (open) return;
		open = true;
		query = '';
		active = Math.max(0, all.findIndex((o) => o.value === value));
		scrollActive();
	};

	async function scrollActive() {
		await tick();
		list?.children[active]?.scrollIntoView({ block: 'nearest' });
	}

	async function choose(o: ComboOption) {
		value = o.value;
		open = false;
		query = '';
		await tick();
		onchange?.(o.value);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			if (!open) return openList();
			if (!shown.length) return;
			active = (active + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
			scrollActive();
		} else if (e.key === 'Enter') {
			if (open) {
				e.preventDefault(); // ไม่ให้ Enter ส่งฟอร์มก่อนเลือก
				if (shown[active]) choose(shown[active]);
			}
		} else if (e.key === 'Escape') {
			open = false;
		} else if (e.key === 'Tab') {
			open = false;
		}
	}
</script>

<div class="relative {cls}">
	{#if name}<input type="hidden" {name} {value} />{/if}
	<input
		bind:this={input}
		{id}
		class="input pr-9"
		role="combobox"
		aria-expanded={open}
		aria-controls={listId}
		aria-autocomplete="list"
		aria-label={ariaLabel}
		autocomplete="off"
		placeholder={open ? (selected?.label ?? placeholder) : (emptyLabel && !value ? emptyLabel : placeholder)}
		value={display}
		oninput={(e) => {
			if (!open) open = true;
			query = e.currentTarget.value;
			active = 0;
		}}
		onfocus={openList}
		onclick={openList}
		onblur={() => {
			open = false;
			query = '';
		}}
		onkeydown={onKey}
	/>
	<ChevronDown size={15} class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" />
	{#if open}
		<ul
			bind:this={list}
			id={listId}
			role="listbox"
			class="animate-pop absolute z-30 mt-1 max-h-60 w-full min-w-40 overflow-auto rounded-lg border border-border bg-card p-1 shadow-card"
		>
			{#each shown as o, i (o.value)}
				<!-- mousedown + preventDefault: keep focus on the input until the option is chosen -->
				<li
					role="option"
					aria-selected={o.value === value}
					data-option={o.value}
					class="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm {i === active ? 'bg-muted' : ''}"
					onmousedown={(e) => {
						e.preventDefault();
						choose(o);
					}}
					onmouseenter={() => (active = i)}
				>
					<span class="min-w-0 flex-1 truncate {o.value === '' ? 'text-muted-foreground' : ''}">{o.label}</span>
					{#if o.hint}<span class="shrink-0 text-xs text-muted-foreground">{o.hint}</span>{/if}
					{#if o.value === value && o.value !== ''}<Check size={14} class="shrink-0 text-primary" />{/if}
				</li>
			{:else}
				<li class="px-2.5 py-2 text-sm text-muted-foreground">{t('common.noResults')}</li>
			{/each}
		</ul>
	{/if}
</div>
