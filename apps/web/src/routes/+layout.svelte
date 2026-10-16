<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { deviceTimeZone, isValidTimeZone } from '#lib/datetime.ts';
	import { htmlLang, provideLocale } from '#lib/i18n/index.ts';
	import { provideTimezone } from '#lib/timezone.ts';

	let { data, children } = $props();
	provideLocale(() => data.locale);

	// โซนเวลาที่ใช้แสดงผล: เริ่มจากค่า cookie (SSR) แล้วปรับเป็นโซนของเครื่องจริงเมื่อโหลดบน client
	// svelte-ignore state_referenced_locally — ตั้งใจใช้ค่า cookie เป็นค่าเริ่มต้นครั้งเดียว แล้วให้ onMount ปรับ
	let tz = $state(data.tz);
	provideTimezone(() => tz);
	onMount(() => {
		const device = deviceTimeZone();
		if (!isValidTimeZone(device)) return;
		tz = device;
		if (device !== data.tz)
			document.cookie = `tz=${encodeURIComponent(device)}; path=/; max-age=31536000; samesite=lax`;
	});

	// SSR ตั้ง lang ให้แล้ว; effect นี้ทำให้ตรงเมื่อสลับภาษาฝั่ง client
	$effect(() => {
		document.documentElement.lang = htmlLang(data.locale);
	});
</script>

{@render children()}
