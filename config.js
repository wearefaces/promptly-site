/* Promptly site config.
   CHECKOUT holds the LIVE Stripe payment links (verified end-to-end with the live license worker on 2026-11-28).
   Do NOT paste Stripe TEST links here (visitors would land on a test checkout).
   DOWNLOAD_URL points at the current Mac beta (1.0 (3), which can activate license keys). CONTACT_EMAIL stays empty until provided.
   WAITLIST_ENDPOINT is unused: waitlist sign-ups go to Firestore in promptly-bfad6.
   This file only stores URLs — it does not create Stripe objects or accounts. */
var CHECKOUT = {
  monthly: "https://buy.stripe.com/00wcMZ6Wg7HY9uV9KDfbq01",
  yearly: "https://buy.stripe.com/8x24gtcgAgeu5eF1e7fbq02",
  lifetime: "https://buy.stripe.com/6oU7sF5Sc3rI6iJ3mffbq00"
};
var DOWNLOAD_URL = "https://github.com/wearefaces/promptly-site/releases/download/beta-1.0-3/Promptly-beta-1.0-3.dmg";
var CONTACT_EMAIL = "";
var WAITLIST_ENDPOINT = "";

window.PROMPTLY = {
  CHECKOUT: CHECKOUT,
  DOWNLOAD_URL: DOWNLOAD_URL,
  CONTACT_EMAIL: CONTACT_EMAIL,
  WAITLIST_ENDPOINT: WAITLIST_ENDPOINT
};
