export default function DocumentationLoading() {
  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Top bar */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
          <div className="w-40 h-4 rounded-full bg-slate-200 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-7 rounded-lg bg-slate-200 animate-pulse" />
          <div className="w-20 h-7 rounded-lg bg-slate-200 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
        </div>
      </div>

      {/* Main two-column area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document scroll area */}
        <div className="flex-1 overflow-y-auto py-8 px-4 flex flex-col items-center gap-6">
          {/* Cover page skeleton */}
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col gap-5">
            <div className="w-2/3 h-8 bg-slate-200 rounded-xl animate-pulse mx-auto" />
            <div className="w-1/3 h-4 bg-slate-200 rounded-full animate-pulse mx-auto" />
            <div className="w-full h-px bg-slate-200 my-2" />
            <div className="flex gap-3">
              <div className="w-20 h-5 bg-slate-200 rounded-full animate-pulse" />
              <div className="w-24 h-5 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Content block skeletons */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col gap-4"
            >
              <div className="w-1/3 h-5 bg-slate-200 rounded-full animate-pulse" />
              <div className="space-y-2.5">
                <div className="w-full h-3.5 bg-slate-200 rounded-full animate-pulse" />
                <div className="w-full h-3.5 bg-slate-200 rounded-full animate-pulse" />
                <div className="w-5/6 h-3.5 bg-slate-200 rounded-full animate-pulse" />
              </div>
              <div className="space-y-2.5">
                <div className="w-full h-3.5 bg-slate-200 rounded-full animate-pulse" />
                <div className="w-4/5 h-3.5 bg-slate-200 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Right sections panel */}
        <div className="w-64 shrink-0 border-l border-slate-200 bg-white flex flex-col">
          <div className="h-10 border-b border-slate-200 flex items-center px-4 gap-2">
            <div className="w-24 h-4 bg-slate-200 rounded-full animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg px-2 py-2"
              >
                <div className="w-4 h-4 rounded bg-slate-200 animate-pulse shrink-0" />
                <div
                  className="h-3 bg-slate-200 rounded-full animate-pulse"
                  style={{ width: `${55 + (i % 3) * 15}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
