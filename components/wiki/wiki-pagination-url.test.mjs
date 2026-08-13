import assert from "node:assert/strict";

let subject = {};
try {
  subject = await import("./wiki-pagination-url.ts");
} catch {
  subject = {};
}

assert.equal(typeof subject.buildWikiPaginationHref, "function");

const { buildWikiPaginationHref } = subject;

assert.equal(
  buildWikiPaginationHref("/wiki", 2, {
    q: "dragon",
    category: "Character",
  }),
  "/wiki?q=dragon&category=Character&page=2",
);

assert.equal(
  buildWikiPaginationHref("/wiki", 1, {
    q: "dragon",
    category: "Character",
  }),
  "/wiki?q=dragon&category=Character",
);

assert.equal(
  buildWikiPaginationHref("/wiki", 1, { q: "dragon" }),
  "/wiki?q=dragon",
);

assert.equal(
  buildWikiPaginationHref("/wiki", 1, {
    q: "",
    category: "",
  }),
  "/wiki",
);

assert.equal(
  buildWikiPaginationHref("/wiki", 1, {
    q: "dragon",
    category: "Character",
    page: "9",
  }),
  "/wiki?q=dragon&category=Character",
);
