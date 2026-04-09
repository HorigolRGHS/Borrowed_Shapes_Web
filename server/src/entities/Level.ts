import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ schema: 'game' })
export class Level {

  @PrimaryKey({ type: 'text' })
  id!: string;

  @Property({ type: 'text' })
  displayName!: string;

  @Unique({ name: 'Level_order_key', expression: 'CREATE UNIQUE INDEX "Level_order_key" ON game."Level" USING btree ("order")' })
  @Property()
  order!: number;

}
