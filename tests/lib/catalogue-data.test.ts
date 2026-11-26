// A product's photos from Firestore: the primary one is the main image, and the product page gets all of them.
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({}));

const { formatProduct } = await import("@/lib/catalogue-data");

const photos = ["a.webp", "b.webp", "c.webp", "d.webp"];

describe("formatProduct images", () => {
  it("keeps every photo, primary first", () => {
    const p = formatProduct({ id: "p_1", name: "Oil", images: photos, primaryImage: 2 }, []);
    expect(p.image).toBe("c.webp");
    expect(p.images).toEqual(["c.webp", "a.webp", "b.webp", "d.webp"]);
  });

  it("drops repeats and blanks", () => {
    const p = formatProduct({ id: "p_1", name: "Oil", images: ["a.webp", "", "a.webp", "b.webp"] }, []);
    expect(p.images).toEqual(["a.webp", "b.webp"]);
  });

  it("falls back to the default photo when there are none", () => {
    const p = formatProduct({ id: "p_1", name: "Oil" }, []);
    expect(p.images).toEqual([p.image]);
  });
});
