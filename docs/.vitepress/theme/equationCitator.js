const CITATION_SELECTOR = '.equation-citator-citation[data-ec-kind][data-ec-refs]'
const TARGET_SELECTOR = '.equation-citator-target[data-ec-kind]'
const STYLE_ID = 'equation-citator-theme-module-style'
const CLEANUP_KEY = '__equationCitatorThemeCleanup'

const pageCache = new Map()

let popover = null
let activeCitation = null
let hideTimer = 0
let hoverToken = 0

function escapeCssValue(value = '') {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }

  return String(value).replace(/["\\]/g, '\\$&')
}

function slugPart(value = '') {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'target'
}

function hashString(value = '') {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

function targetTag(target) {
  return (target?.dataset?.ecTag || target?.dataset?.tag || '').trim()
}

function kindsMatch(citationKind, targetKind) {
  return String(citationKind || '').trim().toLowerCase() ===
    String(targetKind || '').trim().toLowerCase()
}

function stableTargetId(kind, tag) {
  return `equation-citator-${slugPart(kind)}-${slugPart(tag)}`
}

function elementOwnerDocument(element) {
  return element?.ownerDocument || document
}

function ensureTargetId(target, kind, tag) {
  if (target.id) return target.id

  const ownerDocument = elementOwnerDocument(target)
  const baseId = stableTargetId(kind, tag)
  const existing = ownerDocument.getElementById(baseId)
  if (!existing || existing === target) {
    target.id = baseId
    return target.id
  }

  const fallbackId = `${baseId}-${hashString(target.textContent || target.outerHTML || tag)}`
  const fallbackExisting = ownerDocument.getElementById(fallbackId)
  if (!fallbackExisting || fallbackExisting === target) {
    target.id = fallbackId
    return target.id
  }

  let index = 2
  while (ownerDocument.getElementById(`${fallbackId}-${index}`)) index += 1
  target.id = `${fallbackId}-${index}`
  return target.id
}

function assignStableTargetIds(root = document) {
  root.querySelectorAll(TARGET_SELECTOR).forEach((target) => {
    if (target.closest('#equation-citator-preview')) return

    const tag = targetTag(target)
    if (!tag) return

    ensureTargetId(target, target.dataset.ecKind, tag)
  })
}

function parseRefs(citation) {
  try {
    const refs = JSON.parse(citation.dataset.ecRefs || '[]')
    return Array.isArray(refs) ? refs : []
  } catch {
    return []
  }
}

function findMatchingTarget(root, kind, tag) {
  const wantedTag = String(tag || '').trim()
  if (!wantedTag) return null

  return [...root.querySelectorAll(TARGET_SELECTOR)].find((target) =>
    kindsMatch(kind, target.dataset.ecKind) &&
    targetTag(target) === wantedTag
  ) || null
}

function footnoteIdCandidates(fileId) {
  const normalized = String(fileId || '').trim()
  if (!normalized) return []

  return [
    `fn${normalized}`,
    `fn-${normalized}`,
    `fn:${normalized}`,
    normalized
  ]
}

function findFootnoteDefinition(root, fileId) {
  for (const id of footnoteIdCandidates(fileId)) {
    const found = root.getElementById(id)
    if (found) return found
  }

  const escaped = escapeCssValue(String(fileId || '').trim())
  return root.querySelector(
    `.footnotes li[id$="${escaped}"], .footnote-item[id$="${escaped}"], li[id$="${escaped}"]`
  )
}

function hrefLooksLikeKnowledgeBase(href = '') {
  try {
    const url = new URL(href, window.location.href)
    return url.origin === window.location.origin && url.pathname.includes('/knowledge-base/')
  } catch {
    return false
  }
}

function definitionKnowledgeBaseHref(definition) {
  if (!definition) return ''

  const links = [...definition.querySelectorAll('a[href]')]
  const link = links.find((candidate) => {
    const href = candidate.getAttribute('href') || ''
    if (!href || href.startsWith('#')) return false
    if (candidate.classList.contains('footnote-backref')) return false

    return hrefLooksLikeKnowledgeBase(href)
  })

  return link?.getAttribute('href') || ''
}

function resolveFootnoteHref(citation, fileId) {
  const definition = findFootnoteDefinition(document, fileId)
  const href = definitionKnowledgeBaseHref(definition)
  if (href) return href

  const nearbyRef = citation.nextElementSibling?.matches?.('.footnote-ref, sup')
    ? citation.nextElementSibling.querySelector('a[href^="#"]')
    : null
  const targetId = nearbyRef?.getAttribute('href')?.slice(1)
  const nearbyDefinition = targetId ? document.getElementById(decodeURIComponent(targetId)) : null

  return definitionKnowledgeBaseHref(nearbyDefinition)
}

function htmlFetchCandidates(href) {
  const url = new URL(href, window.location.href)
  url.hash = ''

  const candidates = [url.href]
  const pathname = url.pathname
  const hasExtension = /\.[a-z0-9]+$/i.test(pathname)

  if (!hasExtension && !pathname.endsWith('/')) {
    const htmlUrl = new URL(url.href)
    htmlUrl.pathname = `${pathname}.html`
    candidates.push(htmlUrl.href)
  }

  if (pathname.endsWith('/')) {
    const indexUrl = new URL(url.href)
    indexUrl.pathname = `${pathname}index.html`
    candidates.push(indexUrl.href)
  } else if (!hasExtension) {
    const slashUrl = new URL(url.href)
    slashUrl.pathname = `${pathname}/`
    candidates.push(slashUrl.href)

    const indexUrl = new URL(url.href)
    indexUrl.pathname = `${pathname}/index.html`
    candidates.push(indexUrl.href)
  }

  return [...new Set(candidates)]
}

async function fetchPage(href) {
  const cacheKey = new URL(href, window.location.href).href.replace(/#.*$/, '')
  if (pageCache.has(cacheKey)) return pageCache.get(cacheKey)

  const promise = (async () => {
    for (const candidate of htmlFetchCandidates(href)) {
      try {
        const response = await fetch(candidate, { credentials: 'same-origin' })
        if (!response.ok) continue

        const html = await response.text()
        const parsed = new DOMParser().parseFromString(html, 'text/html')
        assignStableTargetIds(parsed)

        return {
          document: parsed,
          url: response.url || candidate
        }
      } catch {
        // Try the next route shape.
      }
    }

    return null
  })()

  pageCache.set(cacheKey, promise)
  return promise
}

function rewriteRelativeUrls(container, pageUrl) {
  const attributes = [
    ['a[href]', 'href'],
    ['img[src]', 'src'],
    ['source[src]', 'src'],
    ['video[src]', 'src'],
    ['audio[src]', 'src']
  ]

  for (const [selector, attribute] of attributes) {
    container.querySelectorAll(selector).forEach((element) => {
      const value = element.getAttribute(attribute)
      if (!value || value.startsWith('#') || /^(data:|mailto:|tel:|javascript:)/i.test(value)) return

      try {
        element.setAttribute(attribute, new URL(value, pageUrl).href)
      } catch {
        // Leave malformed URLs untouched.
      }
    })
  }
}

async function resolveTargets(citation, stopAfterFirst = false) {
  const kind = citation.dataset.ecKind
  const refs = parseRefs(citation)
  const resolved = []

  for (const ref of refs) {
    const tag = String(ref?.tag || '').trim()
    if (!tag) continue

    if (!ref.file) {
      const target = findMatchingTarget(document, kind, tag)
      if (target) {
        resolved.push({
          kind,
          tag,
          target,
          samePage: true,
          url: window.location.href.replace(/#.*$/, '')
        })
        if (stopAfterFirst) return resolved
      }

      continue
    }

    const href = resolveFootnoteHref(citation, ref.file)
    if (!href) continue

    const page = await fetchPage(href)
    if (!page) continue

    const target = findMatchingTarget(page.document, kind, tag)
    if (target) {
      resolved.push({
        kind,
        tag,
        target,
        samePage: false,
        url: page.url
      })
      if (stopAfterFirst) return resolved
    }
  }

  return resolved
}

function ensurePopover() {
  if (popover) return popover

  popover = document.createElement('div')
  popover.id = 'equation-citator-preview'
  popover.setAttribute('role', 'tooltip')
  popover.hidden = true
  popover.addEventListener('mouseenter', () => {
    window.clearTimeout(hideTimer)
  })
  popover.addEventListener('mouseleave', scheduleHide)
  document.body.appendChild(popover)

  return popover
}

function positionPopover(anchor) {
  const popoverElement = ensurePopover()
  const anchorRect = anchor.getBoundingClientRect()
  const margin = 12
  const width = Math.min(560, window.innerWidth - margin * 2)

  popoverElement.style.maxWidth = `${width}px`
  popoverElement.hidden = false

  const popoverRect = popoverElement.getBoundingClientRect()
  let top = anchorRect.bottom + margin
  if (top + popoverRect.height > window.innerHeight - margin) {
    top = anchorRect.top - popoverRect.height - margin
  }
  if (top < margin) top = margin

  let left = anchorRect.left
  if (left + popoverRect.width > window.innerWidth - margin) {
    left = window.innerWidth - popoverRect.width - margin
  }
  if (left < margin) left = margin

  popoverElement.style.top = `${top}px`
  popoverElement.style.left = `${left}px`
}

function renderLoading(citation) {
  const popoverElement = ensurePopover()
  popoverElement.className = 'equation-citator-preview is-loading'
  popoverElement.textContent = 'Loading preview...'
  positionPopover(citation)
}

function renderNoPreview(citation) {
  const popoverElement = ensurePopover()
  popoverElement.className = 'equation-citator-preview is-empty'
  popoverElement.textContent = 'No matching citation target found.'
  positionPopover(citation)
}

function renderPreview(citation, resolvedTargets) {
  const popoverElement = ensurePopover()
  const clones = resolvedTargets.map((resolved) => {
    const targetId = ensureTargetId(resolved.target, resolved.kind, resolved.tag)
    const targetUrl = new URL(resolved.url, window.location.href)
    targetUrl.hash = targetId

    const clone = resolved.target.cloneNode(true)
    clone.removeAttribute('id')
    clone.classList.add('equation-citator-preview-item')
    clone.dataset.ecPreviewHref = targetUrl.href
    rewriteRelativeUrls(clone, resolved.url)
    return clone
  })

  popoverElement.className = 'equation-citator-preview'
  popoverElement.replaceChildren(...clones)
  positionPopover(citation)
}

async function showForCitation(citation) {
  const token = ++hoverToken
  activeCitation = citation
  window.clearTimeout(hideTimer)
  renderLoading(citation)

  const resolved = await resolveTargets(citation)
  if (token !== hoverToken || activeCitation !== citation) return

  if (!resolved.length) {
    renderNoPreview(citation)
    return
  }

  renderPreview(citation, resolved)
}

function hidePopover() {
  activeCitation = null
  hoverToken += 1
  if (popover) popover.hidden = true
}

function scheduleHide() {
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(hidePopover, 120)
}

function citationFromEvent(event) {
  const target = event.target
  return target instanceof Element ? target.closest(CITATION_SELECTOR) : null
}

function previewItemFromEvent(event) {
  const target = event.target
  return target instanceof Element
    ? target.closest('#equation-citator-preview .equation-citator-preview-item[data-ec-preview-href]')
    : null
}

function onMouseOver(event) {
  const citation = citationFromEvent(event)
  if (!citation || citation === activeCitation) return
  if (citation.contains(event.relatedTarget)) return

  void showForCitation(citation)
}

function onMouseOut(event) {
  const citation = citationFromEvent(event)
  if (!citation || citation.contains(event.relatedTarget)) return

  scheduleHide()
}

function onPreviewDoubleClick(event) {
  const previewItem = previewItemFromEvent(event)
  if (!previewItem) return

  event.preventDefault()
  event.stopPropagation()

  const href = previewItem.dataset.ecPreviewHref
  if (!href) return

  if (event.ctrlKey || event.metaKey) {
    window.open(href, '_blank', 'noopener')
    return
  }

  const url = new URL(href, window.location.href)
  const samePage =
    url.origin === window.location.origin &&
    url.pathname === window.location.pathname &&
    url.search === window.location.search

  if (!samePage) {
    window.location.href = url.href
    return
  }

  window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`)
  scrollToCurrentHash()
  hidePopover()
}

function scrollToCurrentHash() {
  if (!window.location.hash) return

  const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
  if (!target) return

  window.requestAnimationFrame(() => {
    target.scrollIntoView({ block: 'start' })
  })
}

function refreshTargets() {
  assignStableTargetIds(document)
}

function refreshTargetsAndScrollToHash() {
  refreshTargets()
  scrollToCurrentHash()
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    #equation-citator-preview {
      position: fixed;
      z-index: 1000;
      box-sizing: border-box;
      max-height: min(420px, calc(100vh - 24px));
      overflow: auto;
      border: 1px solid var(--vp-c-divider);
      border-radius: 8px;
      padding: 12px 14px;
      color: var(--vp-c-text-1);
      background: var(--vp-c-bg);
      box-shadow: var(--vp-shadow-3);
      font-size: 14px;
      line-height: 1.5;
    }

    #equation-citator-preview[hidden] {
      display: none;
    }

    #equation-citator-preview.is-loading,
    #equation-citator-preview.is-empty {
      color: var(--vp-c-text-2);
    }

    #equation-citator-preview .equation-citator-target {
      width: 100%;
      max-width: 100%;
      margin: 0;
    }

    #equation-citator-preview .equation-citator-preview-item {
      border-radius: 6px;
      padding: 8px;
      cursor: pointer;
      transition: background-color 0.16s ease;
    }

    #equation-citator-preview .equation-citator-preview-item:hover,
    #equation-citator-preview .equation-citator-preview-item:focus-within {
      background: color-mix(in srgb, var(--vp-c-brand-1) 10%, transparent);
    }

    #equation-citator-preview mjx-container[display="true"] {
      overflow: visible !important;
    }

    .equation-citator-citation {
      cursor: default;
    }
  `

  document.head.appendChild(style)
}

export function installEquationCitatorPreviews({ router } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  window[CLEANUP_KEY]?.()

  injectStyles()
  refreshTargetsAndScrollToHash()

  document.addEventListener('mouseover', onMouseOver)
  document.addEventListener('mouseout', onMouseOut)
  document.addEventListener('dblclick', onPreviewDoubleClick, true)
  window.addEventListener('scroll', scheduleHide, { passive: true })
  window.addEventListener('resize', scheduleHide, { passive: true })
  window.addEventListener('hashchange', refreshTargetsAndScrollToHash)

  let mutationTimer = 0
  const observer = new MutationObserver(() => {
    window.clearTimeout(mutationTimer)
    mutationTimer = window.setTimeout(refreshTargets, 50)
  })
  observer.observe(document.body, { childList: true, subtree: true })

  const previousRouteChanged = router?.onAfterRouteChanged
  if (router) {
    router.onAfterRouteChanged = (to) => {
      previousRouteChanged?.(to)
      hidePopover()
      window.setTimeout(refreshTargetsAndScrollToHash, 0)
    }
  }

  window[CLEANUP_KEY] = () => {
    document.removeEventListener('mouseover', onMouseOver)
    document.removeEventListener('mouseout', onMouseOut)
    document.removeEventListener('dblclick', onPreviewDoubleClick, true)
    window.removeEventListener('scroll', scheduleHide)
    window.removeEventListener('resize', scheduleHide)
    window.removeEventListener('hashchange', refreshTargetsAndScrollToHash)
    window.clearTimeout(hideTimer)
    window.clearTimeout(mutationTimer)
    observer.disconnect()

    if (router) router.onAfterRouteChanged = previousRouteChanged
    if (popover) {
      popover.remove()
      popover = null
    }
  }
}

export const install = installEquationCitatorPreviews
