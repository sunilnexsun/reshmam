# Firebase go-live: customer accounts and admin security

This is the one-time order of steps to switch the live site (Firebase project `reshmam-oil`) to:

- customer accounts that sign in with a mobile number and a one-time SMS code (Firebase Phone Auth),
- staff who sign in to `/admin` with real Firebase Auth accounts (no passwords in Firestore any more),
- Firestore and Storage rules that keep customers and staff apart and enforce each role's permissions.

Do the steps **in this order**. Steps 1–4 can be done any time; step 5 (the new rules) locks out the old
admin login, so do it only after step 4 has moved the staff over.

## 1. Service account for the server

The server (checkout, order lookup, payments, the admin API) uses the Firebase Admin SDK.

1. Firebase console → Project settings → **Service accounts** → **Generate new private key**.
2. In Vercel → Project → Settings → **Environment variables**, add `FIREBASE_SERVICE_ACCOUNT` with the whole
   JSON file's contents on **one line** (Production and Preview). Never commit it.
3. Delete the downloaded file from your computer once it's saved in Vercel.

## 2. Turn on Email/Password sign-in (for staff)

Firebase console → Authentication → **Sign-in method** → **Email/Password** → Enable. (Leave "Email link"
off.)

## 3. Deploy the code

Merge the pull request and let Vercel deploy. Until step 5, the old Firestore rules are still in place, so
nothing is locked out yet.

## 4. Move the staff to Firebase Auth

From a computer with this repository and Node 20+:

```bash
export FIREBASE_SERVICE_ACCOUNT='<the same one-line JSON>'
node scripts/migrate-admin-users.mjs            # dry run: lists every staff member and what will happen
node scripts/migrate-admin-users.mjs --apply    # does it
```

- Each staff member gets a Firebase Auth account with the same email, and their record moves to
  `adminUsers/{their Firebase uid}` without a password.
- Anyone whose password was one of the old demo ones (`Admin@123`, `Manager@123`, `Staff@123`) or empty gets
  a random password instead. The script prints their emails at the end: on the admin login screen use
  **Forgot Password?** for each one (or ask them to), so they set their own.
- The staff list and every password are removed from `configs/settings`.
- It's safe to run again; staff already moved are skipped.

Then sign in at `/admin` with an Admin account to check it works.

## 5. Deploy the new rules and indexes

First look at what's live now (Firebase console → Firestore → **Rules**, and Storage → **Rules**) and keep a
copy, so you can roll back by pasting it in. Then:

```bash
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes,storage --project reshmam-oil
```

The index (`orders`: `customerId` ascending, `createdAt` descending) powers My Account → My Orders; it can
take a few minutes to build.

What the new rules do: customers can read and edit only their own `customers/{uid}` profile (name, email,
cart, wishlist) and read only their own orders; nobody can create orders from the browser (the server does);
staff need an active `adminUsers/{uid}` record, and each role's permissions from Settings → Roles decide what
they can see and change.

## 6. Turn on phone sign-in (for customers)

1. Authentication → Sign-in method → **Phone** → Enable.
2. Authentication → Settings → **Authorized domains**: add `reshmam.com` and `www.reshmam.com` (and any
   Vercel preview domain you test on). `localhost` is there already.
3. Under Phone, add a few **phone numbers for testing** (for example `+91 90000 00001` with code `123456`).
   These never send a real SMS.
4. SMS costs money (Firebase bills phone sign-ins on the Blaze plan). In Google Cloud console → Billing →
   **Budgets & alerts**, set a monthly budget with email alerts. Optionally, Authentication → Settings →
   **SMS region policy**: allow only India.

## 7. Smoke test

On the live site:

1. Header person icon → **Log in** with a test number from step 6 → enter its code → "No account yet … Add
   your name" → **Create Account** → "Account Created Successfully!".
2. **My Account**: the profile shows; edit the name; **Sign out**; log in again → "Logged In Successfully!".
3. Add something to the cart, sign out (the cart empties), sign back in (it comes back).
4. Place a Cash on Delivery order while signed in: the mobile number is filled in and locked, and the order
   appears under My Account → My Orders.
5. Once all of that works, try one real number to see a real SMS arrive.

## Testing locally without SMS

```bash
npx firebase emulators:start --only auth,firestore --project reshmam-oil
```

and, in another terminal:

```bash
NEXT_PUBLIC_FIREBASE_EMULATORS=1 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run dev
```

Customer sign-in, profiles, cart sync and orders then use the emulators (the catalogue is still read from the
live project). No SMS is sent: the codes appear in the emulator UI (http://127.0.0.1:4000 → Authentication) or
at `http://127.0.0.1:9099/emulator/v1/projects/reshmam-oil/verificationCodes`. These variables are ignored in a
production build.

The rules have their own tests: `npm run test:rules` (needs Java 21).
