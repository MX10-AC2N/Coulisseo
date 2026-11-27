// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";

/** Donne au service worker une version unique à chaque build, pour que l'application installée se mette à jour seule. */
const versionServiceWorker = () => ({
  name: "version-service-worker",
  apply: "build" as const,
  closeBundle() {
    const fichier = path.resolve(__dirname, "dist/sw.js");
    if (!existsSync(fichier)) return;
    const version = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    writeFileSync(fichier, readFileSync(fichier, "utf8").replace(/__VERSION__/g, version));
  },
});

/** Recale les liens du manifeste et de l'icône iOS sur le chemin de base du déploiement. */
const cheminBaseHtml = (base: string) => ({
  name: "chemin-base-html",
  apply: "build" as const,
  closeBundle() {
    const fichier = path.resolve(__dirname, "dist/index.html");
    if (!existsSync(fichier)) return;
    const prefixe = base.endsWith("/") ? base : `${base}/`;
    let html = readFileSync(fichier, "utf8");
    html = html.replace('href="manifest.webmanifest"', `href="${prefixe}manifest.webmanifest"`);
    html = html.replace('href="apple-touch-icon.png"', `href="${prefixe}apple-touch-icon.png"`);
    writeFileSync(fichier, html);
  },
});

export default defineConfig({
  plugins: [react(), versionServiceWorker(), cheminBaseHtml(process.env.BASE_PATH ?? '/SImulateurIntermittece/')],
  // date de mise à jour affichée dans l'application (date du build)
  define: { __DATE_MAJ__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  // chemin de base : '/SImulateurIntermittece/' pour GitHub Pages, './' pour une racine de domaine
  base: process.env.BASE_PATH ?? '/SImulateurIntermittece/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});