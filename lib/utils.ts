/**
 * Ensures a base URL has the proper protocol
 * @param baseUrl - The base URL from environment variable
 * @returns A properly formatted base URL with protocol
 */
export function getFormattedBaseUrl(baseUrl?: string): string {
  if (!baseUrl) {
    return 'http://localhost:3000';
  }
  
  // If it already has a protocol, return as is
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    return baseUrl;
  }
  
  // If it's just a domain, add https://
  return `https://${baseUrl}`;
}
