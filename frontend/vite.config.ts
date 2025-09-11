import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		global: 'globalThis'
	},
	optimizeDeps: {
		include: ['sockjs-client']
	},
	resolve: {
		alias: {
			buffer: 'buffer',
			process: 'process/browser'
		}
	}
});
