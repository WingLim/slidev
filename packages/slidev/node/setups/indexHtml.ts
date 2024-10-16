import type { ResolvedSlidevOptions } from '@slidev/types'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { slash } from '@antfu/utils'
import { white, yellow } from 'kolorist'
import { escapeHtml } from 'markdown-it/lib/common/utils.mjs'
import { version } from '../../package.json'
import { getSlideTitle } from '../commands/shared'
import { toAtFS } from '../resolver'
import { generateGoogleFontsUrl } from '../utils'

function toAttrValue(unsafe: unknown) {
  return JSON.stringify(escapeHtml(String(unsafe)))
}

export default function setupIndexHtml({ mode, entry, clientRoot, userRoot, roots, data }: Omit<ResolvedSlidevOptions, 'utils'>): string {
  let main = readFileSync(join(clientRoot, 'index.html'), 'utf-8')
  let head = ''
  let body = ''

  const { info, author, keywords } = data.headmatter
  head += [
    `<meta name="slidev:version" content="${version}">`,
    mode === 'dev' && `<meta charset="slidev:entry" content="${slash(entry)}">`,
    `<link rel="icon" href="${data.config.favicon}">`,
    `<title>${getSlideTitle(data)}</title>`,
    info && `<meta name="description" content=${toAttrValue(info)}>`,
    author && `<meta name="author" content=${toAttrValue(author)}>`,
    keywords && `<meta name="keywords" content=${toAttrValue(Array.isArray(keywords) ? keywords.join(', ') : keywords)}>`,
  ].filter(Boolean).join('\n')

  for (const root of roots) {
    const path = join(root, 'index.html')
    if (!existsSync(path))
      continue

    const index = readFileSync(path, 'utf-8')

    if (root === userRoot && index.includes('<!DOCTYPE')) {
      console.error(yellow(`[Slidev] Ignored provided index.html with doctype declaration. (${white(path)})`))
      console.error(yellow('This file may be generated by Slidev, please remove it from your project.'))
      continue
    }

    head += `\n${(index.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || '').trim()}`
    body += `\n${(index.match(/<body>([\s\S]*?)<\/body>/i)?.[1] || '').trim()}`
  }

  if (data.features.tweet)
    body += '\n<script async src="https://platform.twitter.com/widgets.js"></script>'

  if (data.config.fonts.webfonts.length && data.config.fonts.provider !== 'none')
    head += `\n<link rel="stylesheet" href="${generateGoogleFontsUrl(data.config.fonts)}" type="text/css">`

  main = main
    .replace('__ENTRY__', toAtFS(join(clientRoot, 'main.ts')))
    .replace('<!-- head -->', head)
    .replace('<!-- body -->', body)

  return main
}