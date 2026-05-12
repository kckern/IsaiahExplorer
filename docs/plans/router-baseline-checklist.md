# Router Migration — Baseline Smoke Checklist

Run after each migration phase to verify no regressions.

---

## Baseline URL Examples

These are representative URLs captured before migration (hash-based, pre-React Router).

```
# Structure / outline / version / chapter / verse
/#/divisions/divisions/KJV/1/1
/#/chiastic/chiastic/ESV/52/13

# With tag modifier (tag comes BEFORE chapter/verse)
/#/divisions/divisions/KJV/tag.creation/1/1

# With search modifier (search comes BEFORE chapter/verse)
/#/divisions/divisions/KJV/search.comfort+my+people/40/3

# With Hebrew Strong's modifier (hebrew comes BEFORE chapter/verse)
/#/divisions/divisions/KJV/hebrew.2490/53/5

# With commentary modifier (commentary comes AFTER chapter/verse)
/#/divisions/divisions/KJV/53/5/commentary.barnes/123

# Legacy pathname forms (non-hash)
/1/1          → chapter 1, verse 1
/53            → chapter 53, verse 1
/tag.creation  → open tag

# Electron (file:// — hash writes are suppressed)
file:///path/to/app.asar/index.html
```

---

## Smoke Checklist

Run each item manually or automated after every phase.

### Deep Links

- [ ] Open `/#/divisions/divisions/KJV/1/1` — lands on Isaiah 1:1 with correct structure/outline/version
- [ ] Open `/#/chiastic/chiastic/ESV/52/13` — lands on Isaiah 52:13 with chiastic structure
- [ ] Refresh page — URL is preserved, app restores to same state
- [ ] Open app at bare `/` — loads default verse (Isaiah 1:1)

### Modifier Deep Links

- [ ] Open URL with `/tag.slug` — tag is active, first tagged verse is shown
- [ ] Open URL with `/search.query` — search results are shown, query is populated
- [ ] Open URL with `/hebrew.NNNN` — Hebrew panel opens with the given Strong's number
- [ ] Open URL with `/commentary.source/id` — commentary panel opens to the given entry

### URL Writes (state → URL)

- [ ] Navigate to a verse by clicking — URL updates to reflect new chapter/verse
- [ ] Change structure — URL updates structure segment
- [ ] Change outline — URL updates outline segment
- [ ] Change version — URL updates version segment
- [ ] Activate a tag — URL gains `/tag.slug`
- [ ] Enter search — URL gains `/search.query`
- [ ] Open Hebrew panel — URL gains `/hebrew.NNNN`
- [ ] Open commentary — URL gains `/commentary.source/id`

### Back / Forward

- [ ] Navigate A → B → back — returns to A
- [ ] Navigate A → B → back → forward — returns to B
- [ ] Keyboard stepping does NOT flood history (uses replace, not push)
- [ ] Audio stepping does NOT flood history (uses replace, not push)

### Legacy URL Compatibility

- [ ] `/#/1/1` → resolves to chapter 1 verse 1
- [ ] `/tag.creation` → tag opens correctly
- [ ] Old shared links (hash shape) still work after migration

### Electron

- [ ] App launches without routing errors
- [ ] Deep link via file:// URL opens correct content
- [ ] URL bar updates are suppressed (rootURL starts with `file:`)
- [ ] Back/forward work in Electron window

### SEO / PHP Pages

- [ ] OG meta tags are generated for structure/outline/version/chapter/verse paths
- [ ] PHP `server.php` URL parsing matches JS route codec for canonical paths

---

## Notes

- History flooding test: keyboard-step through 10 verses rapidly; browser history should show 1–2 entries, not 10.
- Electron test: build with `npm run electron` and open a deep-link URL.
