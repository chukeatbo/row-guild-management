import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

// .env อยู่ที่ root ของ monorepo และ @row/* อ่านผ่าน process.env
export default defineConfig(({ mode }) => {
	Object.assign(process.env, loadEnv(mode, '../..', ''));

	return {
		// dev: ให้ Omise ยิง webhook เข้ามาผ่าน ngrok ได้ (ดู docs/SETUP.md) — โดเมนขึ้นต้นด้วย . = ทุก subdomain
		server: { allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.app'] },
		plugins: [
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter()
			})
		]
	};
});
