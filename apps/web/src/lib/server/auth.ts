import { getRequestEvent } from '$app/server';
import { createAuth } from '@row/auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { db } from './db.ts';

// sveltekitCookies ต้องอยู่ท้ายสุดของ plugins (createAuth ต่อท้ายให้)
export const auth = createAuth({ db, extraLastPlugins: [sveltekitCookies(getRequestEvent)] });
