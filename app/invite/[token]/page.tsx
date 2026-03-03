// Server component — only purpose is to satisfy Next.js static export.
// All UI logic lives in InvitePage.tsx (client component).
import InvitePageClient from "./InvitePage";

// Return one placeholder so Next.js generates a static HTML shell.
// The actual token is read at runtime via useParams() in InvitePage.tsx.
// Apache's .htaccess rewrites /invite/<any-token>/ → this shell.
export function generateStaticParams() {
  return [{ token: "_" }];
}

export default function Page() {
  return <InvitePageClient />;
}
