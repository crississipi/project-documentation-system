// Server component shell — exports generateStaticParams so static export
// knows this is a dynamic route without pre-defined params (client loads data).
// The actual page logic lives in ProjectPage.tsx ("use client").
import ProjectPageClient from "./ProjectPage";

// Return one placeholder so Next.js generates a static HTML shell.
// The actual id is read at runtime via useParams() in ProjectPage.tsx.
// Apache's .htaccess rewrites /projects/<any-id>/ → this shell.
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page() {
  return <ProjectPageClient />;
}
