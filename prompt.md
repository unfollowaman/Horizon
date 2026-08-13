## Task: Fix "Access Denied" screen showing instead of "Login Required" for unauthenticated users in PdfViewer

### Problem Description
Currently, when an unauthenticated user (like someone in incognito mode) attempts to access a protected PDF, they are incorrectly shown the "ACCESS DENIED" (403 Forbidden) screen instead of the expected "LOGIN REQUIRED" screen.

This happens because the error returned by the Supabase Edge Function (`resource-access`) or data fetching logic is not matching the exact strings (`'401'` or `'Unauthorized'`) expected in the current `PdfViewer.tsx` checks. As a result, it falls through to the default `403_FORBIDDEN` state.

Additionally, the message on the "Login Required" screen needs to be slightly softer to prevent users from leaving the website.

### Requirements
1. **Proactive Auth Check**: In `src/pages/resources/PdfViewer.tsx`, use the frontend `user` state from `useAuth()` to proactively check if the user is unauthenticated. If `!user` and the resource is protected (`isResourceProtected`), immediately set `pdfError` to `'401_UNAUTHORIZED'` without even invoking the `resource-access` edge function.
2. **Softer Messaging**: Update the "Login required" screen text. Change the description to:
   "To access notes please sign in or register"
   (Keep the buttons for "Log in" and "Create account").
3. **Robust Error Handling**: Broaden the error matching for 401 Unauthorized in both `fetchResourceAndRelated` and `fetchSignedUrl` just in case, ensuring that any auth-related errors correctly set `'401_UNAUTHORIZED'` rather than falling back to `'403_FORBIDDEN'`.

Please update `src/pages/resources/PdfViewer.tsx` to implement these changes.
