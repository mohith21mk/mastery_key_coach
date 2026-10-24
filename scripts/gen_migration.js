const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '..', 'docs', 'NETLIFY_DATABASE_MIGRATION.md');
let content = fs.readFileSync(migrationPath, 'utf8');

// Also fix the triple backtick in docs/NETLIFY_DATABASE_MIGRATION.md if needed
content = content.replace(/\r\n`\r\n\r\n## Next Steps/, '\r\n```\r\n\r\n## Next Steps');
fs.writeFileSync(migrationPath, content, 'utf8');

const startTag = '```sql';
const endTag = '```';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) throw new Error('No ```sql found');
const sqlStart = startIdx + startTag.length;
const endIdx = content.indexOf(endTag, sqlStart);
if (endIdx === -1) throw new Error('No closing ``` found');

const sql = content.slice(sqlStart, endIdx).trim();
console.log('Extracted SQL length:', sql.length);

const outPath = path.join(__dirname, '..', 'netlify', 'functions', 'src', 'schemaMigration.ts');
const fileContent = `import { query } from './db';

export const SCHEMA_DDL = ${JSON.stringify(sql)};

export async function getExistingTables(): Promise<string[]> {
  try {
    const res = await query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    return res.rows.map((r) => r.table_name);
  } catch (err) {
    return [];
  }
}

export async function runSchemaMigration(): Promise<{ status: string; tables: string[]; message: string }> {
  const existing = await getExistingTables();
  if (existing.length >= 28 && existing.includes('users') && existing.includes('app_sessions')) {
    return {
      status: 'up_to_date',
      tables: existing,
      message: 'All core tables already exist in Supabase database.',
    };
  }

  // Execute safe non-destructive DDL
  await query(SCHEMA_DDL);

  const updated = await getExistingTables();
  return {
    status: 'migrated',
    tables: updated,
    message: \`Successfully migrated schema. \${updated.length} tables verified in database.\`,
  };
}
`;

fs.writeFileSync(outPath, fileContent, 'utf8');
console.log('Successfully generated netlify/functions/src/schemaMigration.ts');
