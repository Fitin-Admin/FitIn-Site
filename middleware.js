// Vercel Edge Middleware — the smart link for fitin.fit/get
// Put this file at the ROOT of your project (same level as /api, /public).
// This is the single link you use in every TikTok/IG/YouTube bio from now on:
//   https://fitin.fit/get
//
// Android -> straight to Google Play
// iOS     -> the premium waitlist page (/waitlist.html)
// Desktop -> the waitlist page too (safest default until Apple approves)

export const config = {
  matcher: '/get',
};

const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=REPLACE_WITH_PACKAGE_NAME';

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';

  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);

  if (isAndroid) {
    return Response.redirect(GOOGLE_PLAY_URL, 302);
  }

  // iOS and anything else (desktop, unknown UA) goes to the waitlist page.
  return Response.redirect(new URL('/waitlist.html', request.url), 302);
}
