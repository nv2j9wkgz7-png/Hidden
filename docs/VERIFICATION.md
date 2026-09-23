# V0 verification — 2026-09-22

- `npm test`: **24 passed**, zero failures. Includes the exact Postgres migration, draft publishing/edit ownership, paid access, refund revocation, duplicate/out-of-order events, payment amount/provider/currency matching, RLS grants, durable rate limiting, real Stripe signature verification, checkout resume states, and actual Sharp preview generation.
- `npm run build`: **passed**, all App Router routes compiled.
- `npm run typecheck`: **passed**.
- npm dependency audit at installation: **zero reported vulnerabilities**.
- Running production preview: `APP_URL=http://127.0.0.1:3000 npm run start`.
- Playwright CLI: two cross-origin API checks passed; four browser cases could not launch Chrome because the desktop sandbox aborted the process. This is not recorded as an all-green browser suite.
- Equivalent UI checks performed in the Codex in-app browser: home rendering at 1440px and 390px widths, no horizontal overflow, create-drop navigation to the unconfigured setup screen, return-home navigation, and missing-page handling. The app preview is left open.
- The development watcher encountered this machine's open-file limit. Production preview ran successfully. README documents polling and production-preview alternatives.

## Still requires live service validation

No Supabase or Stripe account credentials were supplied. Real signup/email confirmation, real object-store uploads and signed downloads, hosted checkout, Apple Pay/Cash App Pay eligibility, and end-to-end webhook delivery were **not** exercised against those services. Database/payment tests use an isolated Postgres instance and signed Stripe fixtures, not a live charge. Complete the README's live checklist after configuration.

No remote repository URL was supplied during implementation. A local commit and portable Git bundle are available; push to a shared Git host before expecting to pull from another computer. Never include `.env.local` in a commit or bundle.

## Photo/video uploads and drag ordering — September 23, 2026

- Applied `20260924010000_media_and_order.sql` in the production Supabase SQL editor as one transaction. Original storage remains private; public previews remain reduced, watermarked JPEGs.
- JPEG/PNG/WebP: 10 MiB per image. MP4/MOV/WebM: 50 MiB per video. Up to 20 files and 200 MiB per drop. Folder selection and recursive folder drops flatten supported contents into the collection.
- Video originals are preserved, not transcoded. Server-side FFmpeg extracts a still frame with forced demuxers, network protocols disabled, resource limits and a timeout; the existing Sharp pipeline blurs and watermarks it. Browser playback depends on codec support; original downloads remain available.
- Drag grip supports pointer/touch input, edge scrolling, keyboard arrows and Escape cancellation. First file determines the cover. Order persists on Review drop using an ownership-checked, draft-only transaction. Draft review links back to the uploader to reorder/add files.
- 47 automated tests passed, including actual MP4/MOV/WebM decoding, disguised-file rejection, nested-folder batches, size limits, atomic ordering and cross-creator/anonymous/published-drop rejection. Production build and type check passed.
- Real local API against production Supabase: temporary account, image/video upload, server JPEG previews, saved reverse order, private-original rejection and unpaid-download rejection passed. Temporary account, rows and storage objects removed.
- Browser: nested-folder chooser loaded two photos and a video; dragging last file to first updated cover; full video viewer opened. Phone viewport automation was unavailable; physical iOS validation remains outstanding.
- Header now shows Log in to guests. Primary button gradients no longer transition through transparent backgrounds.
