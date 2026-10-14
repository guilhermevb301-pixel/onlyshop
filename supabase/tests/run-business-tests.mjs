import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
let failed = false;
for (const file of ['supabase/tests/business_schema_fixture.sql','supabase/migrations/20261014090000_business_network.sql','supabase/migrations/20261014093000_business_chat_column_permissions.sql','supabase/migrations/20261014100000_verified_business_milestones.sql','supabase/migrations/20261014103000_business_history_pagination.sql','supabase/migrations/20261014110000_business_media_upload_read.sql','supabase/tests/business_network.sql']) {
  try { await db.exec(await readFile(file,'utf8')); console.log('PASS',file); }
  catch (error) { console.error('FAIL',file,error.message,error.code); failed=true; break; }
}
if (!failed) {
  const result=await db.query("select count(*)::int as synthetic_rows from auth.users where email like '%@onlyshop-ci.invalid'");
  if(result.rows[0].synthetic_rows!==0)throw new Error('Test rollback failed');
  console.log('PASS no synthetic rows remain after tests');
} else { process.exitCode=1; }
await db.close();
