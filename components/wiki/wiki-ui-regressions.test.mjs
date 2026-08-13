import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const stepOneSchemaSource = readSource("../../models/dtos/wiki-create-step1.dto.ts");
const creationPageSource = readSource(
  "../../app/(dashboard)/dashboard/wiki/new/page.tsx",
);
const historyListSource = readSource("./wiki-history-list.tsx");
const infoboxSource = readSource("./wiki-infobox.tsx");
const publicRevisionSource = readSource(
  "../../app/(public)/wiki/[slug]/history/[revisionId]/page.tsx",
);
const adminRevisionSource = readSource(
  "../../app/(dashboard)/dashboard/wiki/[id]/history/[revisionId]/page.tsx",
);

test("creation titles share the maximum and omit inline i18n messages", () => {
  assert.match(stepOneSchemaSource, /WIKI_TITLE_MAX_LENGTH/);
  assert.equal(
    (
      stepOneSchemaSource.match(
        /\.max\(WIKI_TITLE_MAX_LENGTH,\s*"wiki\.title_too_long_error"\)/g,
      ) ?? []
    ).length,
    2,
  );
  assert.equal(
    creationPageSource.match(/maxLength=\{WIKI_TITLE_MAX_LENGTH\}/g)?.length,
    2,
  );
  assert.doesNotMatch(creationPageSource, /I18nFormMessage/);
});

test("rollback cancel uses the shared wiki translation", () => {
  assert.match(
    historyListSource,
    /<AlertDialogCancel>\s*\{t\("wiki\.cancel_button"\)\}\s*<\/AlertDialogCancel>/,
  );
});

test("infobox contains long user-controlled metadata values", () => {
  assert.ok((infoboxSource.match(/min-w-0/g) ?? []).length >= 4);
  assert.match(
    infoboxSource,
    /<dt className="[^"]*\[overflow-wrap:anywhere\][^"]*">\s*\{k\}\s*<\/dt>/,
  );
  assert.match(
    infoboxSource,
    /<dd className="[^"]*\[overflow-wrap:anywhere\][^"]*">\s*\{location\}\s*<\/dd>/,
  );
  assert.match(
    infoboxSource,
    /className="[^"]*\[overflow-wrap:anywhere\][^"]*"[\s\S]*?\{lbl\}/,
  );
  assert.match(
    infoboxSource,
    /className="[^"]*\[overflow-wrap:anywhere\][^"]*"[\s\S]*?\{slug\}/,
  );
  assert.match(
    infoboxSource,
    /<Badge[\s\S]*?className="[^"]*\[overflow-wrap:anywhere\][^"]*"[\s\S]*?>\s*\{tag\}\s*<\/Badge>/,
  );
});

test("historical pages render revision-owned publication and metadata state", () => {
  assert.match(publicRevisionSource, /isDraft=\{!revision\.isPublished\}/);
  assert.match(adminRevisionSource, /revision\.slug/);
  assert.match(adminRevisionSource, /revision\.slugVi/);
  assert.match(adminRevisionSource, /revision\.metadataJson/);
  assert.match(adminRevisionSource, /revision\.isPublished/);
});
