import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const readSource = (relativePath) =>
  readFileSync(path.join(root, relativePath), "utf8");

function flattenKeys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const pathKey = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child)
      ? flattenKeys(child, pathKey)
      : [pathKey];
  });
}

function placeholders(value) {
  return [...String(value).matchAll(/\{([^}]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

function getAtPath(value, key) {
  return key.split(".").reduce((current, part) => current?.[part], value);
}

const en = JSON.parse(readSource("locales/en.json"));
const vi = JSON.parse(readSource("locales/vi.json"));

test("wiki dictionaries have matching keys and placeholders", () => {
  const enKeys = flattenKeys(en.wiki).sort();
  const viKeys = flattenKeys(vi.wiki).sort();
  assert.deepEqual(viKeys, enKeys);

  for (const key of enKeys) {
    assert.deepEqual(
      placeholders(getAtPath(vi.wiki, key)),
      placeholders(getAtPath(en.wiki, key)),
      `placeholder mismatch at wiki.${key}`,
    );
  }
});

test("public and admin wiki API responses use distinct DTOs", () => {
  const dtoSource = readSource("models/dtos/wiki.dto.ts");
  const apiSource = readSource("lib/wiki/api.ts");

  assert.match(dtoSource, /export interface WikiPublicListItem\s*\{/);
  assert.match(dtoSource, /export interface WikiPublicDetail\s*\{/);
  assert.match(apiSource, /fetchWikiList[\s\S]*Promise<WikiPublicListResponse>/);
  assert.match(apiSource, /searchWiki[\s\S]*Promise<WikiPublicListResponse>/);
  assert.match(apiSource, /fetchWikiBySlug[\s\S]*Promise<WikiPublicDetail>/);
  assert.match(apiSource, /fetchAdminWikiList[\s\S]*Promise<WikiListResponse>/);
});

test("public wiki pages consume localized public fields only", () => {
  const detailSource = readSource("app/(public)/wiki/[slug]/page.tsx");
  const historySource = readSource(
    "app/(public)/wiki/[slug]/history/page.tsx",
  );

  for (const source of [detailSource, historySource]) {
    assert.doesNotMatch(source, /detail\.(?:slugVi|titleVi)/);
    assert.doesNotMatch(source, /<WikiLocaleSync/);
  }
  assert.doesNotMatch(detailSource, /latestRevision\.(?:contentVi|summaryVi)/);
  assert.match(detailSource, /if \(slug !== detail\.slug\) \{/);
  assert.match(historySource, /if \(slug !== detail\.slug\) \{/);
});

test("wiki UI fallbacks, labels, and accessibility text are translated", () => {
  const expectations = new Map([
    ["app/(public)/wiki/search/page.tsx", ["wiki.search_failed", "wiki.search_results_for", "wiki.search_results_count"]],
    ["app/(dashboard)/dashboard/wiki/[id]/edit/page.tsx", ["wiki.load_failed", "wiki.save_failed", "wiki.conflict_latest_revision"]],
    ["app/(dashboard)/dashboard/wiki/admin-wiki-list-client.tsx", ["wiki.load_failed", "wiki.delete_failed"]],
    ["components/wiki/wiki-history-list.tsx", ["wiki.rollback_failed"]],
    ["components/wiki/wiki-form.tsx", ["wiki.editor_loading", "wiki.same_content_title", "wiki.publish_anyway"]],
    ["components/wiki/editable-title.tsx", ["wiki.edit_title_label"]],
    ["components/wiki/metadata/stats-input.tsx", ["wiki.metadata.remove_stat"]],
    ["components/wiki/metadata/tags-input.tsx", ["wiki.metadata.remove_tag"]],
    ["components/wiki/metadata/related-pages-picker.tsx", ["wiki.metadata.remove_related"]],
    ["components/language-dropdown.tsx", ["common.change_language"]],
  ]);

  for (const [file, keys] of expectations) {
    const source = readSource(file);
    for (const key of keys) {
      assert.match(source, new RegExp(key.replaceAll(".", "\\.")), `${file} must use ${key}`);
    }
  }
});

test("collapsed diff labels are formatted by i18n at render time", () => {
  const diffSource = readSource("lib/wiki/markdown-diff.ts");
  const viewSource = readSource("components/wiki/wiki-diff-view.tsx");

  assert.doesNotMatch(diffSource, /unchanged lines/);
  assert.match(diffSource, /collapsed:\s*true/);
  assert.match(viewSource, /wiki\.diff_unchanged_collapsed/);
});
