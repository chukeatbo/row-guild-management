import { getContext, setContext } from 'svelte';

const KEY = Symbol('timezone');

/** root layout ให้ getter ของโซนเวลาที่ใช้แสดงผล (reactive: เปลี่ยนเมื่อไคลเอนต์ตรวจพบโซนของเครื่อง) */
export const provideTimezone = (get: () => string) => setContext(KEY, get);
export const useTimezone = () => getContext<() => string>(KEY);
