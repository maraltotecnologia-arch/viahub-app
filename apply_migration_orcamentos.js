// apply_migration_orcamentos.js
// Aplica melhorias nas tabelas itens_orcamento e orcamentos
// Uso: node apply_migration_orcamentos.js
// Ou:  node apply_migration_orcamentos.js --db-password=SUA_SENHA

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

// Senha do banco: arg CLI ou env SUPABASE_DB_PASSWORD
const cliPassword = process.argv
  .find(a => a.startsWith('--db-password='))
  ?.split('=').slice(1).join('=');

const DB_PASSWORD  = cliPassword || env.SUPABASE_DB_PASSWORD || null;
const PROJECT_REF  = env.VITE_SUPABASE_PROJECT_ID;  // tupzqovgowvwtmrtshdx
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = env.VITE_SUPABASE_URL;

// ── Tenta diferentes configurações de conexão ─────────────────
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
  // 1. Conexão direta com senha do banco (mais confiável)
  if (DB_PASSWORD) {
    console.log('  Tentando conexão direta db.{ref}.supabase.co:5432…');
    const c = await tryConnect({
      host:     `db.${PROJECT_REF}.supabase.co`,
      port:     5432,
      database: 'postgres',
      user:     'postgres',
      password: DB_PASSWORD,
      ssl:      { rejectUnauthorized: false },
    });
    if (c) { console.log('  ✔  Conectado via conexão direta\n'); return c; }
    console.log('  ✖  Falhou — tentando Supavisor…');
  }

  // 2. Supavisor session mode com DB_PASSWORD
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

  // 3. Tenta com service_role JWT como senha (Supabase Supavisor JWT mode)
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

// ── Divide o SQL em statements individuais ───────────────────
function splitStatements(sql) {
  const stmts = [];
  let cur = '';
  let inDollar = false;
  let tag = '';

  for (const line of sql.split('\n')) {
    cur += line + '\n';

    const matches = line.match(/(\$[^$]*\$)/g) ?? [];
    for (const m of matches) {
      if (!inDollar) { inDollar = true; tag = m; }
      else if (m === tag) { inDollar = false; tag = ''; }
    }

    if (!inDollar && line.trimEnd().endsWith(';')) {
      const s = cur.trim();
      const contentOnly = s.replace(/--[^\n]*/g, '').trim();
      if (contentOnly) stmts.push(s);
      cur = '';
    }
  }
  const remaining = cur.trim().replace(/--[^\n]*/g, '').trim();
  if (remaining) stmts.push(cur.trim());
  return stmts.filter(Boolean);
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const migFile = join(
    __dirname,
    'supabase/migrations/20260327120000_orcamentos_itens_enhancements.sql'
  );
  const sql = readFileSync(migFile, 'utf8');
  const stmts = splitStatements(sql);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Migration: 20260327120000_orcamentos_itens_enhancements');
  console.log(`  Projeto: ${PROJECT_REF}`);
  console.log(`  Statements: ${stmts.length}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('  Estabelecendo conexão com o banco de dados…\n');

  const client = await getConnection();

  if (!client) {
    console.error(
      '\n  ══════════════════════════════════════════════════════════\n' +
      '  ❌  Não foi possível conectar ao banco de dados.\n\n' +
      '  Forneça a senha do banco como argumento:\n' +
      '    node apply_migration_orcamentos.js --db-password=SUA_SENHA\n\n' +
      '  A senha está no Supabase Dashboard:\n' +
      '    Project Settings → Database → Database password\n\n' +
      '  Alternativamente, adicione ao .env:\n' +
      '    SUPABASE_DB_PASSWORD="sua_senha_aqui"\n' +
      '  ══════════════════════════════════════════════════════════\n'
    );
    process.exit(1);
  }

  // ── Executa os statements ────────────────────────────────────
  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    const preview = stmt.replace(/\s+/g, ' ').replace(/--[^\n]*/g, '').trim().slice(0, 90);
    if (!preview) continue;

    process.stdout.write(`[${String(i + 1).padStart(2)}/${stmts.length}] ${preview}…\n`);

    try {
      await client.query(stmt);
      console.log('       ✔  OK\n');
      ok++;
    } catch (e) {
      // Erros de "já existe" são esperados em re-runs idempotentes
      if (
        e.message.includes('already exists') ||
        e.message.includes('já existe') ||
        e.code === '42710' || // duplicate_object
        e.code === '42P07'    // duplicate_table
      ) {
        console.log(`       ⊙  Já existe (ignorado)\n`);
        skip++;
      } else {
        console.error(`       ✖  ERRO [${e.code}]: ${e.message}\n`);
        fail++;
      }
    }
  }

  await client.end();

  // ── Verificação final ─────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Verificação pós-migração…');
  console.log('═══════════════════════════════════════════════════════════\n');

  const verifyClient = await getConnection();
  if (!verifyClient) {
    console.warn('  Não foi possível conectar para verificação.');
    process.exit(0);
  }

  const checks = [
    // Colunas
    { label: 'itens_orcamento.categoria',    sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='itens_orcamento' AND column_name='categoria'` },
    { label: 'itens_orcamento.num_viajantes',sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='itens_orcamento' AND column_name='num_viajantes'` },
    { label: 'orcamentos.validade_dias',     sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orcamentos' AND column_name='validade_dias'` },
    { label: 'orcamentos.data_validade',     sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orcamentos' AND column_name='data_validade'` },
    { label: 'orcamentos.status_viagem',     sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orcamentos' AND column_name='status_viagem'` },
    { label: 'orcamentos.expirado',          sql: `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orcamentos' AND column_name='expirado'` },
    // Constraints
    { label: 'chk_itens_categoria',          sql: `SELECT 1 FROM pg_constraint WHERE conname='chk_itens_categoria'` },
    { label: 'chk_orcamentos_status_viagem', sql: `SELECT 1 FROM pg_constraint WHERE conname='chk_orcamentos_status_viagem'` },
    // Índices
    { label: 'idx_itens_categoria',          sql: `SELECT 1 FROM pg_indexes WHERE indexname='idx_itens_categoria'` },
    { label: 'idx_orcamentos_status_viagem', sql: `SELECT 1 FROM pg_indexes WHERE indexname='idx_orcamentos_status_viagem'` },
    { label: 'idx_orcamentos_validade',      sql: `SELECT 1 FROM pg_indexes WHERE indexname='idx_orcamentos_validade'` },
    // Trigger e função
    { label: 'trg_calcular_validade',        sql: `SELECT 1 FROM information_schema.triggers WHERE trigger_name='trg_calcular_validade'` },
    { label: 'calcular_data_validade()',     sql: `SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_namespace.oid=pg_proc.pronamespace WHERE nspname='public' AND proname='calcular_data_validade'` },
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
    console.log(`  ✅  Migração concluída! (${ok} OK, ${skip} já existiam, ${fail} erros)`);
  } else {
    console.log(`  ⚠   Alguns itens não foram criados — revise acima. (${ok} OK, ${fail} erros)`);
    process.exit(1);
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
