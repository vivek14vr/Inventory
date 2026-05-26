import Link from "next/link";

type QuickActionCardProps = {
  href: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  badge?: string;
};

export function QuickActionCard({
  href,
  title,
  description,
  icon,
  badge,
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm shadow-zinc-900/[0.03] transition hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-900/[0.06]"
    >
      {icon && (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-zinc-900">{title}</p>
          {badge && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-1 h-5 w-5 shrink-0 text-zinc-300 transition group-hover:text-emerald-600"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
          clipRule="evenodd"
        />
      </svg>
    </Link>
  );
}
