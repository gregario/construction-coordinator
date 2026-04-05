export default function SchedulePage() {
  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-[#2B1F17] mb-1">Schedule</h1>
      <p className="text-[#6B5D52] text-sm mb-6">Build timeline and upcoming phases</p>
      <div className="space-y-4">
        {['This Week', 'Next Week', 'Upcoming Milestones'].map(section => (
          <div key={section} className="bg-white rounded-lg border border-[#E8DFD3] p-4">
            <h2 className="text-sm font-semibold text-[#2B1F17] mb-3">{section}</h2>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-[#FAF7F2] rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
