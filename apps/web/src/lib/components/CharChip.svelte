<script lang="ts">
	import { Crown } from '@lucide/svelte';
	import type { Role } from '#lib/roles.ts';
	import ClassBadge from './ClassBadge.svelte';
	import RoleIcon from './RoleIcon.svelte';

	let {
		ign,
		className,
		classColor,
		leader = false,
		role = null,
		leave = false,
		draggable = true,
		leaveLabel = ''
	}: {
		ign: string;
		className: string | null;
		classColor: string | null;
		leader?: boolean;
		role?: Role | null;
		leave?: boolean;
		draggable?: boolean;
		leaveLabel?: string;
	} = $props();
</script>

<div
	class="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1 text-sm shadow-card transition {draggable
		? 'cursor-grab active:cursor-grabbing hover:border-primary/50'
		: 'cursor-default'}"
	style:border-left="3px solid {classColor ?? 'var(--border)'}"
>
	{#if role}<RoleIcon {role} size={14} />{/if}
	{#if leader}<Crown size={13} class="shrink-0 text-warning" />{/if}
	<span class="min-w-0 flex-1 truncate font-medium">{ign}</span>
	{#if leave}<span class="rounded bg-warning/15 px-1.5 text-[10px] font-medium text-warning">{leaveLabel}</span>{/if}
	{#if className}<ClassBadge name={className} color={classColor} />{/if}
</div>
