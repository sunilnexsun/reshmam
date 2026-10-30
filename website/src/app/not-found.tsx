import { ButtonLink, Container } from "@/components/ui/primitives";
import { LeafSprig } from "@/components/ui/decor";

export default function NotFound() {
  return (
    <section className="relative overflow-hidden bg-paper py-24">
      <LeafSprig className="absolute -left-8 top-10 h-56 w-36 -rotate-12" />
      <Container className="relative max-w-xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-rust">404</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-forest-800">Page not found</h1>
        <p className="mt-3 text-ink-soft">The page you&apos;re looking for has moved or doesn&apos;t exist.</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/">Go Home</ButtonLink>
          <ButtonLink href="/products" variant="outline">Shop Products</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
