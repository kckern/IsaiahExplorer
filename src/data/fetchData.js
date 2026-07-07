// Single fetch path for every compressed dataset (core.txt, verses_*.txt,
// words_HEB.txt, tags_hl.txt). Checks response.ok, retries a network error
// once, and throws on corrupt payloads instead of returning an error tuple
// (the old unzipJSON returned ["Unzip Failure", err], which callers merged
// into globalData as keys "0"/"1").
import pako from 'pako'

export class UnzipError extends Error {
  constructor(message) {
    super(message)
    this.name = 'UnzipError'
  }
}

export function unzipJSON(base64) {
  try {
    // { to: 'string' } uses pako's own utf-8 decode (same API in pako v1/v2),
    // avoiding TextDecoder, which jest-environment-jsdom does not provide.
    const json = pako.ungzip(Uint8Array.from(atob(base64), c => c.charCodeAt(0)), { to: 'string' })
    return JSON.parse(json)
  } catch (err) {
    throw new UnzipError('Failed to decode dataset: ' + err.message)
  }
}

export function fetchData(url, { retried = false } = {}) {
  return fetch(url)
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status + ' loading ' + url)
      return response.text()
    })
    .then(unzipJSON)
    .catch(err => {
      if (!retried && !(err instanceof UnzipError)) return fetchData(url, { retried: true })
      throw err
    })
}
