import _ from 'lodash';

import { callBe } from 'src/utils/request';
import type { DomainOffer, DomainSwitch, LaunchCheckout, LaunchStatus, OwnDomainCheck, PlanKey, Registrant } from 'src/types/launch';

// Intentions: the launch flow's calls (biveit-backend controllers/launch): where a project's launch stands, finding a
// domain, paying (checkouts open at Polar, in a new tab).
// Queries using these are keyed under LAUNCH_QUERY_KEY, which main.tsx keeps out of the persisted cache: what's
// been paid must always be read fresh.

const LAUNCH_QUERY_KEY = 'launch';

// Also moves a waiting launch along (the backend re-runs its setup on each read), so it's polled while one waits.
async function getLaunchStatus(projectId: number): Promise<LaunchStatus> {
  return callBe(`/projects/${projectId}/launch`);
}

// An empty query gives ideas around the project's name.
async function searchLaunchDomains(projectId: number, query: string): Promise<DomainOffer[]> {
  return callBe({ url: `/projects/${projectId}/launch/domains`, params: { q: query } });
}

async function checkOwnDomain(projectId: number, domain: string): Promise<OwnDomainCheck> {
  return callBe({ url: `/projects/${projectId}/launch/domains/check`, method: 'POST', data: { domain } });
}

// One thing per checkout: a plan, or (with a plan running) a domain to buy. Refusals come back as
// { detail: CODE, ...extra } (e.g. PRICE_CHANGED with the new price_per_year).
async function startLaunchCheckout(projectId: number, choice: { plan: PlanKey } | {
  domain: { name: string; price_per_year: number };
  registrant: Registrant;
}): Promise<LaunchCheckout> {
  return callBe({ url: `/projects/${projectId}/launch/checkout`, method: 'POST', data: choice });
}

// Add the user's own domain to the project -- no plan needed, nothing to pay. Answers like checkOwnDomain.
async function addOwnDomain(projectId: number, domain: string): Promise<OwnDomainCheck> {
  return callBe({ url: `/projects/${projectId}/launch/domains`, method: 'POST', data: { domain } });
}

// Switch the site to another of its attached domains: it's set up in the background, the current one serving until
// it's done. operation_id: the switch, to poll with getDomainSwitch (null when there's no site yet -- the first
// deployment happens instead, followed by the status). Refused (DOMAIN_NOT_VERIFIED) for the user's own domain until
// its DNS records are found, BUSY while a deployment or another switch runs.
async function activateLaunchDomain(projectId: number, domain: string): Promise<{ domain: string; operation_id: string | null }> {
  return callBe({ url: `/projects/${projectId}/launch/domains/activate`, method: 'POST', data: { domain } });
}

async function getDomainSwitch(projectId: number, operationId: string): Promise<DomainSwitch> {
  return callBe(`/projects/${projectId}/launch/domains/switches/${operationId}`);
}

// Move the running monthly plan to yearly: the same subscription, the difference charged now (no checkout page).
async function upgradePlan(projectId: number): Promise<{ plan: 'yearly' }> {
  return callBe({ url: `/projects/${projectId}/launch/plan/upgrade`, method: 'POST' });
}

async function redeploySite(projectId: number): Promise<{ run_id: string; commit: string }> {
  return callBe({ url: `/projects/${projectId}/deployments`, method: 'POST' });
}

// The code as it is right now, as a zip -- fetched (the session cookie rides along) and handed to the browser, named
// after the project.
async function downloadCode(projectId: number, projectName: string): Promise<void> {
  const blob: Blob = await callBe({ url: `/projects/${projectId}/code`, responseType: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${_.kebabCase(projectName) || `project-${projectId}`}.zip`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export {
  LAUNCH_QUERY_KEY,
  getLaunchStatus,
  searchLaunchDomains,
  checkOwnDomain,
  startLaunchCheckout,
  addOwnDomain,
  activateLaunchDomain,
  getDomainSwitch,
  upgradePlan,
  redeploySite,
  downloadCode,
};
