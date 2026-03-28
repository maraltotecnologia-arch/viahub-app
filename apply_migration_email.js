// apply_migration_email.js
// Aplica a migration de rastreamento de email (email_aberto_em, enviado_email, enviado_email_em)
// Uso: node apply_migration_email.js
// Ou:  node apply_migration_email.js --db-password=SUA_SENHA

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Carrega variáveis do .env ──────────────────────────────────
const envContent = readFileSync(join(__dirname, '.env'), 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const eqIdx = line.indexOf('=');
  if (eqIdx < 0) continue;
  const key = line.slice(0, eqIdx).trim();
  const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  env[key] = val;
}

const cliPassword = process.argv
  .find(a => a.startsWith('--db-password='))
  ?.split('=').slice(1).join('=');

const DB_PASSWORD  = cliPassword || env.SUPABASE_DB_PASSWORD || null;
const PROJECT_REF  = env.VITE_SUPABASE_PROJECT_ID;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;

async function tryConnect(config) {
  const client = new Client(config);
  try {
    await client.connect();
    return client;
  } catch (e) {
    await client.end().catch(() => {});
    return null;
  }
}

async function getConnection() {
  if (DB_PASSWORD) {
    process.stdout.write('  Tentando conexão direta db.{ref}.supabase.co:5432… ');
    const c = await tryConnect({
      host:     `db.${PROJECT_REF}.supabase.co`,
      port:     5432,
      database: 'postgres',
      user:     'postgres',
      password: DB_PASSWORD,
      ssl:      { rejectUnauthorized: false },
    });
    if (c) { console.log('✔\n'); return c; }
    console.log('✖');
  }

  if (DB_PASSWORD) {
    for (const region of ['sa-east-1', 'us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1']) {
      const host = `aws-0-${region}.pooler.supabase.com`;
      process.stdout.write(`  Tentando Supavisor ${region}:5432… `);
      const c = await tryConnect({
        host,
        port:     5432,
        database: 'postgres',
        user:     `postgres.${PROJECT_REF}`,
        password: DB_PASSWORD,
        ssl:      { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });
      if (c) { console.log('✔\n'); return c; }
      console.log('✖');
    }
  }

  console.log('  Tentando autenticação JWT via Supavisor…');
  for (const region of ['sa-east-1', 'us-east-1', 'us-west-1', 'eu-west-1']) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    process.stdout.write(`  ${region}:5432… `);
    const c = await tryConnect({
      host,
      port:     5432,
      database: 'postgres',
      user:     `postgres.${PROJECT_REF}`,
      password: SERVICE_KEY,
      ssl:      { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    if (c) { console.log('✔\n'); return c; }
    console.log('✖');
  }

  return null;
}

async function main() {
  const migFile = join(
    __dirname,
    'supabase/migrations/20260328120000_email_tracking.sql'
  );
  const sql = readFileSync(migFile, 'utf8');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Migration: 20260328120000_email_tracking');
  console.log(`  Projeto: ${PROJECT_REF}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('  Estabelecendo conexão com o banco de dados…\n');

  const client = await getConnection();

  if (!client) {
    console.error(
      '\n  ══════════════════════════════════════════════════════════\n' +
      '  ❌  Não foi possível conectar ao banco de dados.\n\n' +
      '  Forneça a senha do banco como argumento:\n' +
      '    node apply_migration_email.js --db-password=SUA_SENHA\n\n' +
      '  A senha está no Supabase Dashboard:\n' +
      '    Project Settings → Database → Database password\n\n' +
      '  Alternativamente, adicione ao .env:\n' +
      '    SUPABASE_DB_PASSWORD="sua_senha_aqui"\n' +
      '  ══════════════════════════════════════════════════════════\n'
    );
    process.exit(1);
  }

  try {
    await client.query(sql);
    console.log('  ✔  Migration aplicada com sucesso\n');
  } catch (e) {
    if (e.message.includes('already exists') || e.code === '42701') {
      console.log('  ⊙  Coluna(s) já existem — migration já foi aplicada anteriormente\n');
    } else {
      console.error(`  ✖  ERRO [${e.code}]: ${e.message}\n`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();

  // ── Verificação ──────────────────────────────────────────────
  const verifyClient = await getConnection();
  if (!verifyClient) {
    console.warn('  Não foi possível conectar para verificação.');
    process.exit(0);
  }

  console.log('  Verificando colunas…\n');
  const checks = [
    { label: 'orcamentos.email_aberto_em',  sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orcamentos' AND column_name='email_aberto_em'` },
    { label: 'orcamentos.enviado_email',     sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orcamentos' AND column_name='enviado_email'` },
    { label: 'orcamentos.enviado_email_em',  sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orcamentos' AND column_name='enviado_email_em'` },
  ];

  let allOk = true;
  for (const chk of checks) {
    const res = await verifyClient.query(chk.sql);
    const found = res.rowCount > 0;
    console.log(`  ${found ? '✔' : '✖'}  ${chk.label}${found ? '' : '  ← NÃO ENCONTRADO'}`);
    if (!found) allOk = false;
  }

  await verifyClient.end();

  console.log('\n═══════════════════════════════════════════════════════════');
  if (allOk) {
    console.log('  ✅  Todas as colunas de email tracking estão no banco!');
    console.log('  A listagem de orçamentos deve funcionar normalmente agora.');
  } else {
    console.log('  ⚠   Algumas colunas não foram criadas — revise acima.');
    process.exit(1);
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
