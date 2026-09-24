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

## Follow-pointer drag interaction — September 23, 2026

Replaced immediate row swapping with dnd-kit sorting and a body-portal drag overlay. The lifted card follows pointer/touch movement, neighbouring rows animate into place, a dashed destination shows the drop position, and release animates the card into its slot. The grip is 44px wide; ordinary thumbnail/removal clicks and touch scrolling outside the grip remain available. Keyboard uses Space to pick up/drop, arrows to move, and Escape to cancel. Reduced-motion preferences disable decorative tilt and settling animation. Browser checks verified visible lift/placeholder, pointer last-to-first reorder and cover update, keyboard reorder/drop, and Escape preserving the original order. No database or upload behavior changed.

## Arrow 2 UI refinement — September 23, 2026

Used Arrow 2 in the existing Hidn branding conversation to generate a complete mobile upload-screen concept, then requested a focused typography and label correction. Adapted the compact upload controls, file hierarchy, cover badge, and progressive disclosure into responsive React components. Existing ribbon artwork, photo/video upload behavior and drag overlay remain in place.

The first-drop CTA now opens signup directly and preserves new-drop intent through login. Confirmation routing accepts only the literal `next=new` intent; arbitrary redirect URLs are never used. Added a password visibility toggle and an eight-character signup hint. Authentication form state resets when navigating between login/signup entry URLs.

Verification: all 47 automated tests and the production build passed. Browser checks at 390px and 320px plus desktop confirmed file selection, thumbnails, drag reorder and cover update, full-size preview, file-limit disclosure, and password show/hide. Narrow-screen overflow was found and corrected; the 320px document width is 320px. Grip, preview and remove targets measured 44x48, 56x56 and 44x44px. Verified guest CTA destination, default signup, and navigation back to login. Temporary UI fixture removed before production build. No real signup email or new paid transaction was triggered; physical iOS behavior still needs device confirmation.

## Draft recovery, buyer preview, sale notifications and interaction feedback

- The creator form keeps an account-scoped IndexedDB recovery copy of incomplete details and pending File objects. Valid title/price pairs sync to the saved draft after a short pause; unfinished details stay on the current device. Uploaded originals are removed from the recovery copy after successful sync. Storage failures display a warning, and navigation away from active uploads triggers the browser's unload protection where supported.
- Uploads show per-file byte progress, continue after individual failures, and offer a retry button. Retrying first checks whether the server already received the file, preventing unnecessary retransfers after a lost response. Saved files are skipped. File order uses the existing ownership-checked reorder transaction.
- Draft detail editing returns to the autosaving editor. The owner-only buyer preview uses the same buyer component and only generated blurred previews; checkout and purchase-access recovery are disabled there. Public draft URLs remain unavailable.
- Applied `20260924020000_sale_notifications.sql` through the Supabase SQL editor. The trigger records one notice per newly confirmed sale in the payment transaction; existing sales are not backfilled. Creator-only notifications show an unread count, refresh every 30 seconds while the page is visible, support marking displayed items as read, and link to the drop and earnings. Refunded purchases are labeled as refunded.
- Creator sale emails use the authenticated account email from Supabase, a separate Resend idempotency key and durable delivery marker. Buyer and creator email failures retry independently through webhook retries; the protected purchase-email retry endpoint also drains pending creator sale messages. These messages report gross sale totals before fees and do not contain buyer emails, private file links, or payout promises. No real test emails were sent for this change.
- Copy actions show one shared “Link copied” toast only after clipboard success. Account choices, outside clicks and Escape close the account menu.
- Regression checks exercise a failed upload followed by a targeted retry, recovery of a lost upload response, sale-notice uniqueness and creator isolation, and independent creator/buyer email retries. Browser checks with a temporary local fixture verified draft text recovery after reload, the copy toast, menu closure on selection, disabled buyer-preview checkout, and the mobile editor layout. The fixture was removed before the production build.

Blackout mode is available in the Account menu, with a compact moon/sun toggle beside Log in for guests. The preference is stored on the device and applied in the document head before painting the page. It also follows changes made in other Hidn tabs. Dark surfaces cover the editor, account and notification menus, buyer checkout, examples, forms and payout cards; media content retains its original colors.
