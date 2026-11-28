import { describe, expect, it } from "vitest";
import { bodyToHtml, htmlToPlainText, sanitizeBlogHtml } from "@storefront/_lib/blog";

describe("Blog rich-text HTML utilities", () => {
  it("strips scripts, event handlers, and javascript URIs while keeping safe formatting classes", () => {
    const dirty =
      '<h2 class="blog-callout">Benefits</h2>' +
      '<p style="color: red; text-align: center" onclick="alert(1)">Pure oil</p>' +
      '<script>alert("xss")</script>' +
      '<a href="javascript:alert(2)">Bad</a>' +
      '<ul class="blog-checklist"><li><strong>Cold pressed:</strong> Natural</li></ul>';

    const clean = sanitizeBlogHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain('<h2 class="blog-callout">Benefits</h2>');
    expect(clean).toContain('style="text-align: center"');
    expect(clean).toContain('<ul class="blog-checklist">');
  });

  it("converts structured body sections to HTML and extracts readable plain text", () => {
    const html = bodyToHtml([
      { heading: "Why Choose Chekku", paragraphs: ["Low temperature extraction."], list: ["Unrefined", "Aromatic"] },
    ]);
    expect(html).toBe("<h2>Why Choose Chekku</h2><p>Low temperature extraction.</p><ul><li>Unrefined</li><li>Aromatic</li></ul>");

    const plain = htmlToPlainText(html);
    expect(plain).toContain("Why Choose Chekku");
    expect(plain).toContain("Low temperature extraction.");
    expect(plain).toContain("Aromatic");
  });
});
