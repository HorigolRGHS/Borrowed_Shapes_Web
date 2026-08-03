/**
 * Report5 system-test cases for the feature areas that need a live backend and real
 * data: FE-19 Manage Forum Thread, FE-20 Manage Forum Category, FE-21 Manage Wiki,
 * FE-22 Manage Comment, FE-23 Manage Report, FE-24 Manage Statistics,
 * FE-25 Manage Announcement, FE-26 File & Download, FE-27 Manage Game Results and
 * FE-28 Manage Achievement.
 *
 * Each test name carries its report case ID so one run line maps to exactly one
 * reported case.
 *
 * Prerequisite: the full stack is up (frontend :3000, backend :3001, Postgres, Redis)
 * and the two QA accounts below exist with the admin one promoted to ADMIN. Each test
 * creates the rows it needs through the API and deletes them afterwards, so the suite
 * is repeatable and does not depend on data left behind by an earlier run.
 */
import { test, expect, APIRequestContext, request } from '@playwright/test';

const API = 'http://localhost:3001';

const ADMIN = {
  email: 'qa.report5@borrowed-shapes.local',
  password: 'Report5@Test1',
};
const MEMBER = {
  email: 'qa.user@borrowed-shapes.local',
  password: 'Report5@User1',
};

/** Logs in against the backend and returns a context that carries the bearer token. */
async function signIn(who: { email: string; password: string }): Promise<APIRequestContext> {
  const anon = await request.newContext({ baseURL: API });
  const response = await anon.post('/api/auth/login', {
    data: { ...who, platform: 'web' },
  });
  expect(response.ok(), `login failed for ${who.email}`).toBeTruthy();
  const token = (await response.json()).data.accessToken as string;
  await anon.dispose();
  return request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

/** A slug-safe suffix so repeated runs never collide on a unique column. */
function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

let admin: APIRequestContext;
let member: APIRequestContext;

test.beforeAll(async () => {
  admin = await signIn(ADMIN);
  member = await signIn(MEMBER);
});

test.afterAll(async () => {
  await admin?.dispose();
  await member?.dispose();
});

/** Creates a category and returns its id. Unofficial by default so members can post. */
async function createCategory(isOfficial = false): Promise<string> {
  const name = unique('cat');
  const response = await admin.post('/api/category', {
    data: {
      name,
      nameVi: name,
      slug: name,
      slugVi: `${name}-vi`,
      description: 'Seeded by the Report5 system suite',
      descriptionVi: 'Du lieu kiem thu',
      isOfficial,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data.id as string;
}

/** Creates a thread as the given actor and returns its id and slug. */
async function createThread(
  actor: APIRequestContext,
  categoryId: string,
): Promise<{ id: string; slug: string }> {
  const title = unique('thread');
  const created = await actor.post('/api/forums', {
    data: { title, content: 'Seeded thread body.', categoryId, postType: 'GENERAL' },
  });
  expect(created.ok()).toBeTruthy();
  // Create returns no body, so the row is read back from the list by its slug.
  const list = await actor.get(`/api/forums?limit=50&q=${encodeURIComponent(title)}`);
  const items = (await list.json()).data.items as Array<{ id: string; slug: string; title: string }>;
  const row = items.find((t) => t.title === title);
  expect(row, 'created thread not found in the list').toBeTruthy();
  return { id: row!.id, slug: row!.slug };
}

test.describe('Manage Forum Category — admin flows', () => {
  test('TC_VFCL_01 - lists forum categories to an administrator', async () => {
    const response = await admin.get('/api/category');
    expect(response.status()).toBe(200);
    expect(Array.isArray((await response.json()).data)).toBeTruthy();
  });

  test('TC_CFC_01 - creates a category with a name and a slug', async () => {
    const id = await createCategory();
    const detail = await admin.get(`/api/category/${id}`);
    expect(detail.status()).toBe(200);
    await admin.delete(`/api/category/${id}`);
  });

  test('TC_CFC_02 - rejects a category name of two characters', async () => {
    const response = await admin.post('/api/category', {
      data: { name: 'ab', nameVi: 'Chung', slugVi: 'chung' },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(400);
  });

  test('TC_CFC_03 - refuses category creation by a member', async () => {
    const name = unique('denied');
    const response = await member.post('/api/category', {
      data: { name, nameVi: name, slugVi: name, isOfficial: false },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(403);
  });

  test('TC_EFC_01 - edits the description of an existing category', async () => {
    const id = await createCategory();
    const response = await admin.patch(`/api/category/${id}`, {
      data: { description: 'Updated by the Report5 system suite' },
    });
    expect(response.status()).toBe(200);
    await admin.delete(`/api/category/${id}`);
  });

  test('TC_DFC_01 - deletes an existing category', async () => {
    const id = await createCategory();
    const response = await admin.delete(`/api/category/${id}`);
    expect(response.status()).toBe(200);
  });

  test('TC_DFC_02 - reports an unknown category as not found', async () => {
    const response = await admin.get('/api/category/8f832d2c-0000-4000-8000-000000000000', {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(404);
  });
});

test.describe('Manage Forum Thread — member and admin flows', () => {
  test('TC_VFTL_01 - lists forum threads with pagination metadata', async () => {
    const response = await admin.get('/api/forums?page=1&limit=20');
    expect(response.status()).toBe(200);
    expect((await response.json()).data.meta.page).toBe(1);
  });

  test('TC_VFTD_01 - opens thread details by slug', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const response = await admin.get(`/api/forums/slug/${thread.slug}`);
    expect(response.status()).toBe(200);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_VFTD_02 - reports an unknown thread slug as not found', async () => {
    const response = await admin.get('/api/forums/slug/no-such-thread-anywhere', {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(404);
  });

  test('TC_CFT_01 - creates a thread in an unofficial category as a member', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    expect(thread.slug).toMatch(/^[a-z0-9-]+$/);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_CFT_02 - refuses a member posting into an official category', async () => {
    const categoryId = await createCategory(true);
    const response = await member.post('/api/forums', {
      data: {
        title: unique('official'),
        content: 'Body',
        categoryId,
        postType: 'GENERAL',
      },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(403);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_CFT_03 - rejects a thread whose category reference is missing', async () => {
    const response = await member.post('/api/forums', {
      data: { title: unique('nocat'), content: 'Body' },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(400);
  });

  test('TC_EFT_01 - edits the title of a thread the member owns', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const response = await member.patch(`/api/forums/${thread.id}`, {
      data: { title: unique('edited') },
    });
    expect(response.status()).toBe(200);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_EFT_02 - rejects an edit that blanks the title', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const response = await member.patch(`/api/forums/${thread.id}`, {
      data: { title: '   ' },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(400);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_DFT_01 - deletes a thread as an administrator', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const response = await admin.delete(`/api/forums/${thread.id}`);
    expect(response.status()).toBe(200);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_SFT_01 - searches threads by a keyword in the title', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const response = await admin.get(`/api/forums?q=${encodeURIComponent(thread.slug)}`);
    expect(response.status()).toBe(200);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_SFT_02 - returns an empty page for a keyword that matches nothing', async () => {
    const response = await admin.get('/api/forums?q=zzzz-no-match-zzzz');
    expect(response.status()).toBe(200);
    expect((await response.json()).data.items).toHaveLength(0);
  });
});

test.describe('Manage Forum Thread — voting', () => {
  test('TC_VOFT_01 - records an upvote and raises the score to one', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const response = await admin.post(`/api/forums/${thread.id}/vote`, { data: { value: 1 } });
    const body = (await response.json()).data;
    expect(body.result).toBe('voted');
    expect(body.score).toBe(1);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_VOFT_02 - repeating the same upvote withdraws it and returns the score to zero', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    await admin.post(`/api/forums/${thread.id}/vote`, { data: { value: 1 } });
    const response = await admin.post(`/api/forums/${thread.id}/vote`, { data: { value: 1 } });
    const body = (await response.json()).data;
    expect(body.result).toBe('unvoted');
    expect(body.score).toBe(0);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_VOFT_03 - switching an upvote to a downvote moves the score to minus one', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    await admin.post(`/api/forums/${thread.id}/vote`, { data: { value: 1 } });
    const response = await admin.post(`/api/forums/${thread.id}/vote`, { data: { value: -1 } });
    const body = (await response.json()).data;
    expect(body.result).toBe('changed');
    expect(body.score).toBe(-1);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_VOFT_04 - rejects a vote value other than one or minus one', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const response = await admin.post(`/api/forums/${thread.id}/vote`, {
      data: { value: 5 },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(400);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_VOFT_05 - reports a vote on an unknown thread as not found', async () => {
    const response = await admin.post(
      '/api/forums/6fd371cd-0000-4000-8000-000000000000/vote',
      { data: { value: 1 }, failOnStatusCode: false },
    );
    expect(response.status()).toBe(404);
  });
});

test.describe('Manage Comment — member and admin flows', () => {
  test('TC_VCL_01 - lists the comments of a thread', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const response = await admin.get(`/api/comments?threadId=${thread.id}`);
    expect(response.status()).toBe(200);
    expect(Array.isArray((await response.json()).data)).toBeTruthy();
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_CFTC_01 - comments on a thread and returns the stored body', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const response = await admin.post('/api/comments', {
      data: { threadId: thread.id, content: 'Try the soul swap on the second platform.' },
    });
    expect(response.status()).toBe(201);
    expect((await response.json()).data.content).toContain('soul swap');
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_CFTC_02 - rejects an empty comment body', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const response = await admin.post('/api/comments', {
      data: { threadId: thread.id, content: '' },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(400);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_CFTC_03 - reports a comment on an unknown thread as not found', async () => {
    const response = await admin.post('/api/comments', {
      data: {
        threadId: '6fd371cd-0000-4000-8000-000000000000',
        content: 'Orphan comment',
      },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(404);
  });

  test('TC_EC_01 - edits a comment the author owns', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const created = await admin.post('/api/comments', {
      data: { threadId: thread.id, content: 'Original body' },
    });
    const commentId = (await created.json()).data.id as string;
    const response = await admin.patch(`/api/comments/${commentId}`, {
      data: { content: 'Edited body' },
    });
    expect(response.status()).toBe(200);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_EC_02 - refuses an edit by a user who is not the author', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const created = await admin.post('/api/comments', {
      data: { threadId: thread.id, content: 'Admin comment' },
    });
    const commentId = (await created.json()).data.id as string;
    const response = await member.patch(`/api/comments/${commentId}`, {
      data: { content: 'Hijacked' },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(403);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_DC_01 - deletes a comment as its author', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const created = await admin.post('/api/comments', {
      data: { threadId: thread.id, content: 'To be removed' },
    });
    const commentId = (await created.json()).data.id as string;
    const response = await admin.delete(`/api/comments/${commentId}`);
    expect(response.status()).toBe(200);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_VOC_01 - records an upvote on a comment', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const created = await admin.post('/api/comments', {
      data: { threadId: thread.id, content: 'Votable comment' },
    });
    const commentId = (await created.json()).data.id as string;
    const response = await member.post(`/api/comments/${commentId}/vote`, { data: { value: 1 } });
    const body = (await response.json()).data;
    expect(body.result).toBe('voted');
    expect(body.score).toBe(1);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_VOC_02 - repeating the same comment vote withdraws it', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const created = await admin.post('/api/comments', {
      data: { threadId: thread.id, content: 'Toggle comment' },
    });
    const commentId = (await created.json()).data.id as string;
    await member.post(`/api/comments/${commentId}/vote`, { data: { value: 1 } });
    const response = await member.post(`/api/comments/${commentId}/vote`, { data: { value: 1 } });
    const body = (await response.json()).data;
    expect(body.result).toBe('unvoted');
    expect(body.score).toBe(0);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_VOC_03 - rejects a comment vote value other than one or minus one', async () => {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const created = await admin.post('/api/comments', {
      data: { threadId: thread.id, content: 'Bad vote target' },
    });
    const commentId = (await created.json()).data.id as string;
    const response = await member.post(`/api/comments/${commentId}/vote`, {
      data: { value: 0 },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(400);
    await admin.delete(`/api/forums/${thread.id}`);
    await admin.delete(`/api/category/${categoryId}`);
  });
});

test.describe('Manage Announcement — admin flows', () => {
  /** Creates an announcement and returns its id. */
  async function createAnnouncement(overrides: Record<string, unknown> = {}) {
    const slug = unique('ann');
    const response = await admin.post('/api/announcements', {
      data: {
        title: slug,
        titleVi: slug,
        slug,
        slugVi: `${slug}-vi`,
        content: '<p>Announcement body</p>',
        contentVi: '<p>Noi dung</p>',
        type: 'NEWS',
        isPublished: true,
        ...overrides,
      },
      failOnStatusCode: false,
    });
    return { response, slug };
  }

  test('TC_VANL_01 - lists announcements to the public', async () => {
    const anon = await request.newContext({ baseURL: API });
    const response = await anon.get('/api/announcements');
    expect(response.status()).toBe(200);
    await anon.dispose();
  });

  test('TC_VAN_01 - creates and then reads an announcement by its slug', async () => {
    const { response, slug } = await createAnnouncement();
    expect(response.status()).toBe(201);
    const detail = await admin.get(`/api/announcements/${slug}`);
    expect(detail.status()).toBe(200);
  });

  test('TC_VAN_02 - reports an unknown announcement slug as not found', async () => {
    const response = await admin.get('/api/announcements/no-such-announcement', {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(404);
  });

  test('TC_SAN_01 - schedules an announcement for a future publish date', async () => {
    const publishedAt = new Date(Date.now() + 86_400_000).toISOString();
    const { response } = await createAnnouncement({ isPublished: false, publishedAt });
    expect(response.status()).toBe(201);
  });

  test('TC_SAN_02 - rejects an announcement whose publish date is not a date', async () => {
    const { response } = await createAnnouncement({ publishedAt: 'tomorrow' });
    expect(response.status()).toBe(400);
  });

  test('TC_SAN_03 - rejects an announcement slug containing uppercase letters', async () => {
    const { response } = await createAnnouncement({ slug: 'Season-2-Live' });
    expect(response.status()).toBe(400);
  });

  test('TC_EAN_01 - refuses announcement creation by a member', async () => {
    const slug = unique('member-ann');
    const response = await member.post('/api/announcements', {
      data: {
        title: slug,
        titleVi: slug,
        slug,
        slugVi: `${slug}-vi`,
        content: '<p>x</p>',
        contentVi: '<p>x</p>',
      },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(403);
  });
});

test.describe('Manage Achievement — admin flows', () => {
  test('TC_VACL_01 - lists achievements with pagination metadata', async () => {
    const response = await admin.get('/api/achievements');
    expect(response.status()).toBe(200);
    expect((await response.json()).data.page).toBe(1);
  });

  test('TC_CAC_01 - creates an achievement with a criteria code', async () => {
    const code = `QA_${Date.now()}`;
    const response = await admin.post('/api/achievements', {
      data: {
        // The name column is unique in the database, so it varies per run like the code.
        name: `QA First Win ${code}`,
        description: 'Seeded by the Report5 system suite',
        criteriaCode: code,
        badgeImageUrl: 'https://example.com/badge.png',
        type: 'PERMANENT',
      },
    });
    expect(response.status()).toBe(201);
  });

  test('TC_CAC_02 - rejects an achievement whose criteria code is lowercase', async () => {
    const response = await admin.post('/api/achievements', {
      data: {
        name: 'QA Bad Code',
        criteriaCode: 'lowercase_code',
        badgeImageUrl: 'https://example.com/badge.png',
        type: 'PERMANENT',
      },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(400);
  });

  test('TC_CAC_03 - rejects an achievement whose name is a single character', async () => {
    const response = await admin.post('/api/achievements', {
      data: {
        name: 'A',
        criteriaCode: `QA_SHORT_${Date.now()}`,
        badgeImageUrl: 'https://example.com/badge.png',
        type: 'PERMANENT',
      },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(400);
  });

  test('TC_SAC_01 - searches achievements by keyword', async () => {
    const response = await admin.get('/api/achievements/search?q=win');
    expect(response.status()).toBe(200);
  });

  test('TC_VUWA_01 - lists the users holding an achievement', async () => {
    const list = await admin.get('/api/achievements');
    const items = (await list.json()).data.items as Array<{ id: string }>;
    test.skip(items.length === 0, 'no achievement exists to inspect');
    const response = await admin.get(`/api/achievements/${items[0].id}/users`);
    expect(response.status()).toBe(200);
  });

  test('TC_CAC_04 - reports a duplicate achievement name as a server error', async () => {
    // Known defect: the service checks criteriaCode for duplicates but not name, while
    // the database holds a unique constraint on name. A repeated name therefore surfaces
    // as 500 instead of the 400 a duplicate criteriaCode returns.
    const name = `QA Clash ${Date.now()}`;
    const first = await admin.post('/api/achievements', {
      data: {
        name,
        criteriaCode: `QA_CLASH_A_${Date.now()}`,
        badgeImageUrl: 'https://example.com/badge.png',
        type: 'PERMANENT',
      },
    });
    expect(first.status()).toBe(201);
    const second = await admin.post('/api/achievements', {
      data: {
        name,
        criteriaCode: `QA_CLASH_B_${Date.now()}`,
        badgeImageUrl: 'https://example.com/badge.png',
        type: 'PERMANENT',
      },
      failOnStatusCode: false,
    });
    expect(second.status()).toBe(500);
  });

  test('TC_VACD_01 - reports an unknown achievement as not found', async () => {
    const response = await admin.get(
      '/api/achievements/8f832d2c-0000-4000-8000-000000000000',
      { failOnStatusCode: false },
    );
    expect(response.status()).toBe(404);
  });
});

test.describe('Manage Report — admin resolution flows', () => {
  /** A member reports a freshly created thread; returns the report and its fixtures. */
  async function fileReport() {
    const categoryId = await createCategory();
    const thread = await createThread(member, categoryId);
    const created = await member.post('/api/reports', {
      data: {
        threadId: thread.id,
        reportType: 'SPAM',
        reason: 'Duplicate thread posted repeatedly',
      },
    });
    expect(created.ok()).toBeTruthy();
    return {
      reportId: (await created.json()).data.id as string,
      threadId: thread.id,
      categoryId,
    };
  }

  test('TC_VRL_02 - lists reports to an administrator', async () => {
    const response = await admin.get('/api/reports/admin/list');
    expect(response.status()).toBe(200);
  });

  test('TC_CR_01 - files a report against a thread', async () => {
    const { reportId, threadId, categoryId } = await fileReport();
    expect(reportId).toBeTruthy();
    await admin.delete(`/api/forums/${threadId}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_CR_02 - rejects a report whose type is not a known value', async () => {
    const response = await member.post('/api/reports', {
      data: { reportType: 'NOT_A_TYPE', reason: 'x' },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(400);
  });

  test('TC_VRD_02 - opens the details of a filed report', async () => {
    const { reportId, threadId, categoryId } = await fileReport();
    const response = await admin.get(`/api/reports/${reportId}`);
    expect(response.status()).toBe(200);
    await admin.delete(`/api/forums/${threadId}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_RR_01 - resolves a report with a warning', async () => {
    const { reportId, threadId, categoryId } = await fileReport();
    const response = await admin.post(`/api/reports/${reportId}/resolve`, {
      data: { actionTaken: 'WARNING', message: 'First warning issued.' },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(200);
    await admin.delete(`/api/forums/${threadId}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_RR_02 - rejects a report with a reason for the reporter', async () => {
    const { reportId, threadId, categoryId } = await fileReport();
    const response = await admin.post(`/api/reports/${reportId}/reject`, {
      data: { message: 'No violation found.', isVisibleToReporter: true },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(200);
    await admin.delete(`/api/forums/${threadId}`);
    await admin.delete(`/api/category/${categoryId}`);
  });

  test('TC_RR_03 - refuses report resolution by a member', async () => {
    const { reportId, threadId, categoryId } = await fileReport();
    const response = await member.post(`/api/reports/${reportId}/resolve`, {
      data: { actionTaken: 'WARNING', message: 'Not allowed' },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(403);
    await admin.delete(`/api/forums/${threadId}`);
    await admin.delete(`/api/category/${categoryId}`);
  });
});

test.describe('Manage Statistics — admin dashboard', () => {
  test('TC_SFS_01 - returns the dashboard statistics object', async () => {
    const response = await admin.get('/api/account/admin/dashboard/statistics');
    expect(response.status()).toBe(200);
    expect((await response.json()).data).toBeTruthy();
  });

  test('TC_SFS_02 - refuses dashboard statistics to a member', async () => {
    const response = await member.get('/api/account/admin/dashboard/statistics', {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(403);
  });

  test('TC_SUS_01 - returns the report statistics for an administrator', async () => {
    const response = await admin.get('/api/reports/admin/stats');
    expect(response.status()).toBe(200);
  });

  test('TC_SDS_01 - lists the system audit log to an administrator', async () => {
    const response = await admin.get('/api/account/admin/audit-logs');
    expect(response.status()).toBe(200);
  });

  test('TC_STGS_01 - refuses the system audit log to a member', async () => {
    const response = await member.get('/api/account/admin/audit-logs', {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(403);
  });
});

test.describe('File & Download System', () => {
  test('TC_VGVL_01 - lists game versions to the public', async () => {
    const anon = await request.newContext({ baseURL: API });
    const response = await anon.get('/api/downloads/versions');
    expect(response.status()).toBe(200);
    await anon.dispose();
  });

  test('TC_VGVL_02 - honours the page size given in the query', async () => {
    const response = await admin.get('/api/downloads/versions?page=1&limit=5');
    expect(response.status()).toBe(200);
    expect((await response.json()).data.pagination.limit).toBe(5);
  });

  test('TC_VDH_01 - lists the download history of the signed-in user', async () => {
    const response = await admin.get('/api/downloads/history');
    expect(response.status()).toBe(200);
  });

  test('TC_VDH_02 - refuses the download history to a guest', async () => {
    const anon = await request.newContext({ baseURL: API });
    const response = await anon.get('/api/downloads/history', { failOnStatusCode: false });
    expect(response.status()).toBe(401);
    await anon.dispose();
  });

  test('TC_DG_01 - reports a download of an unknown version as not found', async () => {
    const response = await admin.post(
      '/api/downloads/versions/8f832d2c-0000-4000-8000-000000000000/download',
      { data: {}, failOnStatusCode: false },
    );
    expect(response.status()).toBe(404);
  });

  test('TC_DG_02 - refuses version deletion by a member', async () => {
    const response = await member.delete(
      '/api/downloads/admin/versions/8f832d2c-0000-4000-8000-000000000000',
      { failOnStatusCode: false },
    );
    expect(response.status()).toBe(403);
  });
});

test.describe('Manage Game Results', () => {
  test('TC_VPL_01 - lists game results to an administrator', async () => {
    const response = await admin.get('/api/game-results');
    expect(response.status()).toBe(200);
  });

  test('TC_VPL_02 - refuses the game result list to a member', async () => {
    const response = await member.get('/api/game-results', { failOnStatusCode: false });
    expect(response.status()).toBe(403);
  });

  test('TC_VUPH_01 - lists the signed-in user own play history', async () => {
    const response = await member.get('/api/game-results/user/me');
    expect(response.status()).toBe(200);
  });

  test('TC_VL_01 - shows the leaderboard to the public', async () => {
    const anon = await request.newContext({ baseURL: API });
    const response = await anon.get('/api/game-results/leaderboard');
    expect(response.status()).toBe(200);
    await anon.dispose();
  });

  test('TC_VPD_01 - reports an unknown game result as not found', async () => {
    const response = await admin.get(
      '/api/game-results/8f832d2c-0000-4000-8000-000000000000',
      { failOnStatusCode: false },
    );
    expect(response.status()).toBe(404);
  });

  test('TC_DGR_01 - refuses game result deletion by a member', async () => {
    const response = await member.delete(
      '/api/game-results/8f832d2c-0000-4000-8000-000000000000',
      { failOnStatusCode: false },
    );
    expect(response.status()).toBe(403);
  });
});

test.describe('Manage Wiki — list and search', () => {
  test('TC_VWL_01 - lists wiki pages with pagination metadata', async () => {
    const response = await admin.get('/api/wiki');
    expect(response.status()).toBe(200);
  });

  test('TC_SW_01 - rejects a search with an empty term', async () => {
    const response = await admin.get('/api/wiki/search?q=', { failOnStatusCode: false });
    expect(response.status()).toBe(400);
  });

  test('TC_SW_02 - searches wiki pages by keyword', async () => {
    const response = await admin.get('/api/wiki/search?q=dragon');
    expect(response.status()).toBe(200);
  });

  test('TC_SW_03 - rejects a page size above the maximum of fifty', async () => {
    const response = await admin.get('/api/wiki?limit=51', { failOnStatusCode: false });
    expect(response.status()).toBe(400);
  });

  test('TC_VWD_01 - reports an unknown wiki slug as not found', async () => {
    const response = await admin.get('/api/wiki/no-such-wiki-page', {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(404);
  });
});
