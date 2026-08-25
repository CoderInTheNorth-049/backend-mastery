import { describe, expect, it } from "vitest";
import {
  getProfileInsecure,
  renderNoteUnsafe,
  searchQueryVulnerable,
} from "./src/vulnerable";
import {
  escapeHtml,
  ownsOrDeny,
  parameterizedSearch,
  renderNoteSafe,
} from "./src/defenses";

const ATTACK_SQL = "'; DROP TABLE users; --";
const ATTACK_XSS = `<script>alert('xss')</script>`;

describe("the vulnerable reference (proof the attacks work)", () => {
  it("A03: concatenates raw user input into SQL text", () => {
    const { text } = searchQueryVulnerable(ATTACK_SQL);
    expect(text).toContain("'; DROP TABLE users; --");
    expect(text).toContain("DROP TABLE");
  });

  it("A01: returns ANY profile regardless of requester", () => {
    const store = new Map([
      [1, { name: "victim" }],
      [2, { name: "attacker" }],
    ]);
    // attacker (id 2) reads victim's (id 1) profile — flaw demonstrated
    expect(getProfileInsecure(store, 2, 1)).toEqual({ name: "victim" });
  });

  it("XSS: renders raw script tags into HTML", () => {
    const html = renderNoteUnsafe(ATTACK_XSS);
    expect(html).toContain("<script>");
  });
});

describe("defenses — parameterizedSearch", () => {
  it("keeps user input OUT of SQL text", () => {
    const { text, values } = parameterizedSearch(ATTACK_SQL);

    expect(text).not.toContain("DROP TABLE");
    expect(text).toContain("$1");
    expect(values[0]).toContain(ATTACK_SQL); // data travels as a VALUE
    expect(values[0]).toMatch(/^%/); // LIKE pattern wrapping
  });

  it("handles quote-heavy and empty input safely", () => {
    for (const q of ["'", "a'b'c''d", "%", "_", ""]) {
      const { text, values } = parameterizedSearch(q);
      expect(text).toBe(`SELECT * FROM users WHERE name LIKE $1`);
      expect(values[0]).toBe(`%${q}%`);
    }
  });
});

describe("defenses — ownsOrDeny (deny by default)", () => {
  it("allows the owner", () => {
    expect(ownsOrDeny(7, 7)).toBe("allow");
  });

  it("denies everyone else — even admins-by-accident", () => {
    expect(ownsOrDeny(8, 7)).toBe("deny");
  });

  it("denies missing requesters (unauthenticated)", () => {
    expect(ownsOrDeny(null, 7)).toBe("deny");
    expect(ownsOrDeny(undefined, 7)).toBe("deny");
  });

  it("never allows via truthy tricks (0 vs null semantics)", () => {
    expect(ownsOrDeny(0, 0)).toBe("allow"); // id 0 is a valid owner
    expect(ownsOrDeny(0, 7)).toBe("deny");
  });
});

describe("defenses — XSS escaping", () => {
  it("escapes all five HTML-significant characters", () => {
    expect(escapeHtml(`<script>"'&`)).toBe(
      "&lt;script&gt;&quot;&#39;&amp;",
    );
  });

  it("ampersand escaping is idempotent-safe order (no double encoding)", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;"); // literal text, escaped once
  });

  it("safeRender contains zero raw angle brackets from user input", () => {
    const html = renderNoteSafe(`${ATTACK_XSS} <img src=x onerror=alert(1)>`);

    expect(html).toMatch(/^<div class="note">/); // OUR wrapper survives
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html.endsWith("</div>")).toBe(true);
  });

  it("plain text passes through unharmed", () => {
    expect(renderNoteSafe("great note!")).toBe(`<div class="note">great note!</div>`);
  });
});
