import Image from "next/image";
import type { ReactNode } from "react";
import { Play } from "lucide-react";
import { Eyebrow } from "../ui/primitives";

/** Renders a real video when a URL is configured, otherwise a clearly labelled placeholder. */
export function VideoPlayer({
  url,
  poster,
  title,
  playAt = { x: 50, y: 50 },
  aspect = "492 / 182",
}: {
  url: string | null;
  poster: string;
  title: string;
  playAt?: { x: number; y: number };
  aspect?: string;
}) {
  if (url) {
    const isEmbed = /youtube\.com\/embed|player\.vimeo\.com/.test(url);
    return (
      <div className="overflow-hidden rounded-xl bg-forest-950 shadow-card-hover" style={{ aspectRatio: "16 / 9" }}>
        {isEmbed ? (
          <iframe
            src={url}
            title={title}
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video controls preload="metadata" poster={poster} className="h-full w-full object-cover">
            <source src={url} />
            Your browser does not support embedded video.
          </video>
        )}
      </div>
    );
  }

  return (
    <figure className="relative overflow-hidden rounded-xl bg-forest-950 shadow-card-hover" style={{ aspectRatio: aspect }}>
      <Image src={poster} alt={`${title} — video preview image`} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden />
      <span
        aria-hidden
        className="absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-forest-800/95 text-white shadow-lg"
        style={{ left: `${playAt.x}%`, top: `${playAt.y}%` }}
      >
        <Play className="ml-1 h-7 w-7 fill-current" />
      </span>
      <figcaption className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
        Video coming soon
      </figcaption>
    </figure>
  );
}

export function VideoSection({
  eyebrow,
  title,
  headingId,
  video,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  headingId: string;
  video: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={headingId} className="relative">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.12fr_1fr] lg:gap-12 lg:px-8 lg:py-12">
        <div>{video}</div>
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 id={headingId} className="mt-1 font-serif text-3xl font-bold leading-tight text-forest-800 sm:text-[2.1rem]">
            {title}
          </h2>
          <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-soft">{children}</div>
        </div>
      </div>
    </section>
  );
}
