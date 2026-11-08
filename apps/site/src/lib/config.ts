/** What differs between deployments. An unset value hides what depends on it. */
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? '',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@chantia.tn',
  appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL ?? '',
  googlePlayUrl: process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? '',
};
