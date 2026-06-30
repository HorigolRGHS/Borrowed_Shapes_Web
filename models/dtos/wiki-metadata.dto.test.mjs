import assert from "node:assert/strict";
import { normalizeWikiFormMetadata } from "./wiki-metadata.dto.ts";

assert.deepEqual(normalizeWikiFormMetadata(null), {
  tags: [],
  tags_vi: [],
  stats: {},
  relatedPages: [],
});

assert.deepEqual(normalizeWikiFormMetadata({ category: "Boss" }), {
  category: "Boss",
  tags: [],
  tags_vi: [],
  stats: {},
  relatedPages: [],
});

assert.deepEqual(
  normalizeWikiFormMetadata({ tags: ["dragon"], stats: { hp: 10 } }),
  {
    tags: ["dragon"],
    tags_vi: [],
    stats: { hp: 10 },
    relatedPages: [],
  },
);
