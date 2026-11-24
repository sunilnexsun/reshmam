# Mobile OTP Customer Accounts and Admin Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customers create accounts and log in with mobile + OTP (Firebase phone sign-in) through the client's pop-up, with profile, order history and cart/wishlist saved to their account. Admin security is fixed first so customers get no staff rights and staff roles are enforced by the database.

**Architecture:** Firebase only. The browser uses Firebase Auth (phone for customers, email/password for staff, in separate named apps) and Firestore under rewritten security rules that check staff roles from `adminUsers/{uid}` + `configs/settings.roles`. Server routes switch to the Firebase Admin SDK (service account) and enforce the same role permissions through one shared permission module. Supabase is removed from customer accounts.

**Tech Stack:** Next.js 16 (App Router, Cache Components), React 19, TypeScript, `firebase` v13 (client), `firebase-admin` (server), `firebase-tools` + `@firebase/rules-unit-testing` (rules tests on the emulator; Java 21 present locally), Vitest 4.

**Spec:** `docs/superpowers/specs/2026-11-24-phone-otp-accounts-design.md` (mockup alongside: `2026-11-24-phone-otp-accounts-mockup.webp`). Read both before starting.

## Global Constraints

- Firebase project: `reshmam-oil`. Server credentials come only from env `FIREBASE_SERVICE_ACCOUNT` (the service-account JSON as one string); never commit a key.
- Customer phone numbers: India only, stored and compared as E.164 `+91XXXXXXXXXX`; the user types 10 digits starting 6–9.
- OTP: 6 digits; "Resend OTP" enabled after **30 seconds**.
- Staff permission levels: `none` / `view` / `manage`; modules exactly as `PERMISSION_MODULES` in `src/app/admin/_lib/seed.js`. **Admin role always has `manage` on everything**, whatever `configs/settings.roles` says.
- Seed default passwords that must never carry over: `Admin@123`, `Manager@123`, `Staff@123`.
- Orders are created only by the server (Admin SDK). No client-side order creation, and prices are always computed on the server (existing `priceCart`).
- Supabase stays only for the contact form and the Razorpay routes (spec non-goal). Everything account-related moves to Firebase.
- Customers and staff use separate named Firebase client apps: customer app name `reshmam-customer`; admin keeps the default app.
- Heading font stack for the sign-in pop-up and My Account: `"Bookman Old Style", "TeX Gyre Bonum", "URW Bookman", serif`, weight 700, italic.
- Git: branch from `sunil/master` as `feature/phone-otp-accounts`. Commits are authored by the user's identity with **no Claude attribution or co-author trailers**. Commit after each task; CI (`npm run lint`, `npm test`, seed check, `npm run build`, `npx tsc --noEmit`) must pass at every commit.

## Review Focus

1. **A signed-in customer edits their own `customers/{uid}` to add staff-looking fields** (`status`, `role`, `notes`) or a different `phone`. Expected: refused by the rules. Pinned in Task 3.
2. **A staff member set to Inactive while still signed in** makes another request. Expected: refused by the rules and by `/api/admin/*` on the next request. Pinned in Task 3 and Task 4.
3. **OTP arrives by paste or SMS autofill with spaces or dashes** (`"123 456"`, `"123-456"`). Expected: all 6 boxes fill and the code verifies. Pinned in Task 10.
4. **Mobile typed with a prefix or spaces** (`+91 98765 43210`, `09876543210`, `98765-43210`). Expected: normalised to 10 digits and accepted. Numbers not starting 6–9 or not 10 digits are refused before any SMS is sent. Pinned in Task 11.
5. **Checkout with an expired or forged ID token.** Expected: treated as a guest order (no error), never linked to an account. With a valid token, the token's phone overrides the form's phone. Pinned in Task 5.

---

### Task 1: Firebase Admin SDK module

**Files:**
- Create: `src/lib/firebase-admin.ts`
- Modify: `package.json` (add `firebase-admin`), `.env.example` (document `FIREBASE_SERVICE_ACCOUNT`)
- Test: `tests/lib/firebase-admin.test.ts`

**Interfaces:**
- Produces: `adminDb(): Firestore`, `adminAuth(): Auth` (from `firebase-admin/firestore`, `firebase-admin/auth`), both lazily initialised from `FIREBASE_SERVICE_ACCOUNT`, throwing `FirebaseAdminNotConfigured` when the env is missing. `bearerToken(req: Request): string | null`. `verifyIdToken(req: Request): Promise<DecodedIdToken | null>`, which returns null for a missing, malformed, expired or forged token and never throws. The module imports `"server-only"`.

- [ ] **Step 1: Write failing tests** (mock `firebase-admin/app`, `firebase-admin/auth`):
  - `bearerToken` returns `"abc"` for `Authorization: Bearer abc`, and null for no header, `Basic x`, or `Bearer ` with nothing after it.
  - `verifyIdToken` returns the decoded token when `auth.verifyIdToken` resolves, and null when it rejects or there's no header.
  - `adminDb()` throws `FirebaseAdminNotConfigured` with no env; with env it initialises once (two calls → `initializeApp` called once).
- [ ] **Step 2:** `npx vitest run tests/lib/firebase-admin.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** `npm i firebase-admin` and implement the module. Use a named admin app `reshmam-admin-server` so it never clashes with client apps. Parse the JSON env once.
- [ ] **Step 4:** Run the tests. Expected: PASS. Then `npx tsc --noEmit` passes.
- [ ] **Step 5:** Commit `feat: add Firebase Admin SDK helper for server routes`.

### Task 2: Shared staff permission module

**Files:**
- Create: `src/lib/staff-permissions.ts`
- Test: `tests/lib/staff-permissions.test.ts`

**Interfaces:**
- Produces:
  - `type Level = "none" | "view" | "manage"`; `type Module` = the `PERMISSION_MODULES` union.
  - `type Roles = Record<string, { permissions: Partial<Record<Module, Level>> }>`; `DEFAULT_ROLES: Roles` (same values as `seed.js`: Admin all manage; Manager all manage except settings/whatsapp/chatbot view; Staff all view except orders/inventory manage and marketing/whatsapp/chatbot/settings/reports none).
  - `levelFor(role: string, roles: Roles, module: Module): Level` (Admin → `"manage"` always).
  - `canAccess(args: { role: string; roles: Roles; col: string; docId?: string; op: "read" | "write"; changedFields?: string[]; selfUid?: string }): boolean`.
- Rules it encodes (the spec's table): `products`→products, `categories`→categories, `brands`→brands, `priceHistory`→prices, `stockMovements`→inventory, `branches`→branches, `orders`→orders, `customers`→customers, `coupons|campaigns|banners`→marketing, `configs/whatsapp`→whatsapp, `configs/chatbot`→chatbot. `configs/settings` and `adminUsers` write only for the Admin role, read with `settings: view` (and `adminUsers/{selfUid}` is readable by its own user). `activities`: create by any staff, read with `dashboard: view`. `variants` writes: `products: manage` any field; `prices: manage` only `price|mrp|updatedAt`; `inventory: manage` only `stock|alertStock|updatedAt`. Any unknown collection is refused.

- [ ] **Step 1: Write failing tests**, table-driven over `DEFAULT_ROLES`:
  - Staff: `orders` write true; `products` write false; `coupons` read false; `variants` write with `["stock"]` true, with `["price"]` false.
  - Manager: `configs/settings` write false; `adminUsers` write false; `products` write true.
  - Admin with `roles.Admin.permissions = {}` (config wiped): still `products` write true.
  - Unknown role → false everywhere; `unknownCollection` → false for Admin.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement as a pure module with no Firebase imports, so the rules tests (Task 3) and routes (Task 4) can share its constants.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat: add shared staff role permission rules`.

### Task 3: Firestore and Storage rules with emulator tests

**Files:**
- Create: `firebase.json` (firestore rules/indexes, storage rules, emulator ports for `auth`, `firestore` and `storage`), `.firebaserc` (`{"projects":{"default":"reshmam-oil"}}`), `firestore.indexes.json` (composite index `orders`: `customerId ASC, createdAt DESC`), `vitest.rules.config.mts`, `tests/rules/firestore.rules.test.ts`, `tests/rules/storage.rules.test.ts`
- Modify: `firestore.rules`, `storage.rules`, `package.json` (devDeps `firebase-tools`, `@firebase/rules-unit-testing`; script `"test:rules": "firebase emulators:exec --only firestore,storage --project demo-reshmam 'vitest run -c vitest.rules.config.mts'"`), `.github/workflows/*.yml` (add `actions/setup-java@v4` with Java 21 and a `npm run test:rules` step), `vitest.config.mts` (exclude `tests/rules/**` from the default run)

**Interfaces:**
- Consumes: `DEFAULT_ROLES` (Task 2) to seed `configs/settings` in tests.
- Produces: rules functions `isSignedIn()`, `staff()` (get of `adminUsers/{uid}`), `isStaff()` (exists and `status == "Active"`), `level(module)` (Admin → manage, else `configs/settings.roles[role].permissions[module]`), `can(module, lvl)`. Customer field lists: create allows exactly `id, name, email, phone, createdAt, updatedAt, source, cart, wishlist`, with `id == uid`, `phone == request.auth.token.phone_number`, `source == "website"`. Update allows only `name, email, cart, wishlist, updatedAt` via `diff().affectedKeys().hasOnly(...)`.

- [ ] **Step 1: Write failing rules tests** (seed with `withSecurityRulesDisabled`: `configs/settings` = `{roles: DEFAULT_ROLES}`, `adminUsers/{admin,manager,staff,inactive}`, a product, a variant, two customers' docs, orders for each):
  - Anonymous: read `products` ✓, write `products` ✗, read `orders` ✗, create `orders` ✗, read `configs/settings` ✗.
  - Customer `cust1` (token `phone_number: "+919876543210"`): create own doc with allowed fields ✓; create with `phone` different from token ✗; create another uid's doc ✗; update own `name` ✓; update own `status`/`role`/`phone` ✗ (Review Focus 1); read `customers/cust2` ✗; read own orders (`customerId == "cust1"`) ✓; read `cust2`'s order ✗; write `products` ✗; read `adminUsers` ✗.
  - Staff role: update `orders` ✓; update `variants.stock` ✓; update `variants.price` ✗; write `coupons` ✗; write `configs/settings` ✗.
  - Manager: write `products` ✓; write `configs/settings` ✗; write `adminUsers` ✗.
  - Admin: write `adminUsers` ✓, `configs/settings` ✓. After `configs/settings.roles.Admin.permissions = {}`: Admin still writes `products` ✓.
  - Inactive staff: every write ✗, read `orders` ✗ (Review Focus 2).
  - Storage: anonymous read ✓; customer upload to `products/x.webp` ✗; Manager upload ✓; Staff upload ✗.
- [ ] **Step 2:** `npm run test:rules`. Expected: FAIL (old rules).
- [ ] **Step 3:** Rewrite `firestore.rules` and `storage.rules` per the spec (Storage uses `firestore.get(/databases/(default)/documents/adminUsers/$(request.auth.uid))`). Delete the unused `settings/` and `chatbot/` matches and add `configs/{docId}`.
- [ ] **Step 4:** `npm run test:rules`. Expected: PASS. `npm test` is still green (rules tests excluded there).
- [ ] **Step 5:** Commit `feat: role-aware Firestore and Storage rules with emulator tests`.

### Task 4: Staff-authenticated admin API routes

**Files:**
- Create: `src/lib/staff-auth.ts`, `src/app/api/admin/staff/route.ts`, `src/app/api/admin/me/route.ts`
- Modify: `src/app/api/admin/firestore/route.ts`, `src/app/api/admin/auth/route.ts`
- Test: `tests/api/admin-routes.test.ts`

**Interfaces:**
- Consumes: `verifyIdToken`, `adminDb`, `adminAuth` (Task 1); `canAccess`, `Roles`, `DEFAULT_ROLES` (Task 2).
- Produces:
  - `type StaffContext = { uid: string; staff: { id: string; name: string; email: string; role: string; status: string; branchId?: string }; roles: Roles }`.
  - `requireStaff(req: Request): Promise<StaffContext | Response>` (401 with no or invalid token, 403 for a non-staff or inactive user). Roles are read from `configs/settings.roles`, falling back to `DEFAULT_ROLES`.
  - `GET /api/admin/me` → `{ ok: true, user: staff }` (no password).
  - `GET /api/admin/firestore` → only collections the caller can `read`; `configs` docs filtered the same way; every `password` key stripped recursively.
  - `POST /api/admin/firestore` (`save | delete | batch`) → each op checked with `canAccess` (save passes `changedFields = Object.keys(data)`). Any refused op → 403 and **nothing** written. `adminUsers` saves are refused here (they go through `/api/admin/staff`).
  - `POST /api/admin/staff` (Admin only) `{ name, email, phone?, role, branchId?, status }` → `adminAuth.createUser({ email, displayName, password: <random 20 chars> })` + `adminUsers/{uid}` (no password) → `{ ok, user, resetLink }` from `adminAuth.generatePasswordResetLink(email)`.
  - `PATCH /api/admin/staff` (Admin only) `{ uid, name?, phone?, role?, branchId?, status? }`. `status: "Inactive"` also sets `disabled: true` and revokes refresh tokens. `DELETE /api/admin/staff?uid=` (Admin only) deletes both.
  - `/api/admin/auth`: `POST` → 410 `{ ok: false, error: "Sign in with Firebase" }`; `GET` requires staff (same as `/me` list but Admin-only full list).

- [ ] **Step 1: Write failing tests** with `@/lib/firebase-admin` mocked (in-memory `adminDb` fake):
  - No token → 401 on all four routes. A customer token (uid not in `adminUsers`) → 403. An inactive staff token → 403 (Review Focus 2).
  - Staff `GET firestore` has no `coupons`, and no `password` anywhere in the JSON. Admin `GET` includes `adminUsers` without `password`.
  - Staff `POST batch` with one allowed and one refused op → 403 and the fake store unchanged.
  - Manager `POST /api/admin/staff` → 403. Admin → creates the user (mocked `createUser` called without the caller's password) and returns `resetLink`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Routes use only the Admin SDK (remove the hardcoded client config from `firestore/route.ts`).
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat: require staff sign-in and role checks on admin API routes`.

### Task 5: Server order flows on the Admin SDK, linked to accounts

**Files:**
- Modify: `src/app/(storefront)/_lib/server/orders.ts`, `src/app/(storefront)/api/checkout/route.ts`, `src/app/(storefront)/api/orders/lookup/route.ts`, `src/app/(storefront)/api/payments/cashfree/verify/route.ts`, `src/app/(storefront)/api/payments/cashfree/webhook/route.ts`
- Test: `tests/storefront/api-routes.test.ts` (replace the `firebase/firestore` fake with an `adminDb` fake)

**Interfaces:**
- Consumes: `adminDb`, `verifyIdToken` (Task 1).
- Produces: `createOrder(input: CheckoutInput, pricing, options: { paymentMethod?: string; branchId?: string; customer?: { uid: string; phone: string } | null })`. The unused `_dummyDb` first parameter is dropped here and in `markOrderPaid(orderId, paymentId, method?)` and `markOrderFailed(orderId)`, and the Razorpay call sites are updated. With `customer`, `customerId = customer.uid`, `customerPhone = customer.phone`, and the **guest `customers` doc is not written** (the account doc is the customer's own). Without it, behaviour is unchanged.

- [ ] **Step 1: Write failing tests:**
  - Checkout with no `Authorization` → order `customerId` starts with `c_` (guest).
  - With a valid token (`uid: "u1", phone_number: "+919999999999"`) and form phone `9876543210` → `customerId === "u1"`, `customerPhone === "+919999999999"` (Review Focus 5).
  - With a token that `verifyIdToken` rejects → still 200 and a guest order (Review Focus 5).
  - Lookup finds an order through the `adminDb` fake. Cashfree verify marks paid through `adminDb`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Switch every Firestore call in these files to `adminDb()` (stock deduction and activity log included). Checkout reads `verifyIdToken(req)` and passes `customer` when the token has `phone_number`.
- [ ] **Step 4:** `npm test`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat: move order routes to the Admin SDK and link orders to signed-in customers`.

### Task 6: Admin login with Firebase Auth

**Files:**
- Modify: `src/app/admin/_lib/auth.jsx`, `src/app/admin/_lib/firebase.js` (attach the ID token in `postToProxy` and in the store's `GET /api/admin/firestore` fetch in `src/app/admin/_lib/store.js`), `src/app/admin/login/Login.jsx` (remove demo accounts box, add "Forgot password?"), `src/proxy.ts` and `.env.example` (remove the `DISABLE_ADMIN_DEMO` gate and demo wording), `docs/admin.md`
- Test: `tests/admin/auth.test.js` (new) and existing admin tests updated

**Interfaces:**
- Consumes: `GET /api/admin/me` (Task 4).
- Produces: `login(email, password)` → `signInWithEmailAndPassword(auth, email, password)` then `/api/admin/me`. The session comes from `onAuthStateChanged` (no `SESSION_KEY` in storage). `logout()` → `signOut(auth)`. `resetPassword(email)` → `sendPasswordResetEmail(auth, email)`. `authHeader(): Promise<Record<string,string>>` exported from `firebase.js` for all admin fetches.

- [ ] **Step 1: Write failing tests** (mock `firebase/auth` and `fetch`): `login` calls `signInWithEmailAndPassword` and stores the `/me` user; a `/me` 403 signs out and throws "This account is not staff or is inactive."; `logout` calls `signOut`; `postToProxy` sends `Authorization: Bearer <token>`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. The non-browser test fallback in `login` stays only for unit tests of other modules; it must not compare plaintext passwords against Firestore data.
- [ ] **Step 4:** `npm test`. Expected: PASS. Manually: with the emulator (`firebase emulators:start --only auth,firestore`) and a seeded staff user, log in at `/admin/login`.
- [ ] **Step 5:** Commit `feat: admin panel signs in with Firebase Auth`.

### Task 7: Team and account settings without stored passwords

**Files:**
- Modify: `src/app/admin/settings/sections/TeamSections.jsx`, `src/app/admin/settings/sections/AccountSections.jsx`, `src/app/admin/_lib/store.js` (the `settings.users` branches of add/update/delete call the staff API; `persistConfigSection('settings')` omits `users`)
- Test: `tests/admin/store.test.js`

**Interfaces:**
- Consumes: `/api/admin/staff` (Task 4), `authHeader()` (Task 6).
- Produces: Team "Add user" → POST, and shows the returned reset link to copy (no password field). Edit / disable → PATCH. Delete → DELETE. Account "Change password" → `reauthenticateWithCredential(EmailAuthProvider.credential(email, current))` then `updatePassword`. The store **never** writes `adminUsers` directly and never persists any `password`.

- [ ] **Step 1: Write failing tests:** `persistConfigSection('settings')` calls `saveDocument('configs','settings', data)` where `data.users` is undefined and no nested `password` exists. `addItem('settings.users', …)` calls `fetch('/api/admin/staff', {method:'POST'})` and not `saveDocument('adminUsers', …)`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Remove the "Demo only: passwords are kept in browser storage" note.
- [ ] **Step 4:** `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: manage staff through Firebase Auth, never store passwords`.

### Task 8: Admin migration script

**Files:**
- Create: `scripts/lib/admin-migration.mjs`, `scripts/migrate-admin-users.mjs`
- Test: `tests/scripts/admin-migration.test.ts`

**Interfaces:**
- Consumes: `adminDb`/`adminAuth` (Task 1; the script initialises from `FIREBASE_SERVICE_ACCOUNT`).
- Produces: pure `planMigration(adminUsers: Array<{id, email, password?, ...}>, configsSettings: object | null)` → `{ users: Array<{ oldId, email, keepPassword: boolean, record: object /* no password */ }>, mustReset: string[], scrubbedSettings: object | null }`. `keepPassword` is false for the seed defaults (`Admin@123`, `Manager@123`, `Staff@123`) and for missing or empty passwords. `scrubbedSettings` removes every `password` key at any depth. CLI: `node scripts/migrate-admin-users.mjs` (dry run, prints the plan without passwords) and `--apply` (createUser with the kept or a random password, writes `adminUsers/{uid}`, deletes the `oldId` doc, writes `configs/settings` scrubbed). It's idempotent: users whose email already exists in Auth are re-linked, not duplicated.

- [ ] **Step 1: Write failing tests:** a seed password user → `keepPassword false` and email in `mustReset`; a custom password → `keepPassword true`; records never contain `password`; `scrubbedSettings.users[0].password` is undefined; deep nested passwords are removed.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Output never prints a password.
- [ ] **Step 4:** Run. Expected: PASS. Dry-run against the emulator with seeded `adminUsers` prints the plan.
- [ ] **Step 5:** Commit `feat: one-time script to move staff to Firebase Auth`.

### Task 9: Customer Firebase client, auth state and profile

**Files:**
- Create: `src/app/(storefront)/_lib/customer-firebase.ts`, `src/app/(storefront)/_lib/customer-auth.ts`, `src/app/(storefront)/_lib/phone.ts`
- Test: `tests/storefront/phone.test.ts`, `tests/storefront/customer-auth.test.ts`

**Interfaces:**
- Produces:
  - `customerAuth`, `customerDb` (named app `reshmam-customer`, same config as `src/lib/firebase.ts`).
  - `normalizeIndianMobile(input: string): string | null` (→ 10 digits, or null). `toE164(tenDigits: string): string` (`+91…`).
  - `type CustomerProfile = { id: string; name: string; email?: string; phone: string; cart?: CartItem[]; wishlist?: string[]; createdAt: string; updatedAt: string; source: "website" }`.
  - `useCustomer(): { user: User | null; profile: CustomerProfile | null; loading: boolean }` (profile live via `onSnapshot`).
  - `getProfile(uid): Promise<CustomerProfile | null>`, `createProfile(user: User, { name, email }): Promise<void>`, `updateProfile(uid, { name?, email? }): Promise<void>`, `signOutCustomer(): Promise<void>`.
  - `authErrorMessage(code: string): string` with this copy:
    - `auth/invalid-verification-code` → "That code isn't right. Check the SMS and try again."
    - `auth/code-expired` → "That code has expired. Tap Resend OTP for a new one."
    - `auth/too-many-requests` → "Too many attempts. Please wait a few minutes and try again."
    - `auth/invalid-phone-number` → "Enter a valid 10-digit mobile number."
    - `auth/network-request-failed` → "You seem to be offline. Check your connection and try again."
    - anything else → "Something went wrong. Please try again."

- [ ] **Step 1: Write failing tests:** `normalizeIndianMobile` for `"9876543210"`, `"+91 98765 43210"`, `"09876543210"`, `"98765-43210"` → `"9876543210"`; for `"5876543210"`, `"98765"`, `"abc"` → null (Review Focus 4). `authErrorMessage` maps each code above. `createProfile` (with `firebase/firestore` mocked) writes exactly the allowed create fields with `phone = user.phoneNumber` and `source: "website"`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat: customer Firebase client, auth state and profile helpers`.

### Task 10: OTP input

**Files:**
- Create: `src/app/(storefront)/_components/account/otp.ts` (pure logic), `src/app/(storefront)/_components/account/OtpInput.tsx`
- Test: `tests/storefront/otp.test.ts`

**Interfaces:**
- Produces: `applyOtpInput(digits: string[], index: number, value: string): { digits: string[]; focus: number }` (a value longer than one char is treated as a paste from `index`; non-digits are stripped). `applyOtpBackspace(digits, index): { digits; focus }`. `<OtpInput value={string} onChange={(code: string) => void} disabled? autoFocus? />` renders 6 inputs, the first with `autoComplete="one-time-code"` and `inputMode="numeric"`, labelled "Digit 1 of 6" … .

- [ ] **Step 1: Write failing tests:** typing `"4"` at index 0 → focus 1. Pasting `"123 456"` at index 0 → all six filled, focus 5 (Review Focus 3). Pasting `"123-456"` → same. Pasting `"12"` at index 4 → indexes 4 and 5 filled. Backspace on an empty index 3 clears index 2 and focuses 2.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the logic and the thin component.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat: six-box OTP input with paste and autofill`.

### Task 11: Sign-in dialog (create account and log in)

**Files:**
- Create: `src/app/(storefront)/_components/account/sign-in-machine.ts`, `src/app/(storefront)/_components/account/SignInDialog.tsx`, `src/app/(storefront)/_components/account/SignInDialogProvider.tsx`, `public/fonts/texgyrebonum-bolditalic.woff2`
- Modify: `src/app/(storefront)/globals.css` (`@font-face` for TeX Gyre Bonum Bold Italic and a `.font-bookman` utility with the Global Constraints stack), `src/app/(storefront)/layout.tsx` (wrap in the provider)
- Test: `tests/storefront/sign-in-machine.test.ts`

**Interfaces:**
- Consumes: Task 9 helpers, `OtpInput` (Task 10).
- Produces:
  - `type Mode = "create" | "login"`. `type Step = "details" | "mobile" | "otp" | "done"`. `type Outcome = "created" | "loggedIn" | "welcomeBack"`.
  - `signInReducer(state, event)` with events `DETAILS_SUBMITTED{name,email}`, `MOBILE_SUBMITTED{phone}`, `OTP_SENT`, `OTP_CONFIRMED{hasProfile:boolean}`, `CHANGE_NUMBER`, `SWITCH_MODE{mode}`, `ERROR{message}`, `RESET`.
  - The outcome rules: create + `hasProfile` → `welcomeBack` (profile not overwritten). Create + no profile → `created` (caller writes the profile). Login + `hasProfile` → `loggedIn`. Login + no profile → step `details` in create mode with the phone kept.
  - `useSignInDialog(): { open(mode?: Mode): void; close(): void }`.
- UI per the mockup and spec: two-column dialog (green panel ≈40%) from `md`, a compact green header on phones. Progress "1 Your Details · 2 Mobile · 3 Verify OTP" in create mode. Invisible `RecaptchaVerifier` on Send OTP. Resend after 30 s. "Change Mobile Number". Success buttons **Continue Shopping** (close) and **Go to My Account** (`/account`). Titles use `.font-bookman`. `role="dialog"`, `aria-modal`, labelled by the title, focus trap, Esc and × close, focus returned to the opener.
- **Font file:** before downloading TeX Gyre Bonum Bold Italic from GUST (gust.org.pl, GUST Font License), **ask the user's permission** (filename, source, size). Convert to WOFF2 and keep the licence notice in `public/fonts/README.md`.

- [ ] **Step 1: Write failing tests** for `signInReducer`: create flow details → mobile → otp → done `created`. Create with existing profile → done `welcomeBack`. Login without profile → details in create mode with phone kept. `CHANGE_NUMBER` from otp → mobile with the code cleared. `MOBILE_SUBMITTED` with an invalid number → stays on mobile with error "Enter a valid 10-digit mobile number." (Review Focus 4).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the reducer, the dialog and the provider.
- [ ] **Step 4:** Run tests. Expected: PASS. Manually, with Firebase **test phone numbers** (console → Auth → Phone → test numbers) or the Auth emulator: create, log in, wrong code, resend, change number. Check at 375 px and 1280 px with no overflow.
- [ ] **Step 5:** Commit `feat: mobile OTP sign-in dialog for creating an account and logging in`.

### Task 12: Header entry point and My Account page

**Files:**
- Modify: `src/app/(storefront)/_components/layout/Header.tsx`, `src/app/(storefront)/account/page.tsx`, `src/app/(storefront)/_components/account/AccountPanel.tsx` (rewrite), `src/app/(storefront)/_components/account/OrderHistory.tsx` (Firestore client)
- Delete: `src/app/(storefront)/api/account/orders/route.ts` and its tests
- Test: `tests/storefront/order-history.test.ts`

**Interfaces:**
- Consumes: `useCustomer`, `updateProfile`, `signOutCustomer` (Task 9), `useSignInDialog` (Task 11).
- Produces: header person icon is a button that opens the dialog (login mode) when signed out and links to `/account` when signed in (`aria-label` "Log in or create an account" / "My account"). `/account` signed out: prompt with "Log in" and "Create account" plus quick links. Signed in: profile card (name and email editable, mobile shown read-only), Sign out, `OrderHistory` (`query(collection(customerDb,"orders"), where("customerId","==",uid), orderBy("createdAt","desc"), limit(50))` mapped with the existing `toOrderView`). `fetchCustomerOrders(uid): Promise<OrderView[]>` exported for tests.

- [ ] **Step 1: Write failing test:** `fetchCustomerOrders("u1")` (with `firebase/firestore` mocked) queries `customerId == "u1"` ordered by `createdAt desc`, limit 50, and maps through `toOrderView` (no `accessToken` in the output).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test` and `npm run build`. Expected: PASS. Manually: signed-out and signed-in `/account`, and the header icon in both states.
- [ ] **Step 5:** Commit `feat: My Account with profile and order history from Firebase`.

### Task 13: Cart and wishlist saved to the account (Firestore)

**Files:**
- Modify: `src/app/(storefront)/_lib/account-sync.ts` (rewrite on Firestore), `src/app/(storefront)/_components/layout/AccountSync.tsx`
- Delete: `src/app/(storefront)/_lib/supabase-browser.ts`
- Test: `tests/storefront/account-sync.test.ts` (port to a fake adapter)

**Interfaces:**
- Consumes: `customerAuth`, `customerDb` (Task 9).
- Produces: unchanged `mergeCarts`, `mergeWishlists`, `SAVE_DELAY_MS = 500`, `SYNCED_USER_KEY`. `type AccountStore = { onUser(cb: (uid: string | null) => void): () => void; load(uid): Promise<{ cart: CartItem[]; wishlist: string[] } | null>; save(uid, lists): Promise<void> }`. `startAccountSync(store: AccountStore = firestoreAccountStore()): () => void`. `firestoreAccountStore()` reads and writes `customers/{uid}.cart` / `.wishlist` (update only those fields plus `updatedAt`). The behaviour rules are the existing ones (first sign-in on a device merges; later visits take the account's lists; save after `SAVE_DELAY_MS` or when the tab is hidden; sign-out clears local; never overwrite when load failed). The known-product filter is removed.

- [ ] **Step 1:** Port the existing account-sync tests to a fake `AccountStore`. All the old expectations stay, and wishlist slugs are no longer filtered.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: save cart and wishlist to the customer's Firebase account`.

### Task 14: Checkout knows the signed-in customer

**Files:**
- Modify: `src/app/(storefront)/_components/cart/CheckoutForm.tsx`
- Test: covered by Task 5 API tests plus a manual check

**Interfaces:**
- Consumes: `useCustomer` (Task 9), `useSignInDialog` (Task 11).
- Produces: when signed in, name, email and phone are prefilled (phone read-only, showing the verified number) and the `fetch("/api/checkout")` sends `Authorization: Bearer ${await user.getIdToken()}`. When signed out, a small "Log in for faster checkout" link opens the dialog. Guest checkout is unchanged.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Manual: signed-in COD order shows on `/account`; guest order still works.
- [ ] **Step 3:** `npm test`, `npm run build`. Expected: PASS.
- [ ] **Step 4:** Commit `feat: prefill checkout and link orders for signed-in customers`.

### Task 15: Go-live runbook and clean-up

**Files:**
- Create: `docs/firebase-go-live.md`
- Modify: `README.md`, `docs/storefront.md`, `docs/admin.md`, `.env.example` (remove `NEXT_PUBLIC_SUPABASE_*` unless still used by the contact form and Razorpay; keep `SUPABASE_SERVICE_ROLE_KEY` for those)

- [ ] **Step 1:** Write the runbook in the spec's order: (1) create the service account and set `FIREBASE_SERVICE_ACCOUNT` on Vercel, (2) enable Email/Password, (3) deploy the code, (4) `node scripts/migrate-admin-users.mjs`, then `--apply`, then send reset links to the `mustReset` list, (5) check the currently deployed rules in the console, then `firebase deploy --only firestore:rules,firestore:indexes,storage`, (6) enable Phone, add authorised domains, set a budget alert, (7) smoke test with a test phone number, then one real SMS.
- [ ] **Step 2:** Run every CI step locally: `npm run lint`, `npm test`, `npm run test:rules`, `npm run db:seed:generate && git diff --exit-code supabase/seed.sql`, `npm run build`, `npx tsc --noEmit`. Expected: all pass.
- [ ] **Step 3:** Commit `docs: Firebase go-live runbook for accounts and admin security`.
