import { splitBilingualName } from "@storefront/_lib/bilingual-name";

/**
 * A name written as "English ( Tamil )" on two lines: the English first, then the Tamil in its brackets.
 * Names with no Tamil show as they are.
 */
export function BilingualName({ name, className, tamilClassName }: { name: string; className?: string; tamilClassName?: string }) {
  const { english, tamil } = splitBilingualName(name);
  return (
    <span className={className}>
      <span className="block">{english}</span>
      {tamil && (
        <span lang="ta" className={`block ${tamilClassName ?? ""}`}>
          ( {tamil} )
        </span>
      )}
    </span>
  );
}
