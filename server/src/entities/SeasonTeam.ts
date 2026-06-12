import { Entity, ManyToOne, type Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { GameProfile } from './GameProfile';

@Entity({ schema: 'game' })
@Unique({ name: 'SeasonTeam_seasonMonth_leaderId_key', expression: 'CREATE UNIQUE INDEX "SeasonTeam_seasonMonth_leaderId_key" ON game."SeasonTeam" USING btree ("seasonMonth", "leaderId")', properties: ['seasonMonth', 'leaderId'] })
@Unique({ name: 'SeasonTeam_season_code_idx', expression: 'CREATE UNIQUE INDEX "SeasonTeam_season_code_idx" ON game."SeasonTeam" USING btree ("seasonMonth", code)', properties: ['seasonMonth', 'code'] })
export class SeasonTeam {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Property({ type: 'date' })
  seasonMonth!: string;

  @Property({ type: 'text', nullable: true })
  code?: string;

  @Property({ type: 'text', nullable: true })
  name?: string;

  @ManyToOne({ entity: () => GameProfile, fieldName: 'leaderId', deleteRule: 'cascade' })
  leaderId!: GameProfile;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  createdAt!: Date & Opt;

}
