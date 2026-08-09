import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Non-blocking CSS — LCP is the inline HTML splash, not Tailwind utilities. */
function asyncCss(): Plugin {
  return {
    name: 'async-css',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link([^>]*\brel="stylesheet"[^>]*)>/g,
        (match, attrs: string) => {
          if (/\bmedia=/.test(attrs)) return match
          const href = attrs.match(/\bhref="([^"]+)"/)?.[1]
          const asyncLink = `<link${attrs} media="print" onload="this.media='all'">`
          return href
            ? `${asyncLink}<noscript><link rel="stylesheet" href="${href}"></noscript>`
            : asyncLink
        },
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    asyncCss(),
  ],
  build: {
    outDir: 'dist',
    cssCodeSplit: true,
    modulePreload: {
      resolveDependencies: (filename, deps) => {
        // Only preload the React vendor for the entry — keep bandwidth free for LCP.
        if (!filename.includes('index')) return []
        return deps.filter((dep) => /react-vendor|rolldown-runtime/.test(dep))
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          // Never force lucide-react-motion / motion into a shared named chunk:
          // motion ships a JSX runtime that would otherwise become a boot dependency.
          if (id.includes('lucide-react-motion') || id.includes(`${'node_modules'}/motion`) || id.includes(`${'node_modules'}\\motion`)) {
            return
          }

          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('@capacitor')) return 'capacitor'
          if (
            id.includes('react-dom') ||
            id.includes(`${'node_modules'}/react/`) ||
            id.includes(`${'node_modules'}\\react\\`)
          ) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
