const SHOPIFY_API_URL = 'https://5rerjn-mt.myshopify.com/admin/api/2026-07/graphql.json';
const EMAIL_MAX_LENGTH = 254;
const EMAIL_SHAPE = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
const SUCCESS_MESSAGE = '收到喇！之後有新品到港、熱門補貨同會員限定優惠，我哋會第一時間話你知。';
const GENERIC_ERROR_MESSAGE = '而家未能完成登記，請稍後再試。';

const CUSTOMER_SET_MUTATION = `
  mutation SubscribeCustomer($identifier: CustomerSetIdentifiers!, $input: CustomerSetInput!) {
    customerSet(identifier: $identifier, input: $input) {
      customer { id }
      userErrors { field message }
    }
  }
`;

const CUSTOMER_CONSENT_MUTATION = `
  mutation SubscribeCustomerEmailConsent($input: CustomerEmailMarketingConsentUpdateInput!) {
    customerEmailMarketingConsentUpdate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }
`;

function sendJson(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(payload);
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) return req.body;
  if (typeof req.body !== 'string') return {};
  const contentType = String(req.headers?.['content-type'] || '').toLowerCase();
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(req.body));
  }
  try {
    const parsed = JSON.parse(req.body || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > EMAIL_MAX_LENGTH || !EMAIL_SHAPE.test(email)) return null;

  const at = email.indexOf('@');
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;

  const labels = domain.split('.');
  if (labels.length < 2 || labels.at(-1).length < 2 || labels.some((label) => (
    !label || label.length > 63 || label.startsWith('-') || label.endsWith('-')
  ))) return null;

  return email;
}

async function shopifyRequest(query, variables) {
  const response = await fetch(SHOPIFY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || (Array.isArray(payload.errors) && payload.errors.length > 0)) {
    throw new Error('shopify_request_failed');
  }
  return payload.data;
}

function hasUserErrors(payload) {
  return !payload || (Array.isArray(payload.userErrors) && payload.userErrors.length > 0);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, error: 'POST only' });
  }

  const body = parseBody(req);
  if (!body) return sendJson(res, 400, { ok: false, error: 'Invalid request' });

  // A filled honeypot is a quiet success so automated clients do not learn the field.
  if (typeof body.honeypot === 'string' && body.honeypot.trim()) {
    return sendJson(res, 200, { ok: true });
  }

  const email = normalizeEmail(body.email);
  if (!email) return sendJson(res, 400, { ok: false, error: 'Invalid email' });
  if (!process.env.SHOPIFY_ADMIN_TOKEN) {
    return sendJson(res, 503, { ok: false, error: GENERIC_ERROR_MESSAGE });
  }

  try {
    const customerSetData = await shopifyRequest(CUSTOMER_SET_MUTATION, {
      identifier: { email },
      input: { email },
    });
    const customerSet = customerSetData?.customerSet;
    if (hasUserErrors(customerSet)) throw new Error('customer_set_failed');

    const customerId = customerSet.customer?.id;
    if (!customerId) throw new Error('customer_id_missing');

    const consentData = await shopifyRequest(CUSTOMER_CONSENT_MUTATION, {
      input: {
        customerId,
        emailMarketingConsent: {
          marketingState: 'SUBSCRIBED',
          marketingOptInLevel: 'SINGLE_OPT_IN',
          consentUpdatedAt: new Date().toISOString(),
        },
      },
    });
    if (hasUserErrors(consentData?.customerEmailMarketingConsentUpdate)) {
      throw new Error('customer_consent_failed');
    }

    return sendJson(res, 200, { ok: true, message: SUCCESS_MESSAGE });
  } catch (error) {
    return sendJson(res, 502, { ok: false, error: GENERIC_ERROR_MESSAGE });
  }
}
