import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site:
// https://<user>.github.io/<repo>/
export default defineConfig({
  plugins: [react()],
  base: '/days_of_year/',
})
