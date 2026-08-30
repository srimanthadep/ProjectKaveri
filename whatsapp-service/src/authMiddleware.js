import { config } from './config.js';

/**
 * Guards every route in this service behind a single shared-secret token
 * (`WHATSAPP_SERVICE_TOKEN`). This service is an internal sidecar — it is
 * meant to be called by the Kaveri backend/frontend, not exposed publicly.
 * A production deployment should additionally keep this service off any
 * public network path (private VPC / localhost-only bind).
 */
export function requireServiceToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token;

  if (!token || token !== config.serviceToken) {
    return res.status(401).json({ error: 'Unauthorized: missing or invalid service token.' });
  }
  next();
}
