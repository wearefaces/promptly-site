/* Promptly site config.
   CHECKOUT links below are Stripe TEST-mode payment links.
   Swap them for live payment links before a real launch.
   Leave a value empty to keep the "Join waitlist" fallback.
   DOWNLOAD_URL, CONTACT_EMAIL, and WAITLIST_ENDPOINT stay empty until provided.
   This file only stores URLs — it does not create Stripe objects or accounts. */
var CHECKOUT = {
  monthly: "https://buy.stripe.com/test_6oU7sF5Sc3rI6iJ3mffbq00",
  yearly: "https://buy.stripe.com/test_00wcMZ6Wg7HY9uV9KDfbq01",
  lifetime: "https://buy.stripe.com/test_8x24gtcgAgeu5eF1e7fbq02"
};
var DOWNLOAD_URL = "";
var CONTACT_EMAIL = "";
var WAITLIST_ENDPOINT = "";

window.PROMPTLY = {
  CHECKOUT: CHECKOUT,
  DOWNLOAD_URL: DOWNLOAD_URL,
  CONTACT_EMAIL: CONTACT_EMAIL,
  WAITLIST_ENDPOINT: WAITLIST_ENDPOINT
};
