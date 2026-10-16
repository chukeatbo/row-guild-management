import { ac, roles } from '@row/auth/permissions';
import { adminClient, organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	plugins: [adminClient(), organizationClient({ ac, roles })]
});
