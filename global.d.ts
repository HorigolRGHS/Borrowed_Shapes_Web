interface WikiSlugData {
  slug: string;
  slugVi: string;
  pathSuffix: string;
}

interface Window {
  __wikiSlugData?: WikiSlugData;
}

declare module '@hookform/resolvers/zod' {
  import { Resolver } from 'react-hook-form';
  import * as z from 'zod';
  export function zodResolver<TFieldValues extends z.FieldValues>(
    schema: z.Schema<TFieldValues, any, any> | z.Effects<z.Schema<TFieldValues, any, any>, any, any>,
    schemaOptions?: any,
    factoryOptions?: { mode?: 'async' | 'sync'; rawValues?: boolean }
  ): Resolver<TFieldValues>;
}
