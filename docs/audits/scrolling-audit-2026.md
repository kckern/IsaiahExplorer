# Scrolling Audit — Isaiah Explorer
**Date:** May 2026
**Scope:** The four `scrollText / scrollOutline / scrollTagTree / scrollBoxTo` methods in `App.js`, plus the few `scrollIntoView` / `scrollTop` call sites scattered across `Components/`.
**Auditor note:** Companion to `architecture-audit-2026.md` and `responsive-mobile-audit-2026.md`. Scrolling is one of the most user-visible behaviors in the app — when the focal verse moves, four columns reflow in sync — so the bar for "best practices" here is high.

---

## Executive Summary

The app uses **none of the modern scrolling primitives** that have been native since ~2017. It hand-rolls every animation in JavaScript with `setTimeout`, computes "is this element visible" with manual `getBoundingClientRect` math, queries the DOM imperatively via `document.getElementById` instead of refs, and walks the DOM via `.parentNode.parentNode.parentNode.parentNode.previousSibling.previousSibling` chains. Most of it works; some of it is one CSS layout change away from breaking silently.

| Concern | Severity | Notes |
|---|---|---|
| Custom JS easing instead of `scrollTo({behavior:'smooth'})` | 🟠 High | ~30 lines of code that one CSS line could replace |
| `.parentNode.parentNode...previousSibling.previousSibling` DOM walks | 🔴 Critical | Two occurrences. Will silently break the first time the DOM structure of a verse row changes |
| `document.getElementById` from inside business logic | 🟠 High | Bypasses React; refs would survive component reordering |
| `Math.easeInOutQuad = function(...)` monkey-patched on global | 🟡 Medium | Pollutes the `Math` namespace; not testable in isolation |
| `setTimeout(..., 1000)` waiting for layout | 🟡 Medium | Race condition disguised as a fix (`Tags.js:73`) |
| No animation cancellation on unmount | 🟡 Medium | `globalData["timeouts"][scope]` accumulates; timeouts fire into stale DOM |
| `checkInView` returns `null` on bad inputs; callers check `=== true` | 🟢 Low | Defensive, but the `null` short-circuit is fragile |
| No `prefers-reduced-motion` check | 🟡 Medium | Custom easing ignores accessibility preference |
| `IntersectionObserver` not used for "in view" | 🟡 Medium | Manual math forces synchronous layout every check |
| `scrollIntoView()` used in one place with default (instant) behavior | 🟢 Low | Inconsistent with the smooth animation everywhere else |

**Overall grade:** D+. It works, but every scroll path is reinventing primitives the browser provides for free, and two of those paths depend on brittle DOM chains that will eventually break.

---

## 1. The Custom Easing Engine (`scrollBoxTo`)

`App.js:2082–2112`:

```js
scrollBoxTo(scope, element, to, duration) {
  if (duration === 0) { element.scrollTop = to; return true; }
  if (globalData["timeouts"][scope] === undefined)
    globalData["timeouts"][scope] = [];
  Math.easeInOutQuad = function(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t + b;
    t--;
    return (-c / 2) * (t * (t - 2) - 1) + b;
  };
  var start = element.scrollTop,
      change = to - start,
      currentTime = 0,
      increment = 20;
  var animateScroll = function() {
    currentTime += increment;
    var val = Math.easeInOutQuad(currentTime, start, change, duration);
    element.scrollTop = val;
    if (currentTime < duration) {
      globalData["timeouts"][scope].push(setTimeout(animateScroll, increment));
      this.checkFloater();
    }
  };
  animateScroll();
}
```

Five problems in 30 lines:

1. **`Math.easeInOutQuad = function(...)`** mutates the global `Math` object on every call. Side-effect pollution. Re-defining the same function 50 times in a session because every scroll re-assigns it.
2. **`setTimeout(..., 20)`** is not `requestAnimationFrame`. Each timeout fires at "at least 20ms" (not synchronized with the display refresh), so the animation can stutter on 120 Hz displays or hitch when other timeouts queue up.
3. **`globalData["timeouts"][scope].push(...)`** accumulates timeout IDs in a module-global object, never cleared. After a 30-minute session of arrow-key navigation, this array can hold thousands of stale IDs.
4. **No cancellation.** If the user navigates again mid-animation, the old animation continues, fighting the new one. Two `animateScroll` loops both writing to `element.scrollTop` at 20 ms intervals produces the visible "wobble" seen during rapid arrow-key navigation.
5. **`this.checkFloater()` inside the loop** — fires layout calculations 50× per scroll animation, even though the floater rarely needs to update mid-scroll.

### What the browser already does

```js
element.scrollTo({ top, behavior: 'smooth' });
```

One line. Honors `prefers-reduced-motion`. Cancels itself if the user scrolls manually. Coordinated with the compositor (no main-thread jank). Available in every browser since 2018.

Or for cases where the element should come into view:

```js
element.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

Both replace the entire `scrollBoxTo` function.

---

## 2. The Brittle DOM Walks

Two occurrences of multi-step parent/sibling traversal that depend on the exact rendered DOM shape:

`App.js:1829`:
```js
element =
  element.parentNode.parentNode.parentNode.parentNode.previousSibling
    .previousSibling;
```

`Tags.js:442`:
```js
textNode
  .querySelectorAll(".versebox_highlighted")[0]
  .parentNode.parentNode.parentNode.parentNode.previousSibling.previousSibling
  .scrollIntoView();
```

Both walk up four DOM levels, then sideways twice. Each `.parentNode` and `.previousSibling` is an unwritten contract with the JSX that produced the markup. **Any structural change** — wrapping a span in a div, adding a comment node, changing flex to grid, inserting an accessibility landmark — silently shifts what the walk lands on.

These chains are how a future developer ships a "small JSX cleanup" and accidentally breaks scroll alignment in production, with no compile-time signal that anything is wrong.

### What the codebase should use instead

Either:

1. **Add a stable selector at the target.** When the parent that should be scrolled-to gets rendered, give it a class like `.scroll-target` or an `id`, and `querySelector(".scroll-target")` for it directly.
2. **Use a React ref**, pass it through from the parent that owns it, and call `ref.current.scrollIntoView({...})`.

Either change makes the contract explicit: "I depend on this element existing," instead of "I depend on this element being exactly 4 ancestors and 2 prior siblings away from a different element."

---

## 3. `document.getElementById` Inside Business Logic

Every scroll method opens with `document.getElementById("text")` / `document.getElementById("outline")`:

```js
scrollText(reset, source) {
  // ...
  var container = document.getElementById("text");
  var base = document.querySelectorAll("#text .verses.active")[0];
  // ...
}
```

This works because the IDs are stable. But:

- It couples App methods to a specific DOM contract maintained 1000 lines away in JSX.
- It bypasses React's reconciliation — if a parent un-mounts the `#text` column, `getElementById` returns `null` and the method silently `return false`s. The user sees no scroll; no error logged.
- It cannot be tested without a full DOM. Unit-testing the math is impossible.

### What to use

`React.createRef()` (class) or `useRef()` (function) — passed from the column components up to `App` via `ref={app.textRef}`. Then:

```js
scrollText() {
  const container = this.textRef.current;
  if (!container) return;
  // ...
}
```

This is also the only way to make these methods work in test environments (Jest + jsdom doesn't need DOM IDs).

---

## 4. The `setTimeout(..., 1000)` Layout Race

`Components/Tags.js:72`:

```js
app.setState({ infoOpen: true, commentaryMode: false }, function() {
  setTimeout(this.scrollTagTree.bind(this), 1000);
}.bind(app));
```

The 1000 ms is "wait for layout to settle after `infoOpen` opens the tag panel, then scroll the now-visible tag tree to the active branch." It works because:

- The CSS transition for opening the tag panel takes ~400 ms.
- DOM measurement after the transition needs the panel fully expanded.
- 1000 ms is a comfortable buffer.

It will break if:

- The CSS transition is shortened (`scrollTagTree` may fire before the panel is visible → wrong measurements).
- The CSS transition is lengthened (visible scroll lag — the tree visibly opens, then 600 ms later jumps).
- A user on a slow device's layout takes >1000 ms (rare but possible).

### What to use

`ResizeObserver` on the panel container, or `Promise`-wrapping the `transitionend` event:

```js
element.addEventListener('transitionend', () => this.scrollTagTree(), { once: true });
```

This is the cancellable, race-free version of "do X after the transition finishes."

---

## 5. `checkInView` Logic Hole

`App.js:1888`:

```js
checkInView(container, element, p) {
  if (container === undefined || element === undefined) return null;
  // ...
  return isTotal || isPartial;
}
```

Returns `null` when inputs are missing, `true`/`false` otherwise. Callers (`App.js:1833`, `1856`) check the result with strict equality:

```js
if (this.checkInView(container, element) === true) return false;
```

`null === true` is `false`, so when `checkInView` returns `null` (because container or element is undefined), the caller proceeds with the scroll math anyway — which then tries to dereference `container.childNodes[0].getBoundingClientRect()` and silently fails the typeof check at line 1835.

The right pattern:

```js
checkInView(container, element) {
  if (!container || !element) return false; // "not visible" → caller should scroll
  // ...
}
```

This is `null` vs `false` ambiguity bug-bait. Today nothing crashes, but the control flow is harder to reason about than it needs to be.

---

## 6. No `prefers-reduced-motion` Check

The custom easing in `scrollBoxTo` always animates over a fixed duration (200 ms, 500 ms). It ignores `@media (prefers-reduced-motion: reduce)` and the `matchMedia('(prefers-reduced-motion: reduce)')` JS check.

For users with vestibular disorders or motion sensitivity, every scroll is a forced animation. The native `scrollTo({behavior:'smooth'})` honors the OS-level preference automatically. The custom easing does not.

This is a real accessibility regression that "switch to native smooth scroll" would fix in the same line of code as the easing simplification.

---

## 7. `IntersectionObserver` Replaces `checkInView`

The current `checkInView` method does:

```js
let cTop = container.scrollTop;
let cBottom = cTop + container.clientHeight;
let eTop = element.getBoundingClientRect().y - container.getBoundingClientRect().y + cTop;
let eBottom = eTop + element.getBoundingClientRect().height;
```

Three `getBoundingClientRect` calls. Each one forces a synchronous layout. For a sub-50ms operation called dozens of times per scroll, this is a measurable cost on lower-end devices.

`IntersectionObserver` does this asynchronously and without forcing layout:

```js
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      // element is in view
    }
  }
}, { root: container, threshold: 0 });

observer.observe(element);
```

Modern browsers since 2017. Doesn't block the main thread. Doesn't force layout. Multiple elements can share one observer.

For Isaiah Explorer specifically, this would also let the verse-number grids in Col 1 know which verses are currently visible — which today would be useful for lazy-loading commentary/audio.

---

## 8. `scrollIntoView()` Used Once With Default Behavior

`Components/Tags.js:442` — the only place `scrollIntoView()` is called directly in the codebase — uses the default options:

```js
.scrollIntoView();
```

Default = `{ behavior: 'auto', block: 'start', inline: 'nearest' }` — **instant** scroll, anchored to the top.

Every other scroll in the app uses the custom-eased smooth animation. So in this one tag-related path, the scroll jumps abruptly while the rest of the app smooths. Visually inconsistent.

Fix: `{ behavior: 'smooth', block: 'center' }` — at the very least.

---

## 9. Animation Cancellation on Unmount

When a user clicks rapidly through verses, `scrollBoxTo` is called multiple times in quick succession. The previous animation's `setTimeout` chain keeps running into the new animation's `setTimeout` chain, both calling `element.scrollTop = ...` on the same node.

`globalData["timeouts"][scope]` *collects* the timeout IDs but never *clears* them. There is no `clearTimeout` anywhere in the file.

A clean cancellation pattern:

```js
if (this.scrollAnimation) cancelAnimationFrame(this.scrollAnimation);
this.scrollAnimation = requestAnimationFrame(...);
```

Or, if migrating to native:

```js
element.scrollTo({ top, behavior: 'smooth' });  // automatically supersedes prior smooth scroll
```

---

## 10. Recommended Path

If you replace `scrollBoxTo` with `element.scrollTo({behavior:'smooth'})` and `scrollIntoView({behavior:'smooth'})`, **about half of the scroll-related code in `App.js` and `Tags.js` disappears**, and the remaining code becomes:

- `scrollText` / `scrollOutline` / `scrollTagTree` shrink to ~5 lines each (query the target, check visibility, scroll).
- `scrollBoxTo` and `checkInView` go away entirely.
- The `globalData["timeouts"]` global goes away.
- The `Math.easeInOutQuad` monkey-patch goes away.

Sequenced:

1. **Replace `scrollBoxTo` with `element.scrollTo({top, behavior:'smooth'})`.** Drop the easing function, the timeout tracking, and the `Math` mutation. ~1 hour. Visually identical on modern browsers.
2. **Replace `checkInView` with `IntersectionObserver`.** Cache the observer per container. Lets you scroll only when the target is actually off-screen.
3. **Replace the two `.parentNode.parentNode...` chains** with stable class selectors at the target elements. ~30 min total.
4. **Replace `document.getElementById` with refs.** Larger change because the JSX must thread the ref up to `App`. Worth it for testability and React-correctness.
5. **Replace the `setTimeout(..., 1000)` after `infoOpen`** with a `transitionend` listener on the panel. ~15 min.
6. **Honor `prefers-reduced-motion`.** Free with #1.

Total: ~half a day to take this from D+ to A−.

---

## 11. What NOT to Do

- **Don't add more `setTimeout`s** to fix race conditions. Each one is a bandage on a sequencing problem that has a real solution.
- **Don't add more `.parentNode` levels** to "skip over" wrapper elements as the JSX changes. Add a class to the target instead.
- **Don't keep the custom easing "for fidelity."** The native smooth scroll matches the user's OS-level animation settings, which is a better experience than any fixed-duration custom curve.
- **Don't read `getBoundingClientRect()` inside loops.** It synchronously forces layout. Either cache the result or move to `IntersectionObserver`.

---

## 12. Conclusion

The scrolling code works because the DOM has stayed stable for ~8 years and the contracts between methods and JSX have held. Two of those contracts are extraordinarily fragile (the parent/sibling chains), and the entire custom-easing engine exists to do what `behavior: 'smooth'` does in one line of CSS.

The fix is small, the win is real (less code, accessibility, smoother on 120 Hz, no race conditions), and there is no architectural risk because native scroll primitives are a strict superset of what the custom code does today.
