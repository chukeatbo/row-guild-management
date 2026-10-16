<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { deviceTimeZone, isValidTimeZone } from '#lib/datetime.ts';
	import { htmlLang, provideLocale } from '#lib/i18n/index.ts';
	import { landingLangFromPath, langs } from '#lib/landing/content.ts';
	import { applyTheme, readThemePref, themeScope } from '#lib/theme.ts';
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

	// sync ภาษา landing → ระบบ: เปิดหน้า landing/กฎหมายภาษาไหน ตั้ง cookie `locale` เป็นภาษานั้น เข้าระบบต่อจะได้ภาษาเดียวกัน
	// ยกเว้นหน้าไทย (`/`) ที่ cookie เป็นภาษาที่ landing ไม่มี (ตอนนี้ landing มีครบทุกภาษาของระบบแล้ว — กันไว้เผื่อเพิ่มภาษาใหม่) — ไม่ทับ เพราะ `/` เป็นหน้าเริ่มต้นไม่ใช่การเลือกภาษา
	$effect(() => {
		const lang = landingLangFromPath(page.url.pathname);
		if (!lang) return;
		const current = document.cookie.match(/(?:^|; )locale=([^;]*)/)?.[1];
		if (current === lang) return;
		if (lang === 'th' && current && !(langs as string[]).includes(current)) return;
		document.cookie = `locale=${lang}; path=/; max-age=31536000; samesite=lax`;
	});

	// ธีมแยกฝั่ง landing / ระบบ: SSR + app.html ตั้งให้หน้าแรกแล้ว; effect นี้ตามเมื่อเดินข้ามฝั่งแบบ client-side (เช่น landing → /dashboard)
	const scope = $derived(themeScope(page.url.pathname));
	$effect(() => {
		document.documentElement.dataset.themeScope = scope;
		applyTheme(readThemePref(scope));
	});
	// ตั้งเป็น system แล้วเครื่องเปลี่ยนโหมด → เปลี่ยนตาม
	onMount(() => {
		const mq = matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => {
			const s = themeScope(location.pathname);
			if (readThemePref(s) === 'system') applyTheme('system');
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});
</script>

{@render children()}
