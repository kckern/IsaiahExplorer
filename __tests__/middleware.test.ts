import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(`https://isaiah.scripture.guide${path}`));
}

describe('legacy redirect middleware', () => {
  test('/search/foo redirects to /search.foo', () => {
    const res = middleware(makeRequest('/search/comfort+my+people'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/search.comfort+my+people');
  });

  test('/hebrew/2490 redirects to /hebrew.2490', () => {
    const res = middleware(makeRequest('/hebrew/2490'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/hebrew.2490');
  });

  test('/hebrew/abc (non-numeric) does NOT redirect — falls through', () => {
    const res = middleware(makeRequest('/hebrew/abc'));
    // NextResponse.next() returns a 200-ish response with x-middleware-next header
    expect(res.status).not.toBe(307);
  });

  test('canonical /whole/chapters/iinst/5/4 passes through', () => {
    const res = middleware(makeRequest('/whole/chapters/iinst/5/4'));
    expect(res.status).not.toBe(307);
  });
});
