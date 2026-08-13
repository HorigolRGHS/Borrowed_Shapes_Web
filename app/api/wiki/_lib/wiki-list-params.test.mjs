import assert from "node:assert/strict";

let subject = {};
try {
  subject = await import("./wiki-list-params.ts");
} catch {
  subject = {};
}

assert.equal(typeof subject.getWikiListParams, "function");

const { getWikiListParams } = subject;
const searchParams = new URLSearchParams({
  page: "2",
  limit: "20",
  q: "dragon",
  category: "Character",
  sort: "title",
  order: "asc",
});

assert.deepEqual(getWikiListParams(searchParams), {
  page: "2",
  limit: "20",
  q: "dragon",
  category: "Character",
  sort: "title",
  order: "asc",
});
