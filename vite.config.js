import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El `base` debe coincidir con el nombre del repo cuando se despliega en
// GitHub Pages (https://<usuario>.github.io/<repo>/). Se puede sobreescribir
// con la variable de entorno BASE_PATH desde el workflow de despliegue.
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
