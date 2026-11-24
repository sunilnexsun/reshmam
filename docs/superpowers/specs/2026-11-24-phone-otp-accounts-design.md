# Customer accounts with mobile OTP, and admin security — design

Date: 2026-11-24 · Status: draft for approval (reviewed; client decisions included)

## Intent

RESHMAM's site has no working customer accounts: `/account` says "Customer accounts are being set up" because the
old Supabase email-link sign-in was never switched on. The client wants customers to create an account and log in
with their **mobile number and a one-time password (OTP)**, in a pop-up designed by the client. The mockup is
saved next to this document: [`2026-11-24-phone-otp-accounts-mockup.webp`](2026-11-24-phone-otp-accounts-mockup.webp)
("Create Your Account Flow" and "Log In Flow"). Screens the mockup doesn't show (errors, the phone layout) follow
its style. The team is moving fully to **Firebase** (project `reshmam-oil`);
Supabase is no longer wanted.

Customer sign-in will be the first time anyone signs in to Firebase Auth on this project. The current Firestore
rules and admin panel assume nobody does, so **admin security has to be fixed in the same project** or every
signed-in customer would become an admin.

## Goals

1. **Sign-in pop-up** matching the client's mockup:
   - *Create account:* step 1 "Your Details" (full name, required; email, optional) → step 2 "Mobile" (+91,
     10 digits) → step 3 "Verify OTP" (6 boxes, resend timer, "Change Mobile Number") → "Account Created
     Successfully!" with **Continue Shopping** and **Go to My Account**.
   - *Log in:* mobile → OTP → "Logged In Successfully!" with the same two buttons.
   - Left panel: green brand panel with the Reshmam logo, "PURE. TRADITIONAL. TRUSTED.", "Create Your Account",
     and the four points (Place Orders, Track Deliveries, Save Favourites, Manage Your Profile). On phones the
     panel collapses to a slim header strip so the form fits.
   - Headings in a Bookman-style bold italic (see Look).
2. **Staying signed in** on that device until the customer signs out (Firebase Auth's default persistence).
3. **My Account** page (`/account`): name, email (editable) and mobile (shown, not editable), Sign out, and
   **order history** for orders placed while signed in.
4. **Checkout knows the customer:** when signed in, checkout fills in name, email and phone, and the order is
   linked to the account so it appears in order history.
5. **Cart and wishlist saved to the account** and merged with the browser's on sign-in, so they follow the
   customer across devices.
6. **Admin security fixed** (prerequisite for going live): admins sign in with real Firebase Auth, Firestore
   rules tell customers and staff apart **and enforce each staff role's permissions** (decided by the client),
   admin-only API routes check the caller, and plain-text passwords are removed.
7. **Supabase removed** from customer accounts (sign-in, cart/wishlist sync, order history API).

## Non-goals (this project)

- Saved delivery addresses and live delivery tracking ("Manage Your Profile" covers name and email for now).
- Linking orders placed **before** signing up (as a guest) to the new account.
- Moving the contact form and the Razorpay webhook off Supabase. They still use Supabase. This is a separate
  follow-up.
- A custom SMS sender ("RESHMAM" sender ID). Firebase's default sender is used. Changing it later is possible
  (approach B below).
- Email/password or social logins for customers.

## Anti-goals (would make this a failure even if it "works")

- Any signed-in customer able to read other customers' data or orders, or change products, prices, stock or
  orders.
- Admin passwords readable by anyone, or admin data returned by an unauthenticated API.
- Orders whose prices come from the browser (prices must stay server-computed, as today).
- A sign-in flow that locks out customers on phones (reCAPTCHA puzzles shown to normal users, layouts that
  overflow).

## Approaches considered

| | How | Trade-offs |
|---|---|---|
| **A. Firebase phone sign-in in the browser + Firestore** (chosen) | Firebase Auth `signInWithPhoneNumber` with an invisible reCAPTCHA; profile, cart and wishlist in `customers/{uid}`; server verifies the customer's ID token. | Fewest moving parts, no SMS contract, fits the existing Firebase project. Firebase's sender name on the SMS; pay per SMS past the free daily quota. |
| B. Own SMS provider (e.g. MSG91) + Firebase custom tokens | Server sends and checks OTPs through an Indian SMS provider, then mints Firebase custom tokens. | "RESHMAM" sender and cheaper at volume, but needs DLT sender/template registration (weeks), a provider account, and more server code. |
| C. Like A, but all account reads and writes through server routes | Browser never reads Firestore for account data. | Duplicates what security rules do; more code for no extra safety once the rules are right. |

For staff roles, the client chose **enforcing role permissions in the database**, rather than only separating
staff from customers and leaving role limits to the admin screens. It's safer but costs bigger rules and more
tests.

The client chose **A**. Including the admin security fix adds one requirement to A: **server routes use the
Firebase Admin SDK** (a service-account key on Vercel). Today checkout, order lookup, the Cashfree callbacks
and the admin routes use the public browser SDK, which only works while the Firestore rules are open. Once the
rules are locked down, those routes need admin access.

## Design

### Firebase setup (one-time, needs the Firebase project owner)

- Authentication → enable **Phone** (customers) and **Email/Password** (admins).
- Authentication → Settings → Authorized domains: add `reshmam.vercel.app` and the production domain;
  `localhost` is there by default.
- Optional for testing: add test phone numbers with fixed OTPs (no SMS sent).
- Create a **service account key** and add it to Vercel as `FIREBASE_SERVICE_ACCOUNT` (JSON). Locally it goes in
  `.env.local`. Document the variable in `.env.example`.
- Deploy `firestore.rules` and `storage.rules` with the Firebase CLI **after** the admin migration (below).
- Billing: SMS beyond Firebase's free daily allowance needs the Blaze plan.

### Data model (Firestore)

- `customers/{uid}`: one document per signed-in customer, id = Firebase Auth uid. This keeps the admin panel's
  existing `customers` list working.
  - Customer-editable fields: `name`, `email`, `cart` (array of `{variantId, quantity}`), `wishlist` (array of
    product slugs/ids), `updatedAt`.
  - Set on creation, then read-only to the customer: `id`, `phone` (from the verified sign-in, E.164
    `+91XXXXXXXXXX`), `createdAt`, `source: "website"`.
  - Admin-only fields the admin panel already uses (`status`, `notes`, totals, …) can't be written by the
    customer.
  - Existing guest-checkout customer documents (`c_…` ids) stay as they are.
- `orders/{id}`: unchanged shape. When the customer is signed in, the server sets `customerId` to their uid,
  so the existing rule "a customer can read orders where `customerId == auth.uid`" gives them order history.
  Customer totals aren't stored; the admin panel computes them from orders, so checkout doesn't write totals.
- `adminUsers/{uid}`: staff records, **re-keyed to the staff member's Firebase Auth uid**. The `password` field
  is removed. `role` (Admin/Manager/Staff) and `status` (Active/Inactive) stay.

### Firestore rules (rewritten)

- `isStaff()` = signed in **and** `adminUsers/{request.auth.uid}` exists with `status == "Active"`. Customers
  are never in `adminUsers`, so they get no staff rights.
- **Role permissions are enforced by the database** (client decision). Roles live in
  `configs/settings.roles[<role>].permissions[<module>]` with levels `none` / `view` / `manage`, as the admin
  panel already defines them (modules: dashboard, products, categories, brands, orders, prices, inventory,
  branches, customers, marketing, whatsapp, chatbot, reports, settings). Helpers:
  `can(module, level)` reads the staff member's `role` from `adminUsers/{uid}` and that role's level from
  `configs/settings`. The **Admin** role always has `manage` on everything, whatever the config says, so an
  Admin can't lock everyone out.
- **Collection → module** (read needs `view`, write needs `manage`):

  | Collection | Module |
  |---|---|
  | `products` | products |
  | `categories` | categories |
  | `brands` | brands |
  | `variants` | see below |
  | `priceHistory` | prices |
  | `stockMovements` | inventory |
  | `branches` | branches |
  | `orders` | orders |
  | `customers` | customers |
  | `coupons`, `campaigns`, `banners` | marketing |
  | `configs/whatsapp` | whatsapp |
  | `configs/chatbot` | chatbot |
  | `configs/settings` | settings (write: Admin role only, because it holds the roles themselves) |
  | `adminUsers` | settings (write: Admin role only; any staff can read their own record) |
  | `activities` | any active staff can create; read needs dashboard `view` |

- **`variants` field-level rule:** `products: manage` may change anything. `prices: manage` may change only
  `price`, `mrp` and `updatedAt`. `inventory: manage` may change only `stock`, `alertStock` and `updatedAt`.
  Create and delete need `products: manage`.
- Public reads stay public where the storefront needs them (catalogue, banners, coupons), regardless of role.
- Catalogue (`products`, `variants`, `categories`, `brands`, `branches`, `banners`, `coupons`): public read,
  admin write. This matches today's intent.
- `configs/{settings,whatsapp,chatbot}` (admin configuration, including staff and roles): **admin-only**. The
  storefront doesn't read these; only `/api/admin/firestore` does. The unused `settings/` and `chatbot/`
  collections in today's rules are dropped.
- `customers/{uid}`: create only by that signed-in user (uid matches, phone matches the auth token's phone,
  allowed fields only); read by that user or an admin; update by that user limited to the customer-editable
  fields, or by an admin; delete by an admin.
- `orders`: read by staff with `orders: view` or the order's `customerId == auth.uid`. **No client create.** Orders are created
  only by the server with the Admin SDK, which bypasses the rules. Today's `create: if true` lets anyone write
  orders with any prices directly. Updates and deletes: staff with `orders: manage`.
- `storage.rules` writes and deletes need `products: manage` for product images and `marketing: manage` for
  banners. Storage rules can read Firestore (`firestore.get`) to check the role.
- In these rules, "admin" below means "staff with the relevant permission".

### Server (Next.js routes)

- New `src/lib/firebase-admin.ts` (server-only): initialises the Admin SDK from `FIREBASE_SERVICE_ACCOUNT` and
  exposes `adminDb`, `adminAuth` and `verifyIdToken(req)` (reads `Authorization: Bearer <Firebase ID token>`).
- **Checkout** (`api/checkout`), **order lookup** (`api/orders/lookup`) and the **Cashfree verify/webhook**
  routes switch to the Admin SDK for Firestore. Checkout: if a valid customer ID token is sent, use
  `customerId = uid` (the verified phone from the token wins over the checkout form's phone). Otherwise it's a
  guest order, as today. Pricing stays server-side. Shared order helpers (`markOrderPaid`, `markOrderFailed`)
  also move to the Admin SDK, since the Razorpay routes use them too.
- **Admin routes:** `GET/POST /api/admin/firestore` and `GET /api/admin/auth` require an ID token from active
  staff (`verifyIdToken` + `adminUsers/{uid}` check), and use the Admin SDK. Because the Admin SDK bypasses the
  rules, **these routes enforce the same role permissions in code**: a shared permission module
  (collection → module map, the `variants` field rules, and the Admin-only rules for `adminUsers` and
  `configs/settings`) is used by the routes. Its tests and the rules tests check the same cases, so the two
  can't drift. `GET` returns only the collections the caller may view, and never `password` fields. `POST /api/admin/auth` (plain-text
  password check) is removed. Creating, disabling and resetting staff goes through a new admin-only route that
  uses `adminAuth` to create, disable and update Firebase Auth users.
- **Catalogue reads** (`fetchDynamicProducts` etc.) may stay on the public SDK, because catalogue reads remain
  public.

### Admin panel

- Login uses Firebase `signInWithEmailAndPassword`. The panel's session is the Firebase Auth session, not a
  user id in localStorage. Signing out signs out of Firebase.
- The panel sends the admin's ID token on its calls to `/api/admin/*`. Its direct-SDK fallback writes work
  because the staff member is now signed in and the rules check their role.
- Team settings (add, disable or reset a user) call the new admin-only route instead of writing passwords into
  Firestore.

### Admin migration (one-time, before deploying the new rules)

- Script `scripts/migrate-admin-users.mjs` (Admin SDK): for each `adminUsers` record, create a Firebase Auth
  email/password user, copy the record to `adminUsers/{uid}`, delete the old document and drop `password`.
  Dry-run by default; `--apply` writes. Prints a summary without passwords.
- *(Builder's call, settled in review.)* **Passwords:** a staff member keeps their current password **only if it
  isn't one of the seed defaults** shipped in `src/app/admin/_lib/seed.js` (`Admin@123`, `Manager@123`,
  `Staff@123`). Otherwise the account gets a random password, and the summary lists that email as "must use
  Forgot password". The new admin login screen has a "Forgot password?" link (Firebase
  `sendPasswordResetEmail`).
- **Scrub the other copy:** `configs/settings` also holds `users` (with plain-text passwords) because the admin
  panel saves the whole settings object there. The migration removes every `password` field from it, and the
  admin panel stops writing passwords anywhere.
- The admin panel stops being described as a "demo": remove the `DISABLE_ADMIN_DEMO` gate and the demo-login
  hints on the login screen and in `.env.example`.
- Order of go-live: deploy the code (admin login via Firebase) → run the migration → deploy the rules → enable
  customer Phone sign-in.

### Customer sign-in (browser)

- Customers and admins use separate named Firebase apps in the browser, so a staff member signed in to the
  admin panel and a customer session on the same site don't mix.

- `src/app/(storefront)/_components/account/SignInDialog.tsx`: the pop-up. A small state machine:
  `details → mobile → otp → done` (create) and `mobile → otp → done` (log in). It switches between the two flows
  with a link ("New here? Create an account" / "Already have an account? Log in").
- **Phone sign-in:** `RecaptchaVerifier` (invisible, attached to the Send OTP button) →
  `signInWithPhoneNumber("+91" + digits)` → `confirmationResult.confirm(code)`.
  - **Create:** on success, write `customers/{uid}` with name, optional email and phone. *(Builder's call,
    settled in review.)* If `customers/{uid}` already exists, the number already has an account: they're signed
    in, their saved name and email are **kept, not overwritten**, and the success screen says "Welcome back,
    you already have an account" instead of "Account Created".
  - **Log in:** if the number has no customer record, offer to create one (switch to the details step with the
    number kept).
- **OTP input:** 6 single-digit boxes, auto-advance, backspace goes back, paste fills all 6, and
  `autocomplete="one-time-code"` so phones can autofill the SMS code. Resend is enabled after 30 seconds.
  "Change Mobile Number" goes back to the mobile step.
- **Errors in plain language:** wrong code, code expired, too many attempts (Firebase `too-many-requests`),
  invalid number, and no network. Never show raw Firebase error codes.
- **Entry points:** the header person icon opens the dialog when signed out and goes to `/account` when signed
  in. `/account` shows a "Log in / Create account" prompt that opens the dialog. The checkout page offers "Log
  in for faster checkout" (optional; guest checkout stays).
- **Accessibility:** a real dialog (`role="dialog"`, labelled, focus trapped, Esc and × close, focus returned),
  labelled inputs, error text linked to inputs, and the step progress announced.

### Account state

- `src/app/(storefront)/_lib/customer-auth.ts`: `onAuthStateChanged` wrapper and a `useCustomer()` hook
  (`{ user, profile, loading }`). `profile` comes live from `customers/{uid}`.
- **Cart and wishlist sync** (`account-sync.ts`, rewritten for Firestore): on sign-in, merge the browser's
  lists with the account's (same rules as today: union, larger quantity wins; first sign-in on a device merges,
  later visits take the account's lists), then save changes after a short delay. On sign-out, clear the browser
  copy. The existing merge functions and their tests carry over.
- Remove `supabase-browser.ts`, the Supabase `AccountPanel`, `api/account/orders`, and the Supabase parts of
  `account-sync`. Remove `@supabase/supabase-js` only if nothing else needs it; the contact form and Razorpay
  webhook still use it (non-goal).

### My Account page

- Signed out: brand-styled prompt with "Log in" and "Create account" buttons (opening the dialog), plus the
  existing quick links (wishlist, cart, track order).
- Signed in: profile card (name and email editable inline; mobile shown), Sign out, order history (Firestore
  query `orders where customerId == uid`, newest first, limit 50; order number, date, status, total, items),
  and the quick links.

### Look

- Dialog layout per the mockup. Desktop: two columns (green panel about 40%, form about 60%), max width about
  900px. Phones: one column with a compact green header.
- **Headings** (dialog titles, the left panel's "Create Your Account", success titles): Bookman-style bold
  italic. Font stack: `"Bookman Old Style", "TeX Gyre Bonum", "URW Bookman", serif` at weight 700, italic.
  **TeX Gyre Bonum Bold Italic** (free, GUST Font License) is self-hosted as a WOFF2 so everyone sees it.
  Visitors with Bookman Old Style installed get that first. Body text stays Inter.
- Colours, buttons and inputs reuse the storefront's existing tokens and components.

## Testing

- Unit: OTP input behaviour (paste, backspace, autofill), dialog state machine, the account-sync merge rules
  (existing tests ported to Firestore fakes), checkout linking `customerId` when a valid token is sent and
  ignoring an invalid one.
- **Firestore rules tests** with the Firebase emulator (`@firebase/rules-unit-testing`): a customer can read
  and update only their own record and allowed fields; can't read others' orders; can't write products or
  orders. **Per role**, using the default roles (Admin, Manager, Staff), for each collection: view and manage
  allowed or refused as the table says. That includes the `variants` field rules (Staff can change stock but
  not price) and Admin-only writes to `adminUsers` and `configs/settings`. Also: an inactive staff member is
  refused everything, and an Admin keeps full access even if `configs/settings` were edited to remove it.
- **Permission module tests** for the server routes covering the same matrix.
- API tests: admin routes refuse requests without a valid admin token; lookup and checkout work through the
  Admin SDK (faked).
- Manual: Firebase test phone numbers for the full create and log-in flows on desktop and phone sizes; a real
  SMS once on the deployed site.

## Rollout and risks

- **Order matters:** the new rules must not be deployed before admins can sign in with Firebase Auth, and
  customer Phone sign-in must not be enabled before the new rules are deployed.
- The current deployed rules may be more open than `firestore.rules` in the repo (the admin panel's
  unauthenticated writes only work if they are). Check the deployed rules in the console before switching.
- SMS cost and quotas: set a Firebase budget alert. reCAPTCHA can occasionally show a challenge; that's
  expected.
- Admin passwords are currently stored in plain text in Firestore. After migration, recommend every staff
  member changes their password.

## Left to the builder

- File layout within the existing structure, component breakdown, and exact copy beyond the mockup.
- Whether the Admin SDK lives in `src/lib` or `_lib/server`.
- Emulator wiring for tests.
- Exact timings (resend timer, sync delay), within the values above.
