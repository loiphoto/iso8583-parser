# ISO 8583 Parser — Design

- Date: 2026-10-29
- Status: Draft for approval
- Product URL: https://iso.loiphoto.site (custom subdomain on the owner's domain loiphoto.site)

## Intent

A free, public, browser-only tool that decodes NAPAS-style ISO 8583 (1987-based) payment messages pasted straight from log hex dumps — no cleaning, no conversion, no upload. It exists for the moment a backend developer is debugging a payment-hub timeout and reading hex by eye.

The owner is a Java backend developer at a bank payment hub (Vietnam). The tool is both a daily-work utility for their team and a public side product for personal brand.

## Why it can win

Existing parsers (iso8583parser.com, neapay, iso8583.info) parse one clean message with manual encoding selection. None of them:

1. Accept raw log hex dumps (offset columns, spaces, ASCII gutter) untouched
2. Split multiple messages / request–response pairs found in one dump
3. Have a NAPAS (Vietnam) dialect or Vietnamese UI

## Goals

- **Paste anything**: a hex dump with offset columns, gaps, and trailing ASCII columns parses without manual cleanup
- **Multi-message**: auto-detect and split several ISO 8583 messages in one paste; label each (Request/Response by MTI)
- **Field-by-field decode** per ISO 8583:1987 public definitions: field number, name, raw hex, decoded value
- **Human-readable interpretation** of the fields people actually look at: MTI, processing code (DE 3), response code (DE 39), amount (DE 4 + currency DE 49), PAN (DE 2, masked)
- **Result layout B** (owner's choice): hex view with each field colored, beside a field list; hovering either side highlights the same field on both
- **Bilingual UI**: English default, Vietnamese toggle (owner's choice)
- **100% client-side**: data never leaves the browser (privacy is a selling point; "No upload" stated on the page)
- Free, no accounts, no server
- Deployed at https://iso.loiphoto.site; source in a public GitHub repo (doubles as portfolio)

## Non-goals (v1)

- No message encoding/building (decode only)
- No Visa/Mastercard/other dialect dictionaries (structure must allow adding later)
- No full EMV TLV decode of DE 55 (shown raw in v1)
- No backend, database, analytics that sends data, or account system
- No offline/paid edition

## Anti-goals (failure even if it technically works)

- **Confident wrong answers**: if field boundaries are ambiguous, the tool must flag uncertainty rather than mislabel bytes. Silent misalignment is worse than refusing to parse.
- **Publishing confidential material**: NAPAS's field-level spec is distributed privately to member banks. v1 ships only public-standard (ISO 8583:1987) definitions plus general knowledge. The owner must not paste internal bank/NAPAS spec content into the public dictionary. (See Extensibility.)
- **A paste flow that still requires manual cleanup** — that is the core pain this tool removes.
- **An amateur-looking page** — it is public-facing and tied to the owner's name.

## Constraints

- Static site only, custom domain iso.loiphoto.site (owner's existing domain loiphoto.site)
- Modern evergreen browsers
- Owner is a Java backend developer; the code must stay simple enough for them to maintain alone (no exotic frontend tooling)

## Decisions the owner made (theirs)

1. Product: web tool parsing NAPAS ISO 8583 messages
2. Primary input: hex dumps with offset columns and spaces, straight from logs; often contains a request+response pair
3. Audience: team colleagues + external developers → public, SEO-friendly, polished
4. UI language: bilingual, English default + Vietnamese toggle
5. Result layout: B — hex and field list side by side with hover sync
6. Hosting: GitHub Pages (free), custom subdomain iso.loiphoto.site

## How it gets made (builder's calls)

- **Tech**: no framework. One static HTML page + CSS + vanilla JS modules + JSON data files for the field dictionary and code tables. No build step, no dependencies. (My call — simple to maintain, fast page, zero supply-chain surface.)
- **i18n**: JSON dictionaries (en/vi), plain data attributes, no i18n library.
- **Tests**: Node built-in test runner (`node:test`) — no test framework dependency. Parser is a pure module, fully unit-tested with known vectors; UI smoke-tested manually.
- **Repo**: new public GitHub repo `iso8583-parser`; GitHub Pages deploy via Actions; CNAME = iso.loiphoto.site. DNS records added by the owner in their DNS console.
- **Product name**: working title "ISO 8583 Parser"; can brand later.

## Technical design

### Input normalization

The pasted text goes through a cleaner before any parsing:

1. Strip address/offset prefixes per line (e.g. `0000  `, `0000:`)
2. Strip trailing ASCII gutter columns (the printable-text column after a wide gap)
3. Remove whitespace; keep hex digits only (tolerate `0x` prefixes)
4. Keep the cleaned byte stream while the hex panel still renders faithfully against the source

### Message splitting

After normalization we have one byte stream that may hold several messages. Detection tries, in order:

1. **Length-prefixed frames**: 2-byte big-endian binary length header where the declared length lands exactly on the next message's start (or stream end)
2. **TPDU + MTI anchor**: a plausible 5-byte TPDU followed by a numeric MTI (0200/0210/0100/0110/0400/0410/0800/0810…)
3. **Bare MTI anchors** at any position

Every candidate boundary must survive validation: parse the bitmap, consume the declared fields, and reach exactly the claimed end. Candidates that parse consistently win; otherwise the whole stream is treated as one message. Each detected message gets a label (MTI meaning, Request/Response).

*Known risk:* NAPAS's exact length-header/TPDU framing is not publicly documented (spec is private to member banks). The heuristic above covers common variants; the owner can verify against real sanitized dumps. Mitigations: a manual "message starts here" override (click a byte in the hex panel) and the parser ignores leading non-message bytes by scanning. This risk is explicitly accepted for v1.

### Parsing core

- Locate MTI (4 numeric chars), read primary bitmap (8 bytes); if bit 1 is set, read the secondary bitmap (8 more bytes)
- For each present field, look up its format in the dictionary: fixed length or LLVAR/LLLVAR, content type (n numeric, an alphanumeric, ans, b binary, z track)
- Encoding selector: ASCII (default) / Hex-BCD / EBCDIC; numeric fields interpreted per encoding; DE 4 amount = minor units, decimal point placed using the ISO 4217 exponent from DE 49
- On any inconsistency (length mismatch, non-numeric MTI, trailing bytes), mark the offending field and the tail as uncertain — never silently relabel

### Field dictionary & code tables (data files)

- `fields.json`: ISO 8583:1987 DE 1–128 — name (en/vi), format, length; public-standard definitions
- Code tables: MTI meanings, DE 3 processing codes, DE 39 response codes, DE 49 currency codes (ISO 4217, incl. NAPAS 704 = VND)
- **Extensibility**: an optional `napas-custom.json` overlay (empty in the public repo) lets the owner load private/non-public definitions locally without committing them — keeps confidential material out of the public product

### UI (layout B)

- Input card: big textarea, Parse button, "Load sample" (synthetic message with fake PAN built in — never real card data), share button (copies a link with input in the URL hash; opt-in only)
- Summary strip: MTI meaning, processing code, response code, amount + currency, PAN (masked), STAN/RRN
- Split view: left = hex panel, bytes colored per field; right = field list (number, name, raw hex, decoded value, meaning); hover on either side highlights the same field in both
- Multi-message: one section per detected message (Request 0200 / Response 0210)
- EN/VI toggle; light/dark via prefers-color-scheme; mobile: split view stacks
- Footer: "100% client-side — messages never leave your browser" + link to the repo

### Share links

Parse input embedded in the URL fragment so a copied link reproduces a decode (like iso8583parser.com). Copying is user-initiated; nothing is sent anywhere.

### Testing strategy

- Unit tests (`node:test`): input cleaner, message splitter, bitmap walker, field decoder (ASCII/BCD/EBCDIC), code-table lookups, with hand-built message vectors including a request+response pair and a noisy hex dump
- Golden vectors stay in-repo (synthetic data only — no real PANs, ever)

### Deployment

- Public GitHub repo → GitHub Actions → GitHub Pages, custom domain iso.loiphoto.site (CNAME), HTTPS automatic
- Post-launch (not v1): submit to Google Search Console; optionally a privacy-friendly visit counter

### Success criteria

1. Owner pastes a real (sanitized) NAPAS log dump → correct fields on first try, no cleanup
2. Team colleagues use it for daily debugging
3. Site reachable at https://iso.loiphoto.site from a phone and a work laptop
4. Parser unit tests pass; no third-party requests in the network tab (privacy proof)

## Left to the builder

- Exact color palette and visual polish (design system applied during build)
- Sample message content (synthetic, realistic NAPAS shape)
- Repo name
