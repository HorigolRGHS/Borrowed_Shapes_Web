import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import {
  ForumCommentRepository,
  ForumCommentVoteRepository,
} from './repositories/comments.repository';
import { ForumThreadRepository } from '../forums/repositories/forums.repository';
import { AuditService } from '../audit/audit.service';

describe('CommentsService', () => {
  let service: CommentsService;

  beforeEach(async () => {
    const mockCommentRepo = {};
    const mockCommentVoteRepo = {};
    const mockThreadRepo = {};
    const mockAuditService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: ForumCommentRepository, useValue: mockCommentRepo },
        { provide: ForumCommentVoteRepository, useValue: mockCommentVoteRepo },
        { provide: ForumThreadRepository, useValue: mockThreadRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
