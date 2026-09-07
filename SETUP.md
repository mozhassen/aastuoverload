# AASTU Overload Contract Tool — backend setup (100% free tier)

This wires the form up to:
- **Firebase Authentication** (email/password login)
- **Firestore** (saved contract records, with per-user + admin access rules)
- **Firebase Hosting** (serves the live site — free Spark plan, no credit card needed)
- **GitHub** for source control, with GitHub Actions auto-deploying to Firebase on every push

No Cloud Functions are used anywhere, since those require Firebase's paid Blaze plan. Everything here works on the free Spark plan.

---

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project**.
2. Name it (e.g. `aastu-overload-contracts`), disable Google Analytics if you don't need it (keeps setup faster), and create it. This is free — no billing account required for Spark plan.

## 2. Enable Authentication

1. In the Firebase console, go to **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. That's it — no further config needed for now.

## 3. Enable Firestore

1. Go to **Build → Firestore Database → Create database**.
2. Choose **Production mode** (the security rules file below governs access — don't use test mode long-term).
3. Pick a region close to you and confirm.

## 4. Get your web app config

1. In **Project settings** (gear icon) → **General** → scroll to **Your apps** → click the **</>** (web) icon.
2. Register an app (nickname doesn't matter, skip Hosting setup here — you'll do that via GitHub Actions instead).
3. Copy the `firebaseConfig` object it shows you.
4. Open `aastu_overload_form.html`, find the `firebaseConfig` block near the top of the `<script>` section, and paste your real values in place of the `YOUR_...` placeholders.

## 5. Set the security rules

1. In Firestore, go to the **Rules** tab.
2. Replace the contents with what's in `firestore.rules` (included alongside this file), then **Publish**.

This enforces:
- Anyone signed in can save a contract, but only as themselves.
- A user can only read/edit/delete their own saved contracts.
- Anyone listed in the `admins` collection can read/edit/delete **any** contract.

## 6. Make yourself an admin

1. In Firestore, go to the **Data** tab → **Start collection** → name it `admins`.
2. First sign up for an account in the actual running app (see step 9) so you have a User UID — find it in **Authentication → Users** after signing up.
3. Back in Firestore, create a document inside `admins` whose **Document ID** is exactly that UID. Leave the document's fields empty (the rules only check that the document *exists*).
4. Reload the app — you should now see the "Admin: view all submissions" button.

There's no self-service admin signup by design — you control who's an admin by adding their UID here manually.

## 7. Push the code to GitHub

```bash
git init
git add aastu_overload_form.html firebase.json .firebaserc firestore.rules .github
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 8. Connect GitHub Actions to Firebase Hosting

1. Locally, install the Firebase CLI once: `npm install -g firebase-tools`
2. Run: `firebase login` then `firebase init hosting:github` from inside the project folder — this walks you through creating a service account and automatically adds the `FIREBASE_SERVICE_ACCOUNT` secret to your GitHub repo.
3. Edit `.github/workflows/firebase-hosting.yml` (already included) and `.firebaserc`, replacing `YOUR_PROJECT_ID` with your actual Firebase project ID in both places.
4. Push again — GitHub Actions will build and deploy automatically. Check the **Actions** tab on GitHub to watch it run.

Your live URL will be `https://YOUR_PROJECT_ID.web.app` (shown in Firebase Hosting console once deployed).

## 9. Try it

1. Open the live URL.
2. Sign up with an email/password (this creates your account and shows up in Authentication → Users).
3. Fill in a course, save a record, download a PDF.
4. Once you've made yourself an admin (step 6), reload and check the admin panel shows every submission, not just yours.

---

### Staying on the free plan
- Spark plan limits: Firestore ~50K reads / 20K writes per day, Hosting 10 GB storage / 360 MB per day transfer, Auth unlimited email/password users. A small university department is nowhere near these limits.
- No Cloud Functions, no Cloud Storage buckets beyond Hosting's own — nothing here can trigger a bill.
