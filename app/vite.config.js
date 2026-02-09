import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/icon.svg'],
            manifest: {
                name: 'Heal Meat Counseling Ledger',
                short_name: 'Heal Meat',
                description: 'Counseling client, session, and payment tracker.',
                theme_color: '#14532d',
                background_color: '#f7f7f2',
                display: 'standalone',
                icons: [
                    {
                        src: '/icons/icon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
            },
        }),
    ],
});
