import assert from "node:assert/strict";

let subject = {};
try {
  subject = await import("./admin-wiki-list-query.ts");
} catch {
  subject = {};
}

assert.equal(typeof subject.parseAdminWikiListQuery, "function");
assert.equal(typeof subject.buildAdminWikiListHref, "function");

const { parseAdminWikiListQuery, buildAdminWikiListHref } = subject;

assert.deepEqual(
  parseAdminWikiListQuery(
    new URLSearchParams({
      page: "3",
      q: "  dragon  ",
      status: "draft",
      category: "Character",
    }),
  ),
  {
    page: 3,
    q: "dragon",
    status: "draft",
    category: "Character",
  },
);

for (const page of ["", "0", "-2", "1.5", "nope"]) {
  assert.equal(
    parseAdminWikiListQuery(new URLSearchParams({ page })).page,
    1,
  );
}

assert.deepEqual(
  parseAdminWikiListQuery(
    new URLSearchParams({ status: "archived", category: "Enemy" }),
  ),
  { page: 1, q: "", status: "all", category: "" },
);

const activeState = {
  page: 7,
  q: "dragon",
  status: "draft",
  category: "Character",
};

assert.equal(
  buildAdminWikiListHref("/dashboard/wiki", activeState, { page: 3 }),
  "/dashboard/wiki?q=dragon&status=draft&category=Character&page=3",
);

assert.equal(
  buildAdminWikiListHref("/dashboard/wiki", activeState, { q: " wyvern " }),
  "/dashboard/wiki?q=wyvern&status=draft&category=Character",
);

assert.equal(
  buildAdminWikiListHref("/dashboard/wiki", activeState, { status: "all" }),
  "/dashboard/wiki?q=dragon&category=Character",
);

assert.equal(
  buildAdminWikiListHref("/dashboard/wiki", activeState, { category: "" }),
  "/dashboard/wiki?q=dragon&status=draft",
);

assert.equal(
  buildAdminWikiListHref(
    "/dashboard/wiki",
    { page: 1, q: "", status: "all", category: "" },
    {},
  ),
  "/dashboard/wiki",
);
