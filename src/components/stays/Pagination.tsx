import Link from "next/link";
import { staysHref, type StaysParams } from "@/lib/stays-params";

/**
 * Page links rather than infinite scroll: the result set is small, and a page
 * number in the URL keeps a search shareable and the back button honest.
 */
export function Pagination({
  params,
  page,
  pageCount,
}: {
  params: StaysParams;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
      <Step
        href={staysHref(params, { page: page - 1 })}
        disabled={page <= 1}
        label="Previous page"
      >
        &larr;
      </Step>

      <ul className="flex items-center gap-1">
        {pages.map((n) => {
          const current = n === page;
          return (
            <li key={n}>
              <Link
                href={staysHref(params, { page: n })}
                scroll={false}
                aria-current={current ? "page" : undefined}
                aria-label={`Page ${n}`}
                className={[
                  "flex h-10 min-w-10 items-center justify-center rounded-sm px-3 text-[0.88rem] tabular-nums transition-colors",
                  current
                    ? "bg-forest text-ivory"
                    : "border border-line text-ink/75 hover:border-forest/45",
                ].join(" ")}
              >
                {n}
              </Link>
            </li>
          );
        })}
      </ul>

      <Step
        href={staysHref(params, { page: page + 1 })}
        disabled={page >= pageCount}
        label="Next page"
      >
        &rarr;
      </Step>
    </nav>
  );
}

function Step({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const classes =
    "flex h-10 w-10 items-center justify-center rounded-sm border border-line text-ink/75 transition-colors";

  // A disabled step is not a link at all, so keyboard users do not tab onto a
  // control that goes nowhere.
  if (disabled) {
    return (
      <span aria-hidden="true" className={`${classes} opacity-35`}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} scroll={false} aria-label={label} className={`${classes} hover:border-forest/45`}>
      <span aria-hidden="true">{children}</span>
    </Link>
  );
}
