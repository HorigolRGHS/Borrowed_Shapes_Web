import { WikiRevisionRepository } from './wiki-revision.repository';

describe('WikiRevisionRepository.countByPageIds', () => {
  function makeRepo(executeImpl: jest.Mock) {
    const em = { execute: executeImpl } as any;
    // Bypass EntityRepository super() DB wiring; we only exercise countByPageIds.
    const repo = Object.create(
      WikiRevisionRepository.prototype,
    ) as WikiRevisionRepository;
    (repo as any).getEntityManager = () => em;
    return repo;
  }

  it('returns an empty map without querying when no page ids given', async () => {
    const execute = jest.fn();
    const repo = makeRepo(execute);
    const result = await repo.countByPageIds([]);
    expect(result.size).toBe(0);
    expect(execute).not.toHaveBeenCalled();
  });

  it('maps rows to a pageId -> count map with the exact SQL and params', async () => {
    const execute = jest.fn().mockResolvedValue([
      { pageId: 'a', c: 3 },
      { pageId: 'b', c: 1 },
    ]);
    const repo = makeRepo(execute);
    const result = await repo.countByPageIds(['a', 'b']);
    expect(result.get('a')).toBe(3);
    expect(result.get('b')).toBe(1);
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('web."WikiRevision"');
    expect(sql).toContain('IN (?, ?)');
    expect(params).toEqual(['a', 'b']);
  });
});
