import type { auth } from '#lib/server/auth.ts';
import type { Locale } from '#lib/i18n/index.ts';

type Session = typeof auth.$Infer.Session;

declare global {
	namespace App {
		interface Locals {
			session: Session['session'] | null;
			user: Session['user'] | null;
			locale: Locale;
			/** IANA timezone ของเครื่องผู้ใช้ (จาก cookie tz) */
			tz: string;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
