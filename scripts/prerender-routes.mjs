#!/usr/bin/env node
/**
 * Writes a copy of dist/index.html at every route the site has, so GitHub Pages
 * answers a deep link with 200 instead of 404.
 *
 * GitHub Pages serves static files only: it knows nothing about client-side
 * routing. The usual fix is to copy index.html to 404.html, and that does make
 * deep links work, but the response still carries a 404 status. Search engines
 * and link previews treat that as a dead page, and a lesson nobody can share is
 * a lesson nobody reads.
 *
 * Writing dist/practice/index.html and dist/lessons/<slug>/index.html gives
 * every route a real file and a real 200. The 404.html copy stays as the
 * fallback for anything genuinely missing, where a 404 is the correct answer.
 */
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')
const SOURCE = resolve(DIST, 'index.html')

const lessons = (await readdir(resolve(ROOT, 'src/content/lessons')))
  .filter((file) => file.endsWith('.md'))
  .map((file) => `lessons/${file.replace(/\.md$/, '')}`)

const routes = ['practice', 'cheatsheet', 'glossary', 'about', ...lessons]

for (const route of routes) {
  const target = resolve(DIST, route, 'index.html')
  await mkdir(dirname(target), { recursive: true })
  await copyFile(SOURCE, target)
}

// The fallback for URLs that really do not exist.
await copyFile(SOURCE, resolve(DIST, '404.html'))

console.log(`✓ Pre-rendered ${routes.length} routes plus the 404 fallback.`)
