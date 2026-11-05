import { callBe } from 'src/utils/request';

// Intentions: the backend's runtime settings (biveit-backend controllers/system_configurations) -- the public ones,
// as {name: value}. Tunable without a FE deploy; anything missing means "use the code default".

const SYSTEM_CONFIG_QUERY_KEY = 'system-config';

async function getSystemConfig(): Promise<Record<string, unknown>> {
  return callBe('/system-configuration');
}

export {
  getSystemConfig,
  SYSTEM_CONFIG_QUERY_KEY,
};
