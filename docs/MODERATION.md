# Reporting and moderation

Shared drops have a Report this drop form. Reports are private, rate-limited, deduplicated by a hashed IP/drop/day key, and ordered by severity then age. Contact email is optional and unverified. Reporting never changes sales or access automatically.

## Private review

`/admin` requires a verified server session and a user ID in the service-only `moderation_admins` table. Each page and API checks the role independently. The account menu shows Review reports only for that role. Never authorize from email or editable user metadata.

The initial admin account uses team@sendhidn.com. Its password is chosen through the normal email recovery flow. No password or recovery token is stored in this repository.

Every action requires a reason, records its actor and request ID, and supports safe retries:

- Pause sales: block new purchases, expire open provider checkouts; retain paid buyer access.
- Remove content: hide the drop, deny original access/downloads and delete public previews. Retain private originals for review. Removal is not reversible through this UI.
- Suspend creator: block creating, uploading, publishing and new sales across their drops. Existing paid access remains unless a drop is removed.
- Resume/restore: requires pending cleanup to finish; does not reopen creator-closed sales or override another restriction.
- Resolve/dismiss: close the report without changing existing restrictions.

Originals load for moderators only after choosing View originals for review. Signed original URLs last 60 seconds. Previously issued URLs, cached previews and downloaded copies cannot be recalled instantly. No moderation action automatically refunds a payment; handle refunds separately through the payment provider. Completed payment events still record the financial truth.

## Deployment and cleanup

Apply `supabase/migrations/20260924060000_moderation.sql` before deploying the application. Its new fields default to unrestricted, so existing drops are unchanged. Database guards complement API checks.

Restrictions commit before external cleanup. Pending cleanup persists in `moderation_cleanup`; the queue and report show a warning after provider/storage failure. Open the related report and use Retry cleanup. A run handles up to 100 drops; repeat until no pending work remains. Concurrent updates preserve new pending jobs. Review pending work before resuming sales. This is an operator-driven queue, not an unattended cleanup worker.

Testing covers SQL authorization, idempotent actions, report-only behavior, restoration guards, anonymous/authenticated privilege isolation, reporting validation/deduplication, and removed-content access. Provider failures can leave existing checkouts temporarily usable until cleanup succeeds; inspect completed payments and refunds when reviewing a removal.
