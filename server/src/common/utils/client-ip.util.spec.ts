import { getClientIp, cleanIp } from './client-ip.util';

describe('client-ip.util', () => {
  describe('cleanIp', () => {
    it('should strip ::ffff: prefix from IPv4-mapped IPv6', () => {
      expect(cleanIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
      expect(cleanIp('::ffff:10.0.1.11')).toBe('10.0.1.11');
      expect(cleanIp('::ffff:113.161.20.10')).toBe('113.161.20.10');
    });

    it('should convert ::1 to 127.0.0.1', () => {
      expect(cleanIp('::1')).toBe('127.0.0.1');
    });

    it('should return plain IPv4 and IPv6 untouched', () => {
      expect(cleanIp('192.168.1.50')).toBe('192.168.1.50');
      expect(cleanIp('2001:db8::1')).toBe('2001:db8::1');
    });

    it('should return 0.0.0.0 for empty or falsy values', () => {
      expect(cleanIp('')).toBe('0.0.0.0');
    });
  });

  describe('getClientIp', () => {
    it('should prioritize CF-Connecting-IP if present', () => {
      const req = {
        headers: {
          'cf-connecting-ip': '113.161.20.10',
          'x-real-ip': '10.0.1.11',
          'x-forwarded-for': '10.0.1.11',
        },
        ip: '10.0.1.11',
      };
      expect(getClientIp(req)).toBe('113.161.20.10');
    });

    it('should prioritize X-Real-IP over X-Forwarded-For if CF-Connecting-IP is missing', () => {
      const req = {
        headers: {
          'x-real-ip': '113.161.20.10',
          'x-forwarded-for': '113.161.20.10, 10.0.1.11',
        },
        ip: '10.0.1.11',
      };
      expect(getClientIp(req)).toBe('113.161.20.10');
    });

    it('should extract first IP from X-Forwarded-For header list', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        },
        ip: '::ffff:10.0.1.11',
      };
      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('should fallback to req.ip and clean ::ffff:', () => {
      const req = {
        headers: {},
        ip: '::ffff:192.168.1.100',
      };
      expect(getClientIp(req)).toBe('192.168.1.100');
    });

    it('should fallback to req.socket.remoteAddress if req.ip is empty', () => {
      const req = {
        headers: {},
        socket: { remoteAddress: '::ffff:127.0.0.1' },
      };
      expect(getClientIp(req)).toBe('127.0.0.1');
    });

    it('should return 0.0.0.0 when req is undefined or empty', () => {
      expect(getClientIp(undefined)).toBe('0.0.0.0');
      expect(getClientIp({})).toBe('0.0.0.0');
    });
  });
});
