# E-commerce release test suite

Run this suite before deploying a build that changes catalog, checkout, payments,
delivery, seller payouts, or permissions:

```bash
npm run test:commerce
```

The suite uses a temporary in-memory MongoDB instance and an ephemeral local API
server. It does not read or alter the development database, real payment gateway,
or customer data.

## Release gates covered

| Area | Rules verified |
| --- | --- |
| Access control | Anonymous users are blocked from protected endpoints; buyers cannot access admin data; staff permissions are enforced. |
| Catalog moderation | New seller listings are drafts and are invisible in the public catalog; sellers cannot approve their own listings. |
| Checkout | Unsupported payment methods fail; a cart with several sellers creates one order and a payout per seller; stock decrements; overselling is rejected. |
| Order privacy | Only the buyer, a seller participating in the order, or authorized staff can view the order. |
| Payments | The mock payment callback confirms an order, is idempotent, and does not release payouts before delivery. |
| Fulfilment | Payment confirmation creates delivery work; only authorized logistics staff can set fees and mark delivery complete. |
| Marketplace payouts | Payouts become eligible only after delivery; sellers can see but cannot process payouts; finance staff cannot pay twice. |
| State integrity | A delivered order cannot regress to a pre-payment state or be cancelled. |
| Webhook safety | Invalid or unknown callbacks are rejected. |
| Marketplace math | Each seller's commission and payout amount are checked independently. |

## What must pass

All tests must pass. A failure in checkout, payment, delivery, payout, authorization,
or webhook cases is a release blocker because it could lead to incorrect orders,
money movement, or data exposure.

## Extending it

Add each new marketplace rule to `server/tests/security.test.js` using the existing
`api()` helper and isolated test accounts. Prefer externally observable assertions
(HTTP status, response body, and persisted record state) over controller mocks.
For payment providers, keep real credentials out of tests and add signed fixture
tests for each provider webhook.
