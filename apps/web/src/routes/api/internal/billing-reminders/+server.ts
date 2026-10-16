import { error, json } from '@sveltejs/kit';
import { runBillingReminders } from '#lib/server/billing-reminders.ts';
import { isInternalCall } from '#lib/server/render.ts';
import type { RequestHandler } from './$types';

/** bot เรียกทุกนาที: เตือนแพ็กเกจใกล้หมดอายุ (3 วัน / 1 วัน) ทางอีเมล + Discord */
export const POST: RequestHandler = async ({ request }) => {
	if (!isInternalCall(request)) error(403, 'forbidden');
	return json(await runBillingReminders());
};
