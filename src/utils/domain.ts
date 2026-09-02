/**
 * Domain & Routing Helper for Multi-Tenant POS & Custom Domain Storefront
 */

const MAIN_SYSTEM_HOSTS = [
  'pos.elvisyam.com',
  'admin.elvisyam.com',
  'localhost',
  '127.0.0.1',
  '::1',
];

export interface CustomDomainInfo {
  isCustomDomain: boolean;
  domain: string | null;
  cleanDomain: string | null;
}

/**
 * Mendeteksi apakah aplikasi saat ini diakses melalui Custom Domain toko online
 */
export function getCustomDomainInfo(): CustomDomainInfo {
  if (typeof window === 'undefined') {
    return { isCustomDomain: false, domain: null, cleanDomain: null };
  }

  // 1. Cek parameter override untuk testing lokal / preview admin (e.g. ?__domain=tokosarah.com)
  const urlParams = new URLSearchParams(window.location.search);
  const overrideDomain = urlParams.get('__domain');
  if (overrideDomain) {
    const clean = overrideDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    return {
      isCustomDomain: true,
      domain: overrideDomain.toLowerCase().trim(),
      cleanDomain: clean,
    };
  }

  const hostname = window.location.hostname.toLowerCase().trim();

  // 2. Jika hostname adalah domain sistem utama atau IP lokal
  const isMainHost = MAIN_SYSTEM_HOSTS.includes(hostname) ||
    hostname.endsWith('.ngrok-free.app') ||
    hostname.endsWith('.ngrok.io') ||
    hostname.endsWith('.loca.lt') ||
    hostname.endsWith('.trycloudflare.com') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname); // Raw IP address

  if (isMainHost) {
    return {
      isCustomDomain: false,
      domain: null,
      cleanDomain: null,
    };
  }

  // 3. Jika bukan domain utama POS, berarti diakses via Custom Domain / Custom Subdomain
  const cleanDomain = hostname.replace(/^www\./, '');
  return {
    isCustomDomain: true,
    domain: hostname,
    cleanDomain: cleanDomain,
  };
}

/**
 * Menghasilkan basePath untuk rute toko online
 * - Jika Custom Domain: basePath = "" (contoh: /cart, /checkout, /product/123)
 * - Jika Normal Domain: basePath = "/s/:slug" atau "/:slug"
 */
export function getStoreBasePath(slug?: string, isLegacySPath: boolean = false): string {
  const { isCustomDomain } = getCustomDomainInfo();
  if (isCustomDomain) {
    return '';
  }
  if (!slug) {
    return '';
  }
  return isLegacySPath ? `/s/${slug}` : `/${slug}`;
}
