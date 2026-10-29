# ISO 8583 Parser

Free, client-side ISO 8583:1987 (NAPAS) message parser. Paste a hex dump from
your payment logs — offsets, spaces, timestamps and all — and read every
field, bilingual English/Vietnamese.

**Live:** https://iso.loiphoto.site

## Features

- **Paste anything from your logs** — `hexdump -C` / `xxd` output, app-log
  lines with timestamps, or plain hex, with request/response pairs and
  multiple messages in one paste
- **Full field decode** — MTI meaning, bitmap walk, fixed / LLVAR / LLLVAR
  fields, BCD and EBCDIC encodings
- **Meaningful summaries** — processing code, response code, amount with
  currency, masked PAN, STAN, RRN
- **Layout B**: color-coded hex panel beside the field list, hover a field
  to highlight its bytes (and back)
- **Share links** — copy a link that reproduces your paste (base64url in
  the URL fragment, nothing sent to any server)
- **Custom dictionary** — load your own per-field format overrides from a
  local JSON file; stored in your browser only, never committed
- **Light/dark** follows your OS; zero dependencies, zero external requests

## Privacy

100% client-side: your hex dumps never leave your browser. There is no
backend, no analytics, no tracking.

## Development

```bash
npm test        # Node's built-in test runner, zero dependencies
npm run serve   # static dev server at http://localhost:8000
```

Plain ES modules, no build step. Tests use synthetic message fixtures only —
no real card data, ever.

## Deployment

GitHub Pages with a custom domain: pushes to `main` deploy via
`.github/workflows/pages.yml`; `CNAME` points to `iso.loiphoto.site`
(DNS: CNAME `iso` → `loiphoto.github.io`).

## Custom dictionary

Field formats beyond the public ISO 8583:1987 dictionary can be overridden
per data element via a JSON file like:

```json
{ "55": { "format": "lllvar", "type": "b", "maxLen": 255 } }
```

The overlay is validated, kept in your browser's `localStorage`
(`napasCustom`), and is never sent or committed anywhere — keep any
proprietary formats local.
