// Source audit of effective public-function privileges after ordered migrations.
// SQL bodies, strings, and comments cannot supply fake REVOKE/SET statements.
const fs = require('fs');
const path = require('path');

const mask = sql => sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\/|(\$[a-z_]\w*\$|\$\$)[\s\S]*?\1|'(?:''|[^'])*'/gi,
  (part, tag) => tag ? ' __body__ ' : part.startsWith("'") ? "''" : ' ');
const signature = (name, params) => name.toLowerCase() + '(' + params.split(',').filter(p => p.trim())
  .map(p => p.replace(/\bdefault\b[\s\S]*/i, '').trim().split(/\s+/).pop().toLowerCase().replace(/^int$/, 'integer')).join(',') + ')';

function auditDefiners(sources) {
  const functions = new Map();
  const rsvpPolicies = new Map();
  for (const { name, sql } of sources) {
    for (const statement of mask(sql).split(';').map(s => s.trim()).filter(Boolean)) {
      const policy = statement.match(/^(create|drop|alter)\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|[a-z_]\w*)\s+on\s+public\.rsvp_submissions\b([\s\S]*)$/i);
      if (policy) {
        const key = policy[2].toLowerCase();
        if (policy[1].toLowerCase() === 'drop') rsvpPolicies.delete(key);
        else {
          const roles = policy[3].match(/\bto\s+([\w\s,]+?)(?=\s+(?:using|with)\b|$)/i);
          if (roles) rsvpPolicies.set(key, roles[1].toLowerCase().split(',').map(r => r.trim()));
          else if (policy[1].toLowerCase() === 'create') rsvpPolicies.set(key, ['public']);
        }
      }
      const create = statement.match(/^create\s+(?:or\s+replace\s+)?function\s+public\.([a-z_]\w*)\s*\(([^)]*)\)([\s\S]*)$/i);
      if (create) {
        const key = signature(create[1], create[2]);
        const prior = functions.get(key);
        functions.set(key, { key, source: name, definer: /\bsecurity\s+definer\b/i.test(create[3]),
          // CREATE OR REPLACE preserves privileges, not default PUBLIC access.
          grants: prior ? prior.grants : new Set(['public']),
          safePath: /\bset\s+search_path\s*=\s*pg_catalog\s*,\s*public\s*,\s*pg_temp\b/i.test(create[3]) });
        continue;
      }
      if (/^create\s+(?:or\s+replace\s+)?function\b/i.test(statement)) {
        throw new Error(`Unsupported function declaration in ${name}; extend the audit before shipping it.`);
      }
      const permission = statement.match(/^(revoke|grant)\s+(?:all(?:\s+privileges)?|execute)\s+on\s+function\s+public\.([a-z_]\w*)\s*\(([^)]*)\)\s+(?:from|to)\s+([\w\s,]+)$/i);
      if (permission) {
        const key = signature(permission[2], permission[3]);
        const fn = functions.get(key);
        if (!fn) throw new Error(`Permission for unenumerated function ${key} in ${name}`);
        for (const role of permission[4].toLowerCase().split(',').map(r => r.trim())) {
          if (permission[1].toLowerCase() === 'grant') fn.grants.add(role);
          else fn.grants.delete(role);
        }
      }
      const searchPath = statement.match(/^alter\s+function\s+public\.([a-z_]\w*)\s*\(([^)]*)\)\s+set\s+search_path\s*=\s*([\w\s,]+)$/i);
      if (searchPath) {
        const key = signature(searchPath[1], searchPath[2]);
        const fn = functions.get(key);
        if (!fn) throw new Error(`Search path for unenumerated function ${key} in ${name}`);
        fn.safePath = searchPath[3].replace(/\s/g, '').toLowerCase() === 'pg_catalog,public,pg_temp';
      }
    }
  }
  const definers = [...functions.values()].filter(f => f.definer);
  return { functions: definers, anonymous: definers.filter(f => f.grants.has('public') || f.grants.has('anon')).map(f => f.key),
    unsafePath: definers.filter(f => !f.safePath).map(f => f.key),
    rsvpClientPolicies: [...rsvpPolicies].filter(([, roles]) => roles.some(r => ['public', 'anon', 'authenticated'].includes(r))).map(([name]) => name) };
}

function migrationSources(root) {
  const dir = path.join(root, 'supabase/migrations');
  return fs.readdirSync(dir).filter(n => n.endsWith('.sql')).sort().map(name => ({ name, sql: fs.readFileSync(path.join(dir, name), 'utf8') }));
}

module.exports = { auditDefiners, migrationSources };

if (require.main === module) {
  const result = auditDefiners(migrationSources(path.join(__dirname, '..')));
  console.log(JSON.stringify({ count: result.functions.length, anonymous: result.anonymous, unsafePath: result.unsafePath, rsvpClientPolicies: result.rsvpClientPolicies }, null, 2));
  if (!result.functions.length || result.anonymous.length || result.unsafePath.length || result.rsvpClientPolicies.length) process.exitCode = 1;
}
