/**
 * Serializes a JSON-LD object for embedding in a <script type="application/ld+json">
 * via dangerouslySetInnerHTML. JSON.stringify alone does not escape "<", so a value
 * containing the literal substring "</script>" (e.g. an attacker-controlled article
 * title or excerpt) would close the script tag early and let anything after it run
 * as HTML/script in the page. Escaping "<" to its unicode form neutralizes that
 * without changing the JSON's meaning (browsers unescape < before parsing JSON).
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
