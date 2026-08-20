import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '..', 'dist')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 900, height: 700 } })

const errors = []
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })

await page.goto('file://' + path.join(DIST, 'index.html'))
await page.waitForSelector('.menu-bar .menu-item', { timeout: 15000 })

// create a deep path with a long directory name
await page.evaluate(async () => {
  await window.electron.mkdir('/home/demo/very-long-directory-name-that-goes-on-and-on')
  await window.electron.mkdir('/home/demo/very-long-directory-name-that-goes-on-and-on/some-medium-folder')
  await window.electron.mkdir('/home/demo/very-long-directory-name-that-goes-on-and-on/some-medium-folder/target')
})

// navigate via address bar
await page.click('.row.first')
await page.fill('.row.first input.address', '/home/demo/very-long-directory-name-that-goes-on-and-on/some-medium-folder/target')
await page.keyboard.press('Enter')
await page.waitForTimeout(800)

  const snap = () => page.evaluate(() => {
  const crumbs = document.querySelector('.breadcrumbs')
  const labels = [...document.querySelectorAll('.breadcrumb')]
  const children = crumbs ? [...crumbs.children] : []
  return {
    crumbsClientWidth: crumbs ? crumbs.clientWidth : null,
    crumbsScrollWidth: crumbs ? crumbs.scrollWidth : null,
    children: children.map(c => ({
      cls: c.className, offsetW: c.offsetWidth, offsetL: c.offsetLeft,
    })),
    labels: labels.map(l => ({
      text: l.querySelector('.crumb-text')?.textContent,
      offsetW: l.offsetWidth,
      scrollW: l.querySelector('.crumb-text')?.scrollWidth,
      maxWidth: l.style.maxWidth,
    })),
    starW: document.querySelector('.bookmark-star')?.offsetWidth ?? null,
    rowClientWidth: document.querySelector('.row.first')?.clientWidth ?? null,
    rootVisible: !!document.querySelector('.breadcrumb-root'),
    ellipsisVisible: !!document.querySelector('.breadcrumb-ellipsis'),
  }
})

console.log('NAVIGATED:', JSON.stringify(await snap(), null, 1))

for (const w of [500]) {
  await page.setViewportSize({ width: w, height: 700 })
  await page.waitForTimeout(300)
  console.log(`W=${w}`, JSON.stringify(await snap(), null, 1))
  const dbg = await page.evaluate(() => {
    const row = document.querySelector('.row.first')
    const star = document.querySelector('.bookmark-star')
    const availW = row.clientWidth - (star ? star.offsetWidth : 0)
    const fixedEls = [...document.querySelectorAll('.breadcrumb-root, .triangle-wrap, .breadcrumb-ellipsis')]
    const fixedW = fixedEls.reduce((s, f) => s + f.offsetWidth, 0)
    const labels = [...document.querySelectorAll('.breadcrumb:not(.breadcrumb-ellipsis)')]
    const naturals = labels.map(l => l.querySelector('.crumb-text').scrollWidth)
    return {
      availW,
      fixedEls: fixedEls.map(f => `${f.className}:${f.offsetWidth}`),
      fixedW,
      naturals,
      naturalTotal: fixedW + naturals.reduce((a, b) => a + b, 0),
      wouldFit: fixedW + naturals.reduce((a, b) => a + b, 0) <= availW,
    }
  })
  console.log('DBG', JSON.stringify(dbg, null, 1))
}

console.log('ERRORS:', errors)
await browser.close()
