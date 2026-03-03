export default function DashboardLoading() {
  return <AppShellSkeleton />;
}

function AppShellSkeleton() {
  return (
    <div className="w-screen h-screen max-h-screen flex relative overflow-hidden bg-zinc-100">
      {/* Sidebar */}
      <aside className="w-60 h-full bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Logo area */}
        <div className="h-16 flex items-center px-5 gap-3 border-b border-slate-200">
          <div className="w-8 h-8 rounded-xl bg-slate-200 animate-pulse" />
          <div className="w-28 h-4 rounded-full bg-slate-200 animate-pulse" />
        </div>

        {/* Nav items */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
          <div className="w-20 h-3 bg-slate-200 rounded-full animate-pulse mb-3 ml-2" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-9 rounded-xl bg-slate-100 animate-pulse"
            />
          ))}
          <div className="w-20 h-3 bg-slate-200 rounded-full animate-pulse mt-5 mb-3 ml-2" />
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-9 rounded-xl bg-slate-100 animate-pulse"
            />
          ))}
        </div>

        {/* User card */}
        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="w-24 h-3 bg-slate-200 rounded-full animate-pulse" />
              <div className="w-32 h-2.5 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 h-full overflow-y-auto p-8 space-y-6">
        {/* Greeting */}
        <div className="space-y-2 mb-2">
          <div className="w-56 h-7 bg-slate-200 rounded-xl animate-pulse" />
          <div className="w-80 h-4 bg-slate-200 rounded-full animate-pulse" />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse shrink-0" />
              <div className="space-y-2">
                <div className="w-10 h-6 bg-slate-200 rounded-lg animate-pulse" />
                <div className="w-20 h-3 bg-slate-200 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Activity panel skeleton */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 h-64 animate-pulse" />
          <div className="bg-white rounded-2xl border border-slate-200 h-64 animate-pulse" />
        </div>

        {/* Recent projects skeleton */}
        <div>
          <div className="w-36 h-5 bg-slate-200 rounded-full animate-pulse mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-slate-200 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
