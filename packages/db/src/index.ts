import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index';

export * from './schema/index';
export { schema };

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is not set');
  return drizzle(new pg.Pool({ connectionString: url }), { schema });
}
export type Db = ReturnType<typeof createDb>;
