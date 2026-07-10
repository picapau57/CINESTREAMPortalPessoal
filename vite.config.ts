import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      legacy({
        targets: ['chrome >= 49', 'safari >= 10', 'firefox >= 45', 'not IE 11'],
      }),
      {
        name: 'legacy-tv-postprocess',
        enforce: 'post',
        generateBundle(options, bundle) {
          for (const fileName in bundle) {
            if (fileName.endsWith('.css')) {
              const asset = bundle[fileName];
              if (asset.type === 'asset' && typeof asset.source === 'string') {
                console.log('legacy-tv-postprocess: Cleaning up CSS file:', fileName);
                // Strip all instances of :not(#\#), :not(#\\#), etc.
                const cleanSource = asset.source.replace(/:not\(\s*#[^)]*\)/g, '');
                asset.source = cleanSource;
              }
            }
          }
        },
        transformIndexHtml(html) {
          // Only modify during production build when legacy plugin has inserted scripts
          if (!html.includes('legacy') && !html.includes('nomodule')) {
            return html;
          }

          // Extract URLs for polyfills-legacy and index-legacy
          const polyfillMatch = html.match(/src="([^"]+polyfills-legacy-[^"]+\.js)"/);
          const entryMatch = html.match(/(?:data-src|src)="([^"]+index-legacy-[^"]+\.js)"/);

          if (!polyfillMatch || !entryMatch) {
            console.warn('legacy-tv-postprocess: Could not extract legacy scripts. Skipping postprocessing.');
            return html;
          }

          const polyfillUrl = polyfillMatch[1];
          const entryUrl = entryMatch[1];

          console.log('legacy-tv-postprocess: Extracted polyfill URL:', polyfillUrl);
          console.log('legacy-tv-postprocess: Extracted entry URL:', entryUrl);

          // Reconstruct the index.html: Completely remove modern module scripts, inline detectors, and link preloads
          let cleanHtml = html;
          
          // 1. Remove all modulepreload link tags
          cleanHtml = cleanHtml.replace(/<link rel="modulepreload"[^>]*>/g, '');
          
          // 2. Remove all script type="module" tags
          cleanHtml = cleanHtml.replace(/<script type="module"[^>]*>([\s\S]*?)<\/script>/g, '');
          cleanHtml = cleanHtml.replace(/<script type="module" src="[^"]+"><\/script>/g, '');
          
          // 3. Remove the legacy detector script and nomodule tags
          cleanHtml = cleanHtml.replace(/<script nomodule id="vite-legacy-polyfill"[^>]*><\/script>/g, '');
          cleanHtml = cleanHtml.replace(/<script nomodule id="vite-legacy-entry"[\s\S]*?<\/script>/g, '');
          cleanHtml = cleanHtml.replace(/<script>\s*!function\(\)[\s\S]*?<\/script>/g, '');
          cleanHtml = cleanHtml.replace(/<script>\s*\(function\(\)\{[\s\S]*?\}\)\(\);\s*<\/script>/g, '');
          
          // Remove any leftover nomodule tags or system js loaders that can fail on old engines
          cleanHtml = cleanHtml.replace(/<script nomodule[^>]*>([\s\S]*?)<\/script>/g, '');

          // 4. Inject super compatible standard ES5 script tags before the closing body tag
          const es5Scripts = `
    <!-- Standard ES5 Fallbacks directly loaded for older Smart TVs / Philips TV Browser -->
    <script src="${polyfillUrl}"></script>
    <script src="${entryUrl}"></script>
`;
          cleanHtml = cleanHtml.replace('</body>', `${es5Scripts}\n</body>`);

          return cleanHtml;
        }
      }
    ],
    build: {
      target: 'es5',
      cssTarget: 'chrome49', // Ensures CSS minification down to older styles supported by TV browsers
      minify: 'terser',      // Highly compatible older minifier for old browser runtimes
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
