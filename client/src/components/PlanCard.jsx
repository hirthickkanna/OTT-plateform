export default function PlanCard({ plan, featured, onSubscribe }) {
  const price = plan.priceCents % 100 === 0 
    ? (plan.priceCents / 100).toFixed(0) 
    : (plan.priceCents / 100).toFixed(2);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 ${
        featured
          ? "border-rose-500/50 bg-gradient-to-b from-rose-950/40 to-zinc-900/80 shadow-xl shadow-rose-950/25 scale-[1.02] md:scale-105"
          : "border-white/8 bg-zinc-900/60 hover:border-white/15 hover:bg-zinc-900/80"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-rose-600 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Most popular
        </span>
      )}
      <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-white">₹{price}</span>
        <span className="text-zinc-500">/{plan.interval || "month"}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features?.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
            <svg
              className={`mt-0.5 h-5 w-5 shrink-0 ${featured ? "text-rose-400" : "text-zinc-500"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onSubscribe(plan._id)}
        className={`mt-8 w-full rounded-xl py-3.5 text-sm font-semibold transition ${
          featured
            ? "bg-rose-600 text-white hover:bg-rose-500"
            : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
        }`}
      >
        Choose {plan.name}
      </button>
    </div>
  );
}
