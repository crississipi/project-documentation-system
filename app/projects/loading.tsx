export default function ProjectsLoading() {
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
            <div key={i} className="h-9 rounded-xl bg-slate-100 animate-pulse" />
          ))}
          <div className="w-20 h-3 bg-slate-200 rounded-full animate-pulse mt-5 mb-3 ml-2" />
          {[1, 2].map((i) => (
            <div key={i} className="h-9 rounded-xl bg-slate-100 animate-pulse" />
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
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="w-48 h-7 bg-slate-200 rounded-xl animate-pulse" />
          <div className="w-32 h-9 bg-slate-200 rounded-xl animate-pulse" />
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-28 h-9 bg-slate-200 rounded-xl animate-pulse" />
          ))}
          <div className="w-36 h-9 bg-slate-200 rounded-xl animate-pulse ml-auto" />
        </div>

        {/* Project card grid */}
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-52 rounded-2xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}
