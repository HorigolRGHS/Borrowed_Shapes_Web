import { Entity, Index, ManyToOne, type Opt, PrimaryKey, PrimaryKeyProp, Property } from '@mikro-orm/core';
import { GameProfile } from './GameProfile';
import { SeasonTeam } from './SeasonTeam';

@Entity({ schema: 'game' })
export class SeasonTeamMember {

  [PrimaryKeyProp]?: ['seasonMonth', 'gameProfileId'];

  @PrimaryKey({ type: 'date' })
  seasonMonth!: string;

  @ManyToOne({ entity: () => GameProfile, fieldName: 'gameProfileId', deleteRule: 'cascade', primary: true })
  gameProfileId!: GameProfile;

  @Index({ name: 'SeasonTeamMember_team_idx', expression: 'CREATE INDEX "SeasonTeamMember_team_idx" ON game."SeasonTeamMember" USING btree ("teamId")' })
  @ManyToOne({ entity: () => SeasonTeam, fieldName: 'teamId', deleteRule: 'cascade' })
  teamId!: SeasonTeam;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  joinedAt!: Date & Opt;

}
