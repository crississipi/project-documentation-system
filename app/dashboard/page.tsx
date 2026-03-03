import Mainpage from "@/app/components/Mainpage";

export const metadata = { title: "Dashboard – OnTap Dev" };

export default function DashboardPage() {
  return (
    <div className="w-full h-screen max-h-screen flex">
      <Mainpage />
    </div>
  );
}
