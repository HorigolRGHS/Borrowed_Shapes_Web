import type { Request } from 'express';

/**
 * Extracts and normalizes the real client IP address from an Express request object,
 * properly handling reverse proxies (Cloudflare, Nginx, AWS ALB, Traefik, Docker, etc.).
 *
 * Checks in order of trust/specificity:
 * 1. cf-connecting-ip (Cloudflare)
 * 2. x-real-ip (Nginx / Load Balancer)
 * 3. x-forwarded-for (Standard proxy header; takes the leftmost/original client IP)
 * 4. req.ip (Express computed IP when 'trust proxy' is enabled)
 * 5. req.socket.remoteAddress (Direct TCP connection)
 */
export function getClientIp(req?: Request | any): string {
  if (!req) return '0.0.0.0';

  const headers = req.headers || {};

  // 1. Cloudflare header
  const cfConnectingIp = headers['cf-connecting-ip'];
  if (typeof cfConnectingIp === 'string' && cfConnectingIp.trim()) {
    return cleanIp(cfConnectingIp.trim());
  }

  // 2. Nginx / Load Balancer X-Real-IP
  const xRealIp = headers['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.trim()) {
    return cleanIp(xRealIp.trim());
  }

  // 3. X-Forwarded-For (can be a comma-separated list of IPs: "client, proxy1, proxy2")
  const xForwardedFor = headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) {
      return cleanIp(firstIp);
    }
  } else if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    const firstIp = xForwardedFor[0]?.split(',')[0]?.trim();
    if (firstIp) {
      return cleanIp(firstIp);
    }
  }

  // 4. Express req.ip (computed with trust proxy)
  if (typeof req.ip === 'string' && req.ip.trim()) {
    return cleanIp(req.ip.trim());
  }

  // 5. Socket remote address fallback
  const socketAddress =
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    req.info?.remoteAddress;
  if (typeof socketAddress === 'string' && socketAddress.trim()) {
    return cleanIp(socketAddress.trim());
  }

  return '0.0.0.0';
}

/**
 * Normalizes an IP string:
 * - Strips IPv4-mapped IPv6 prefix ("::ffff:1.2.3.4" -> "1.2.3.4")
 * - Converts IPv6 loopback ("::1") to standard "127.0.0.1" for consistency
 */
export function cleanIp(ip: string): string {
  if (!ip) return '0.0.0.0';
  let cleaned = ip.trim();

  // Strip IPv4-mapped IPv6 prefix
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }

  // Normalize IPv6 loopback
  if (cleaned === '::1') {
    return '127.0.0.1';
  }

  return cleaned;
}
