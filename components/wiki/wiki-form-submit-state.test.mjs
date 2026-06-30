import assert from "node:assert/strict";
import { getWikiFormSubmitBlocker } from "./wiki-form-submit-state.ts";

assert.deepEqual(
  getWikiFormSubmitBlocker(
    { title: "Dragon", titleVi: "", content: "", contentVi: "" },
    {},
    "draft",
  ),
  { messageKey: "wiki.edit.save_blocked_title", locale: "vi" },
);

assert.deepEqual(
  getWikiFormSubmitBlocker(
    { title: "Dragon", titleVi: "Rồng", content: "", contentVi: "" },
    { slug: { message: "wiki.reserved_slug_error" } },
    "draft",
  ),
  { messageKey: "wiki.reserved_slug_error", locale: "en" },
);

assert.equal(
  getWikiFormSubmitBlocker(
    { title: "Dragon", titleVi: "Rồng", content: "", contentVi: "" },
    {},
    "draft",
  ),
  null,
);

assert.deepEqual(
  getWikiFormSubmitBlocker(
    { title: "Dragon", titleVi: "Rồng", content: "", contentVi: "" },
    {},
    "publish",
  ),
  { messageKey: "wiki.publish_warn_empty", locale: "en" },
);
