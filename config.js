/* Promptly site config.
   CHECKOUT is intentionally empty: payments are not live yet, so Buy/Trial buttons fall back to "Join waitlist".
   Do NOT paste Stripe TEST links here (visitors would land on a test checkout).
   Fill in LIVE payment links only after the live license worker is deployed and verified end-to-end.
   DOWNLOAD_URL points at the current Mac beta. CONTACT_EMAIL stays empty until provided.
   WAITLIST_ENDPOINT is unused: waitlist sign-ups go to Firestore in promptly-bfad6.
   This file only stores URLs — it does not create Stripe objects or accounts. */
var CHECKOUT = {
  monthly: "",
  yearly: "",
  lifetime: ""
};
var DOWNLOAD_URL = "https://github.com/wearefaces/promptly-site/releases/download/beta-1.0-2/Promptly-beta-1.0-2.dmg";
var CONTACT_EMAIL = "";
var WAITLIST_ENDPOINT = "";

window.PROMPTLY = {
  CHECKOUT: CHECKOUT,
  DOWNLOAD_URL: DOWNLOAD_URL,
  CONTACT_EMAIL: CONTACT_EMAIL,
  WAITLIST_ENDPOINT: WAITLIST_ENDPOINT
};
