/**
 * Navigating to any app page closes the dialog. On client navigations a slot
 * keeps its last content unless the new URL matches something in it, so each
 * app section has a `page.tsx` here (and a `[...rest]` when it has subpages)
 * that renders nothing. A root `[...catchAll]` would also claim /login and
 * /register, which live outside this layout, and turn them into 404s.
 */
export default function CloseModal() {
  return null;
}
