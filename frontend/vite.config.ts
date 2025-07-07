import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    
    // Environment variables
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    },
    
    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      target: 'es2015',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['framer-motion', 'lucide-react'],
            charts: ['chart.js', 'react-chartjs-2'],
            utils: ['axios']
          }
        }
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000
    },
    
    // Development server configuration
    server: {
      port: 5173,
      host: true,
      cors: true,
      // Proxy API calls in development (optional)
      proxy: mode === 'development' ? {
        '/api': {
          target: env.VITE_API_URL || 'https://1treu6p055.execute-api.us-east-1.amazonaws.com/prod',
          changeOrigin: true,
          secure: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        }
      } : undefined
    },
    
    // Preview server configuration (for production builds)
    preview: {
      port: 4173,
      host: true,
      cors: true
    },
    
    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'axios',
        'framer-motion'
      ],
      exclude: [
        'lucide-react'
      ]
    },
    
    // CSS configuration
    css: {
      postcss: './postcss.config.js'
    },
    
    // Base path for deployment
    base: '/',
    
    // Environment variables prefix
    envPrefix: 'VITE_'
  };
});