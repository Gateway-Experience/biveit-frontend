import _ from 'lodash';

import { callBe } from 'src/utils/request';
import type { DomainOffer, LaunchCheckout, LaunchStatus, MockCheckout, OwnDomainCheck, PlanKey, Registrant } from 'src/types/launch';

// Intentions: the launch flow's calls (biveit-backend controllers/launch + controllers/payments): where a project's
// launch stands, finding a domain, paying, and the stand-in checkout used before the real payment provider exists.
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

// Refusals come back as { detail: CODE, ...extra } (e.g. PRICE_CHANGED with the new price_per_year).
async function startLaunchCheckout(projectId: number, choice: {
  plan: PlanKey | null;
  domain: { kind: 'buy' | 'own'; name: string; price_per_year?: number } | null;
  registrant: Registrant | null;
  launchId?: string | null;
}): Promise<LaunchCheckout> {
  return callBe({
    url: `/projects/${projectId}/launch/checkout`,
    method: 'POST',
    data: { plan: choice.plan, domain: choice.domain, registrant: choice.registrant, launch_id: choice.launchId || null },
  });
}

// Switch the site to another of its attached domains. Refused (DOMAIN_NOT_VERIFIED) for the user's own domain
// until its DNS records are found, so a live site never moves somewhere it can't be served.
async function activateLaunchDomain(projectId: number, domain: string): Promise<{ domain: string }> {
  return callBe({ url: `/projects/${projectId}/launch/domains/activate`, method: 'POST', data: { domain } });
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

async function getMockCheckout(checkoutId: string): Promise<MockCheckout> {
  return callBe(`/payments/mock-checkout/${checkoutId}`);
}

async function payMockCheckout(checkoutId: string): Promise<unknown> {
  return callBe({ url: `/payments/mock-checkout/${checkoutId}/pay`, method: 'POST' });
}

export {
  LAUNCH_QUERY_KEY,
  getLaunchStatus,
  searchLaunchDomains,
  checkOwnDomain,
  startLaunchCheckout,
  activateLaunchDomain,
  redeploySite,
  downloadCode,
  getMockCheckout,
  payMockCheckout,
};
