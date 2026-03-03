import Mainpage from "@/app/components/Mainpage";

export const metadata = { title: "Projects – OnTap Dev" };

export default function ProjectsPage() {
  return (
    <div className="w-full h-screen max-h-screen flex">
      <Mainpage initialTab="projects" />
    </div>
  );
}
