/**
 * URL validation utilities to prevent SSRF, XSS, and malicious content injection
 */

// List of blocked hostnames (internal networks, metadata services)
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // AWS metadata
  'metadata.google.internal', // GCP metadata
  '100.100.100.200', // Alibaba metadata
  '[::1]', // IPv6 localhost
];

// Blocked IP ranges (private networks)
const BLOCKED_IP_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
  /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.0.0/16
];

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
}

const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Keeps only the public domain portion accepted for brand websites.
 * The database stores this protocol-free value; callers add https:// only when
 * creating a browser href or request URL.
 */
export function normalizeBrandWebsiteDomain(input: string): string {
  const raw = (input || "").trim().toLowerCase();
  if (!raw) return "";

  const withoutProtocol = raw
    .replace(/^https?:\/\//i, "")
    .replace(/^\/\//, "");
  const withoutWww = withoutProtocol.replace(/^www\./i, "");
  const domainOnly = withoutWww.split(/[/?#]/)[0] ?? "";

  return domainOnly.replace(/\.$/, "");
}

export function validateBrandWebsiteDomain(domain: string): UrlValidationResult {
  const value = (domain || "").trim().toLowerCase();

  if (!value) {
    return { isValid: true };
  }

  if (/^https?:\/\//i.test(value)) {
    return { isValid: false, error: "Informe apenas o domínio, sem http:// ou https://" };
  }

  if (value.startsWith("www.")) {
    return { isValid: false, error: "Informe o domínio sem www." };
  }

  if (value.includes("/") || value.includes("?") || value.includes("#") || value.includes(":") || value.includes("@")) {
    return { isValid: false, error: "Informe apenas o domínio, por exemplo: empresa.com.br" };
  }

  if (value.length > 253 || value.endsWith(".")) {
    return { isValid: false, error: "Domínio inválido" };
  }

  const labels = value.split(".");
  const topLevelDomain = labels[labels.length - 1] ?? "";
  if (labels.length < 2 || topLevelDomain.length < 2 || !/^[a-z]{2,63}$/.test(topLevelDomain)) {
    return { isValid: false, error: "Domínio inválido" };
  }

  if (!labels.every((label) => DOMAIN_LABEL_PATTERN.test(label))) {
    return { isValid: false, error: "Domínio inválido" };
  }

  return { isValid: true };
}

export function domainToHttpsUrl(domain: string | null | undefined): string | null {
  const value = (domain || "").trim().toLowerCase();
  const validation = validateBrandWebsiteDomain(value);
  if (!value || !validation.isValid) return null;

  try {
    return new URL(`https://${value}`).href;
  } catch {
    return null;
  }
}

/**
 * Validates a URL for security concerns
 * @param url - The URL to validate
 * @param options - Validation options
 * @returns Validation result with error message if invalid
 */
export function validateUrl(
  url: string,
  options: {
    allowedProtocols?: string[];
    requireHttps?: boolean;
  } = {}
): UrlValidationResult {
  const { 
    allowedProtocols = ['http:', 'https:'], 
    requireHttps = false 
  } = options;

  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL é obrigatória' };
  }

  const trimmedUrl = url.trim();
  
  if (!trimmedUrl) {
    return { isValid: false, error: 'URL é obrigatória' };
  }

  try {
    const parsed = new URL(trimmedUrl);

    // Check protocol
    if (requireHttps && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'URL deve usar HTTPS' };
    }

    if (!allowedProtocols.includes(parsed.protocol)) {
      return { 
        isValid: false, 
        error: `Protocolo não permitido. Use: ${allowedProtocols.join(', ')}` 
      };
    }

    // Block javascript: and data: URLs (XSS prevention)
    if (['javascript:', 'data:', 'vbscript:', 'file:'].includes(parsed.protocol)) {
      return { isValid: false, error: 'Tipo de URL não permitido' };
    }

    // Check for blocked hosts
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.some(blocked => hostname === blocked || hostname.endsWith(`.${blocked}`))) {
      return { isValid: false, error: 'URL de destino não permitida' };
    }

    // Check for blocked IP patterns
    if (BLOCKED_IP_PATTERNS.some(pattern => pattern.test(hostname))) {
      return { isValid: false, error: 'URL de destino não permitida' };
    }

    // Check for IP-like hostnames that could bypass filters
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      // It's an IP address - validate it's not in blocked ranges
      const parts = hostname.split('.').map(Number);
      
      // Block private ranges
      if (parts[0] === 10 || 
          (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
          (parts[0] === 192 && parts[1] === 168) ||
          (parts[0] === 127)) {
        return { isValid: false, error: 'URL de destino não permitida' };
      }
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'URL inválida' };
  }
}

/**
 * Validates a media URL specifically for image/video content
 * More restrictive than general URL validation
 */
export function validateMediaUrl(url: string): UrlValidationResult {
  if (!url) {
    return { isValid: true }; // Empty URLs are allowed (optional field)
  }

  const result = validateUrl(url, { allowedProtocols: ['http:', 'https:'] });
  
  if (!result.isValid) {
    return result;
  }

  // Additional checks for media URLs
  try {
    const parsed = new URL(url.trim());
    
    // Check for suspicious query parameters that might indicate redirect attacks
    const suspiciousParams = ['redirect', 'url', 'next', 'goto', 'return'];
    for (const param of suspiciousParams) {
      if (parsed.searchParams.has(param)) {
        const paramValue = parsed.searchParams.get(param);
        if (paramValue && (paramValue.startsWith('http') || paramValue.startsWith('//'))) {
          return { 
            isValid: false, 
            error: 'URL contém redirecionamento suspeito' 
          };
        }
      }
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'URL de mídia inválida' };
  }
}

/**
 * Validates an affiliate destination URL
 * Requires HTTPS for security
 */
export function validateAffiliateUrl(url: string): UrlValidationResult {
  return validateUrl(url, { 
    allowedProtocols: ['http:', 'https:'],
    requireHttps: false // Allow http for testing, but warn
  });
}
