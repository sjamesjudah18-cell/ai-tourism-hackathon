type BudgetBreakdown = {
  total_budget: number;
  hotel: number;
  transport: number;
  food: number;
  activities: number;
  emergency_buffer: number;
  daily_food_budget?: number;
  daily_activity_budget?: number;
  remaining_budget?: number;
};

type BudgetCardProps = {
  budget: BudgetBreakdown;
  days: number;
  travelers?: number;
};

export default function BudgetCard({ budget, days, travelers = 1 }: BudgetCardProps) {
  const total = budget.total_budget || 25000;

  const categories = [
    { label: "Accommodation", value: budget.hotel, color: "bg-[#d97745]", pct: Math.round((budget.hotel / total) * 100) },
    { label: "Food & Dining", value: budget.food, color: "bg-amber-400", pct: Math.round((budget.food / total) * 100) },
    { label: "Activities & Entry", value: budget.activities, color: "bg-emerald-500", pct: Math.round((budget.activities / total) * 100) },
    { label: "Local Transport", value: budget.transport, color: "bg-sky-500", pct: Math.round((budget.transport / total) * 100) },
    { label: "Safety Reserve", value: budget.emergency_buffer, color: "bg-purple-400", pct: Math.round((budget.emergency_buffer / total) * 100) },
  ];

  return (
    <div className="rounded-[28px] border border-black/5 bg-[#171717] p-7 text-white shadow-xl md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#dca17e]">
            Smart Budget Optimizer
          </span>
          <h3 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
            ₹{total.toLocaleString("en-IN")}
          </h3>
          <p className="mt-1 text-xs text-white/60">
            For {days} days · {travelers} {travelers > 1 ? "travelers" : "traveler"} (~₹{Math.round(total / (days * travelers)).toLocaleString("en-IN")}/person/day)
          </p>
        </div>

        <div className="flex gap-4 rounded-2xl bg-white/5 px-4 py-3 border border-white/10 text-xs">
          <div>
            <p className="text-[10px] uppercase text-white/50">Daily Food</p>
            <p className="font-semibold text-white">
              ₹{(budget.daily_food_budget || Math.round(budget.food / days)).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="border-l border-white/10 pl-4">
            <p className="text-[10px] uppercase text-white/50">Daily Activities</p>
            <p className="font-semibold text-white">
              ₹{(budget.daily_activity_budget || Math.round(budget.activities / days)).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Multi-segment progress bar */}
      <div className="mt-7">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          {categories.map((c) => (
            <div
              key={c.label}
              className={`h-full ${c.color}`}
              style={{ width: `${c.pct}%` }}
              title={`${c.label}: ₹${c.value.toLocaleString("en-IN")} (${c.pct}%)`}
            />
          ))}
        </div>
      </div>

      {/* Detailed breakdown grid */}
      <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((c) => (
          <div key={c.label} className="rounded-xl bg-white/5 p-3.5 border border-white/5">
            <div className="flex items-center gap-1.5 text-xs text-white/70">
              <span className={`h-2 w-2 rounded-full ${c.color}`} />
              <span className="truncate">{c.label}</span>
            </div>
            <p className="mt-1.5 text-lg font-bold text-white">
              ₹{c.value.toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-white/40">{c.pct}% of total</span>
          </div>
        ))}
      </div>

      {/* Smart Budget Alternative Pill (SIH PPT Requirement) */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-200">
        <span className="text-base">💡</span>
        <div>
          <p className="font-semibold text-white">Smart Saving Alternative:</p>
          <p className="mt-0.5 text-amber-100/80 leading-relaxed">
            By shifting from luxury cabs to the city metro line and auto-rickshaws for Day 2 & 3, you can save up to ₹1,800, which can be reallocated to authentic local culinary experiences!
          </p>
        </div>
      </div>
    </div>
  );
}
