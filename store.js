
'use strict';

// EXPEDIENTE oriC
// Almacenamiento de partidas en Upstash Redis.
// Compatible con variables UPSTASH_REDIS_* y KV_*.

const CACHE = new Map();
const TTL = 6 * 60 * 60;

// Actualización segura de partidas mediante versiones.
const CAS = `
local v = redis.call('GET', KEYS[1])
if not v then
  return 0
end

local obj = cjson.decode(v)

if tonumber(obj.version) ~= tonumber(ARGV[1]) then
  return -1
end

redis.call(
  'SET',
  KEYS[1],
  ARGV[2],
  'EX',
  tonumber(ARGV[3])
)

return 1
`;

const key = code => 'expediente-oric:' + code;

// Conexión con Upstash Redis.
async function command(args) {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;

  const tok =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;

  if (!url || !tok) {
    throw new Error(
      'Falta conectar Upstash Redis al proyecto en Vercel.'
    );
  }

  const response = await fetch(
    url.replace(/\/$/, ''),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tok}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(12000)
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok || data.error) {
    throw new Error(
      'Error de almacenamiento Upstash: ' +
      String(data.error || response.status)
    );
  }

  return data.result;
}

// Leer una partida.
async function read(code) {
  if (process.env.LOCAL_DEMO === '1') {
    return CACHE.has(code)
      ? structuredClone(CACHE.get(code))
      : null;
  }

  const raw = await command([
    'GET',
    key(code)
  ]);

  return raw == null
    ? null
    : typeof raw === 'string'
      ? JSON.parse(raw)
      : raw;
}

// Crear una nueva partida.
async function create(room) {
  if (process.env.LOCAL_DEMO === '1') {
    if (CACHE.has(room.code)) {
      return false;
    }

    CACHE.set(
      room.code,
      structuredClone(room)
    );

    return true;
  }

  const result = await command([
    'SET',
    key(room.code),
    JSON.stringify(room),
    'EX',
    TTL,
    'NX'
  ]);

  return result === 'OK';
}

// Actualizar una partida sin sobrescribir
// cambios realizados por otros participantes.
async function writeCAS(code, version, room) {
  if (process.env.LOCAL_DEMO === '1') {
    const current = CACHE.get(code);

    if (!current) {
      return 0;
    }

    if (current.version !== version) {
      return -1;
    }

    CACHE.set(
      code,
      structuredClone(room)
    );

    return 1;
  }

  const result = await command([
    'EVAL',
    CAS,
    1,
    key(code),
    version,
    JSON.stringify(room),
    TTL
  ]);

  return Number(result);
}

// Funciones utilizadas por el servidor.
module.exports = {
  read,
  create,
  writeCAS
};
