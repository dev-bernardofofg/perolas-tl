import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import neon from './neon-vite-plugin.ts'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    // consolePiping desligado: o eco client<->server do console entra em loop
    // de feedback quando um warning do React aparece, inundando o terminal.
    devtools({ consolePiping: { enabled: false } }),
    neon,
    tailwindcss(),
    tanstackStart(),
    // nitro empacota o servidor para o alvo de deploy: na Vercel detecta o CI
    // e emite .vercel/output (Build Output API) — sem ele o deploy vira 404.
    nitro(),
    viteReact(),
  ],
})

export default config
