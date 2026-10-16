<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';

	let {
		open = $bindable(false),
		title,
		children
	}: { open: boolean; title: string; children: Snippet } = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	onclose={() => (open = false)}
	onclick={(e) => e.target === dialog && (open = false)}
	class="animate-pop m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card border border-border bg-card p-0 text-card-foreground shadow-pop backdrop:bg-black/40 backdrop:backdrop-blur-sm"
>
	<div class="flex items-center justify-between border-b border-border px-5 py-3.5">
		<h2 class="text-base font-semibold">{title}</h2>
		<button class="btn-ghost btn-sm" onclick={() => (open = false)} aria-label="Close" type="button">
			<X size={16} />
		</button>
	</div>
	<div class="max-h-[75vh] overflow-y-auto p-5">
		{@render children()}
	</div>
</dialog>
