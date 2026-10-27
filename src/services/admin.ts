import { callBe } from 'src/utils/request';
import type { PlatformStatus, ProjectDeployments, ProjectStatus, ServerUsage } from 'src/types/admin';
import type { DnsRecord, DomainContact, DomainVerification, RegistrarDomain } from 'src/types/domains';

// Intentions: the admin dashboard's calls (biveit-backend controllers/admin). Admins only -- the BE answers
// 403 to anyone else, whatever the FE shows.
// The queries using these are keyed under ADMIN_QUERY_KEY, which main.tsx keeps out of the persisted cache:
// the platform's internals have no business sitting in localStorage.

const ADMIN_QUERY_KEY = 'admin';

async function getServerUsage(): Promise<ServerUsage> {
  return callBe('/admin/server-usage');
}

async function getPlatformStatus(): Promise<PlatformStatus> {
  return callBe('/admin/platform');
}

async function getProjectStatus(projectId: number): Promise<ProjectStatus> {
  return callBe(`/admin/projects/${projectId}`);
}

// Turns the project off: its agents' runners, its dev servers, its container. Nothing on disk is touched,
// so the owner opening it again brings it all back.
async function stopProject(projectId: number): Promise<unknown> {
  return callBe({ url: `/admin/projects/${projectId}/stop`, method: 'POST' });
}

async function getProjectDeployments(projectId: number): Promise<ProjectDeployments> {
  return callBe(`/admin/projects/${projectId}/deployments`);
}

// Sets the site's domains (REPLACING its current ones; none = the default <hash>.<PROD_DOMAIN>), then deploys
// what's in the project's workspace now. The rollout runs in the background: watch getProjectDeployments.
async function deployProject(projectId: number, domains: string[]): Promise<{ run_id: string; commit: string }> {
  return callBe({ url: `/admin/projects/${projectId}/deployments`, method: 'POST', data: { domains } });
}

// The domain test bench (/admin/domain-name-test): the registrar primitives, raw. Sandbox only -- the BE answers
// 409 NOT_SANDBOX while it points at the live registrar. Refusals carry the registrar's message as `detail`.
const DOMAIN_TEST_URL = '/admin/domain-test';
const _toDomainUrl = (domainName: string) => `${DOMAIN_TEST_URL}/domains/${encodeURIComponent(domainName)}`;

// ICANN email verifications still pending. New domains show up ~10 minutes after purchase.
async function listTestVerifications(): Promise<DomainVerification[]> {
  return callBe(`${DOMAIN_TEST_URL}/verifications`);
}

// Throttled by the registrar: once per 15 minutes per verification (429 otherwise).
async function resendTestVerification(verificationId: number): Promise<{ nextEligibleAt?: string }> {
  return callBe({ url: `${DOMAIN_TEST_URL}/verifications/${verificationId}/resend`, method: 'POST' });
}

async function getDomainTestAccount(): Promise<{ username: string; balance_usd: number }> {
  return callBe(`${DOMAIN_TEST_URL}/account`);
}

async function listTestDomains(): Promise<{ domains?: RegistrarDomain[]; totalCount?: number }> {
  return callBe(`${DOMAIN_TEST_URL}/domains`);
}

async function registerTestDomain(domain: string, years: number, registrant: DomainContact): Promise<unknown> {
  return callBe({ url: `${DOMAIN_TEST_URL}/domains`, method: 'POST', data: { domain, years, registrant } });
}

async function getTestDomain(domainName: string): Promise<RegistrarDomain> {
  return callBe(_toDomainUrl(domainName));
}

async function updateTestDomain(
  domainName: string,
  changes: { autorenewEnabled?: boolean; privacyEnabled?: boolean; locked?: boolean },
): Promise<RegistrarDomain> {
  return callBe({ url: _toDomainUrl(domainName), method: 'PATCH', data: changes });
}

async function renewTestDomain(domainName: string, years: number): Promise<unknown> {
  return callBe({ url: `${_toDomainUrl(domainName)}/renew`, method: 'POST', data: { years } });
}

async function setTestNameservers(domainName: string, nameservers: string[]): Promise<RegistrarDomain> {
  return callBe({ url: `${_toDomainUrl(domainName)}/nameservers`, method: 'PUT', data: { nameservers } });
}

async function getTestAuthCode(domainName: string): Promise<{ auth_code: string }> {
  return callBe(`${_toDomainUrl(domainName)}/auth-code`);
}

async function listTestRecords(domainName: string): Promise<DnsRecord[]> {
  return callBe(`${_toDomainUrl(domainName)}/records`);
}

// With record.id: replaces that record; without: adds one.
async function saveTestRecord(domainName: string, record: DnsRecord): Promise<DnsRecord> {
  return record.id
    ? callBe({ url: `${_toDomainUrl(domainName)}/records/${record.id}`, method: 'PUT', data: record })
    : callBe({ url: `${_toDomainUrl(domainName)}/records`, method: 'POST', data: record });
}

async function deleteTestRecord(domainName: string, recordId: number): Promise<unknown> {
  return callBe({ url: `${_toDomainUrl(domainName)}/records/${recordId}`, method: 'DELETE' });
}

export {
  ADMIN_QUERY_KEY,
  getServerUsage,
  getPlatformStatus,
  getProjectStatus,
  stopProject,
  getProjectDeployments,
  deployProject,
  getDomainTestAccount,
  listTestDomains,
  registerTestDomain,
  getTestDomain,
  updateTestDomain,
  renewTestDomain,
  setTestNameservers,
  getTestAuthCode,
  listTestRecords,
  saveTestRecord,
  deleteTestRecord,
  listTestVerifications,
  resendTestVerification,
};
