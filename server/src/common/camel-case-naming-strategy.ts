import { AbstractNamingStrategy } from '@mikro-orm/core';

/**
 * Preserves camelCase property names and PascalCase table names as-is,
 * matching the existing database schema where columns are quoted identifiers
 * like "passwordHash", "createdAt", "userId", etc.
 *
 * FK column naming: relation property `user` → FK column `userId`
 */
export class CamelCaseNamingStrategy extends AbstractNamingStrategy {
  classToTableName(entityName: string): string {
    return entityName;
  }

  joinColumnName(propertyName: string): string {
    return `${propertyName}Id`;
  }

  joinKeyColumnName(entityName: string, referencedColumnName?: string): string {
    const col = referencedColumnName ?? 'id';
    return entityName.charAt(0).toLowerCase() + entityName.slice(1) + col.charAt(0).toUpperCase() + col.slice(1);
  }

  joinTableName(sourceEntity: string, targetEntity: string, propertyName: string): string {
    return propertyName;
  }

  propertyToColumnName(propertyName: string): string {
    return propertyName;
  }

  referenceColumnName(): string {
    return 'id';
  }

  aliasFor(entityName: string, index: number): string {
    return entityName.charAt(0).toLowerCase() + String(index);
  }
}
