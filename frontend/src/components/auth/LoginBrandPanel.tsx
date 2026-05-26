import { BrandLogo } from "./BrandLogo";

const FEATURES = [
  {
    label: "Vasai",
    title: "Warehouse operations",
    desc: "Stock in, out & transfers",
  },
  {
    label: "Goregaon",
    title: "Warehouse operations",
    desc: "Receive & dispatch inventory",
  },
  {
    label: "Admin",
    title: "Central control",
    desc: "Reports, imports & audit",
  },
] as const;

export function LoginBrandPanel() {
  return (
    <div className="relative flex h-full min-h-screen flex-col justify-between overflow-hidden bg-[#0d4f3c] px-10 py-14 text-white xl:px-14">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-1/4 h-64 w-64 rounded-full bg-teal-300/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-transparent to-teal-900/30"
        aria-hidden
      />

      <div className="relative">
        <BrandLogo size="lg" variant="light" />
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200/80">
          SV Enterprises
        </p>
        <h1 className="mt-4 max-w-md text-[2rem] font-semibold leading-[1.15] tracking-tight xl:text-4xl">
          Inventory &amp; stock movement
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-emerald-100/75">
          Manage disposal products across Vasai and Goregaon — from daily stock
          movement to Tally imports and executive reports.
        </p>
      </div>

      <div className="relative space-y-3">
        {FEATURES.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur-sm transition hover:bg-white/8"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xs font-bold tracking-wide">
              {item.label.slice(0, 1)}
            </span>
            <div>
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="mt-0.5 text-xs text-emerald-100/60">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="relative text-xs text-emerald-200/50">
        © {new Date().getFullYear()} SV Enterprises. Authorized access only.
      </p>
    </div>
  );
}
