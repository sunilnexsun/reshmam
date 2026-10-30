import { site } from "@/lib/site";

type IconProps = { className?: string };
const s = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true } as const;

const Facebook = (p: IconProps) => (
  <svg {...s} className={p.className}><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4a21 21 0 0 0-2.3-.1c-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z" /></svg>
);
const Instagram = (p: IconProps) => (
  <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.8" className={p.className}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" /></svg>
);
const Youtube = (p: IconProps) => (
  <svg {...s} className={p.className}><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" /></svg>
);
const Whatsapp = (p: IconProps) => (
  <svg {...s} className={p.className}><path d="M12 2.5a9.4 9.4 0 0 0-8.1 14.2L2.5 21.5l4.9-1.3A9.4 9.4 0 1 0 12 2.5Zm0 17.1a7.7 7.7 0 0 1-3.9-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A7.7 7.7 0 1 1 12 19.6Zm4.2-5.8c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.3 6.3 0 0 1-3.1-2.7c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z" /></svg>
);

export const WhatsappIcon = Whatsapp;

const icons = { instagram: Instagram, facebook: Facebook, youtube: Youtube };
const labels = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube" };

/**
 * Social links. Entries whose URL is still "#" render as inert items marked
 * "coming soon" until the real profile URLs are added in src/lib/site.ts.
 */
export function SocialLinks({ className, withLabels }: { className?: string; withLabels?: boolean }) {
  return (
    <ul className={className ?? "flex gap-2.5"}>
      {(Object.keys(icons) as (keyof typeof icons)[]).map((k) => {
        const Icon = icons[k];
        const href = site.social[k];
        const live = href && href !== "#";
        const circle = "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 text-white transition-colors";
        const content = (
          <>
            <span className={`${circle} ${live ? "group-hover:bg-white group-hover:text-forest-900" : ""}`}>
              <Icon />
            </span>
            {withLabels && (
              <span className="text-sm">
                {labels[k]}
                {!live && <span className="ml-1.5 text-xs text-white/55">(coming soon)</span>}
              </span>
            )}
          </>
        );
        return (
          <li key={k}>
            {live ? (
              <a href={href} target="_blank" rel="noopener noreferrer" aria-label={withLabels ? undefined : `RESHMAM on ${labels[k]}`} className="group inline-flex items-center gap-3 text-white/85 hover:text-white">
                {content}
              </a>
            ) : (
              <span title={`${labels[k]} link coming soon`} className="inline-flex items-center gap-3 text-white/60" aria-label={withLabels ? undefined : `${labels[k]} (link coming soon)`} role={withLabels ? undefined : "img"}>
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
