/** @jest-environment jsdom */
import { fetchData, UnzipError } from './fetchData'
import pako from 'pako'

function gzipBase64(obj) {
  const bytes = pako.gzip(JSON.stringify(obj))
  let bin = ''
  bytes.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin)
}

describe('fetchData', () => {
  afterEach(() => { global.fetch = undefined })

  it('resolves parsed JSON for a gzip+base64 payload', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(gzipBase64({ a: 1 })) })
    await expect(fetchData('/core/core.txt')).resolves.toEqual({ a: 1 })
  })

  it('rejects on non-ok response instead of parsing the error body', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('<html>404</html>') })
    await expect(fetchData('/core/core.txt')).rejects.toThrow(/404/)
  })

  it('retries once on network failure, then succeeds', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(gzipBase64([1, 2])) })
    await expect(fetchData('/text/verses_KJV.txt')).resolves.toEqual([1, 2])
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('rejects with UnzipError on corrupt payload (never returns the ["Unzip Failure"] tuple)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('not-base64-gzip!!') })
    await expect(fetchData('/core/core.txt')).rejects.toBeInstanceOf(UnzipError)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('rejects after exhausting the single retry on repeated network failure', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new TypeError('network'))
      .mockRejectedValueOnce(new TypeError('network'))
    await expect(fetchData('/core/core.txt')).rejects.toThrow('network')
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
