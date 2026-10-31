package com.phishradar.phishradarbackend.service;

import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class regexdetectionservice {

    // IPv4 Address (validating 0-255 octets)
    private static final Pattern IPV4_PATTERN = Pattern.compile(
            "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
    );

    // IPv6 Address (bracketed or raw hex)
    private static final Pattern IPV6_PATTERN = Pattern.compile(
            "^\\[?[0-9a-fA-F:]+\\]?$"
    );

    // Suspicious Shorteners
    private static final Pattern SUSPICIOUS_SHORTENER = Pattern.compile(
            "^(?:www\\.)?(?:bit\\.ly|tinyurl\\.com|t\\.co|is\\.gd|cutt\\.ly|ow\\.ly|rb\\.gy|tiny\\.cc)$",
            Pattern.CASE_INSENSITIVE
    );

    // Percent-encoded obfuscation
    private static final Pattern ENCODED_OBFUSCATION = Pattern.compile(
            "%[0-9a-fA-F]{2}"
    );

    // High-abuse TLDs commonly used in phishing campaigns
    private static final Set<String> SUSPICIOUS_TLDS = Set.of(
            "tk", "ml", "ga", "cf", "gq", "xyz", "top", "icu", "pw", "online",
            "site", "club", "rest", "cfd", "sbs", "cyou", "bond", "quest",
            "zip", "mov", "country", "click", "buzz", "surf", "monster", "cam", "fit", "work"
    );

    // Auth & sensitive keywords (credential harvesting, verification, financial)
    private static final Pattern AUTH_KEYWORDS = Pattern.compile(
            "(?i)\\b(?:login|signin|verify|verification|secure|security|account|update|password|authenticate|authentication|wallet|banking|recovery|support|billing|invoice|claim|unlock|suspend|suspended)\\b"
    );

    // Target brand names commonly impersonated in phishing campaigns
    private static final Map<String, String> BRAND_TO_PRIMARY_DOMAIN = Map.ofEntries(
            Map.entry("paypal", "paypal.com"),
            Map.entry("google", "google.com"),
            Map.entry("apple", "apple.com"),
            Map.entry("microsoft", "microsoft.com"),
            Map.entry("amazon", "amazon.com"),
            Map.entry("netflix", "netflix.com"),
            Map.entry("facebook", "facebook.com"),
            Map.entry("instagram", "instagram.com"),
            Map.entry("whatsapp", "whatsapp.com"),
            Map.entry("twitter", "twitter.com"),
            Map.entry("chase", "chase.com"),
            Map.entry("wellsfargo", "wellsfargo.com"),
            Map.entry("bankofamerica", "bankofamerica.com"),
            Map.entry("citibank", "citi.com"),
            Map.entry("binance", "binance.com"),
            Map.entry("coinbase", "coinbase.com"),
            Map.entry("metamask", "metamask.io"),
            Map.entry("steam", "steampowered.com"),
            Map.entry("discord", "discord.com"),
            Map.entry("telegram", "telegram.org"),
            Map.entry("dropbox", "dropbox.com"),
            Map.entry("adobe", "adobe.com"),
            Map.entry("dhl", "dhl.com"),
            Map.entry("fedex", "fedex.com"),
            Map.entry("usps", "usps.com")
    );

    // Known legitimate official domains and subdomains for major brands
    private static final Set<String> BRAND_OFFICIAL_DOMAINS = Set.of(
            "paypal.com", "paypal.me", "paypal-community.com",
            "google.com", "google.co.uk", "google.ca", "google.de", "googlesource.com", "googleapis.com",
            "apple.com", "icloud.com",
            "microsoft.com", "office.com", "live.com", "outlook.com", "microsoftonline.com",
            "amazon.com", "amazon.co.uk", "aws.amazon.com",
            "netflix.com",
            "facebook.com", "fb.com",
            "instagram.com",
            "whatsapp.com",
            "twitter.com", "x.com",
            "chase.com",
            "wellsfargo.com",
            "bankofamerica.com",
            "citi.com", "citibank.com",
            "binance.com",
            "coinbase.com",
            "metamask.io",
            "steampowered.com", "steamcommunity.com",
            "discord.com", "discord.gg",
            "telegram.org", "t.me",
            "dropbox.com",
            "adobe.com",
            "dhl.com",
            "fedex.com",
            "usps.com"
    );

    // Typosquatting / homoglyph patterns for major brand targets (deliberate character substitution)
    private static final Pattern TYPOSQUAT_PATTERN = Pattern.compile(
            "(?i)(?:paypa[1i]|g[o0]*0[o0]*gle|amaz0n|app[1i]e|micr[o0]*0[o0]*ft|netf[1i]ix|faceb[o0]*0[o0]*k|wha[1t]sapp|b1nance|c0inbase)"
    );

    public List<String> analyzeurl(String url) {
        List<String> findings = new ArrayList<>();

        if (url == null || url.trim().isEmpty()) {
            findings.add("INVALID_URL");
            return findings;
        }

        String normalizedUrl = url.trim();
        if (!normalizedUrl.contains("://")) {
            normalizedUrl = "https://" + normalizedUrl;
        }

        try {
            URI uri = URI.create(normalizedUrl);

            String scheme = uri.getScheme();
            String host = uri.getHost();
            String rawPath = uri.getRawPath();
            String rawQuery = uri.getRawQuery();

            if (scheme == null
                    || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))
                    || host == null || host.isBlank()) {
                findings.add("INVALID_URL");
                return findings;
            }

            String lowerHost = host.toLowerCase(Locale.ROOT);
            String fullPathAndQuery = (rawPath == null ? "" : rawPath) + " " + (rawQuery == null ? "" : rawQuery);

            // 1. IP-Based URL check (IPv4 or IPv6)
            boolean isIp = IPV4_PATTERN.matcher(lowerHost).matches()
                    || (lowerHost.contains(":") && IPV6_PATTERN.matcher(lowerHost).matches());
            if (isIp) {
                findings.add("IP_ADDRESS_IN_URL");
            }

            // 2. Suspicious URL Shorteners
            if (SUSPICIOUS_SHORTENER.matcher(lowerHost).matches()) {
                findings.add("URL_SHORTENER_DETECTED");
            }

            // 3. UserInfo / At-Symbol Confusion (e.g., http://google.com@phishing.com)
            if (normalizedUrl.contains("@")) {
                findings.add("AT_SYMBOL_IN_URL");
            }

            // 4. Double Slash Redirection in Path (e.g. http://site.com//evil.com)
            if (rawPath != null && rawPath.contains("//")) {
                findings.add("DOUBLE_SLASH_IN_PATH");
            }

            // 5. Percent-Encoded Obfuscation
            if (ENCODED_OBFUSCATION.matcher(normalizedUrl).find()) {
                findings.add("PERCENT_ENCODING_PRESENT");
            }

            // 6. Suspicious TLD Detection
            String tld = extractTld(lowerHost);
            if (tld != null && SUSPICIOUS_TLDS.contains(tld)) {
                findings.add("SUSPICIOUS_TLD");
            }

            // 7. Excessive Hyphens in Domain (>= 3 hyphens indicates domain keyword stuffing)
            int hyphenCount = 0;
            for (char c : lowerHost.toCharArray()) {
                if (c == '-') hyphenCount++;
            }
            if (hyphenCount >= 3) {
                findings.add("EXCESSIVE_HYPHENS_IN_DOMAIN");
            }

            // 8. Excessive Subdomains (>= 3 subdomains, i.e. 4 or more labels)
            if (!isIp) {
                String[] hostLabels = lowerHost.split("\\.");
                if (hostLabels.length >= 4) {
                    findings.add("EXCESSIVE_SUBDOMAINS");
                }
            }

            // 9. Brand Impersonation & Typosquatting Analysis
            boolean isBrandImpersonation = false;
            boolean isTyposquatting = false;

            if (!isIp) {
                boolean isOfficialDomain = isOfficialBrandDomain(lowerHost);

                if (!isOfficialDomain) {
                    // Check if host contains typosquatting pattern
                    if (TYPOSQUAT_PATTERN.matcher(lowerHost).find()) {
                        isTyposquatting = true;
                        findings.add("TYPOSQUATTING_DETECTED");
                    }

                    // Check if host impersonates a known brand
                    if (detectBrandImpersonation(lowerHost)) {
                        isBrandImpersonation = true;
                        findings.add("BRAND_IMPERSONATION");
                    }
                }
            }

            // 10. Auth & Sensitive Keywords in Host vs Path
            boolean keywordInHost = false;
            String hostCleanForKeywords = lowerHost.replace("-", " ").replace(".", " ");
            if (AUTH_KEYWORDS.matcher(hostCleanForKeywords).find()) {
                keywordInHost = true;
                findings.add("SUSPICIOUS_KEYWORD_IN_DOMAIN");
            }

            if (AUTH_KEYWORDS.matcher(fullPathAndQuery).find()) {
                findings.add("SUSPICIOUS_KEYWORD_IN_PATH");
            }

            // 11. Highly Suspicious Domain (Compound Threat Heuristics)
            boolean isHighlySuspicious = false;
            if ((isBrandImpersonation || isTyposquatting) && (tld != null && SUSPICIOUS_TLDS.contains(tld))) {
                isHighlySuspicious = true;
            } else if ((isBrandImpersonation || isTyposquatting) && keywordInHost) {
                isHighlySuspicious = true;
            } else if (isIp && (keywordInHost || AUTH_KEYWORDS.matcher(fullPathAndQuery).find())) {
                isHighlySuspicious = true;
            } else if (lowerHost.length() >= 25 && hyphenCount >= 2 && (tld != null && SUSPICIOUS_TLDS.contains(tld))) {
                isHighlySuspicious = true;
            }

            if (isHighlySuspicious) {
                findings.add("HIGHLY_SUSPICIOUS_DOMAIN");
            }

            // 12. Unusually Long URL
            if (normalizedUrl.length() > 150) {
                findings.add("UNUSUALLY_LONG_URL");
            }

            // 13. Not HTTPS
            if (!scheme.equalsIgnoreCase("https")) {
                findings.add("NOT_HTTPS");
            }

        } catch (IllegalArgumentException e) {
            findings.add("INVALID_URL");
        }

        return findings;
    }

    public int calculateriskscore(List<String> findings) {
        int score = 0;

        for (String finding : findings) {
            switch (finding) {
                case "TYPOSQUATTING_DETECTED" -> score += 60;
                case "BRAND_IMPERSONATION" -> score += 55;
                case "HIGHLY_SUSPICIOUS_DOMAIN" -> score += 35;
                case "IP_ADDRESS_IN_URL" -> score += 35;
                case "AT_SYMBOL_IN_URL" -> score += 30;
                case "SUSPICIOUS_KEYWORD_IN_DOMAIN" -> score += 20;
                case "SUSPICIOUS_TLD" -> score += 20;
                case "EXCESSIVE_HYPHENS_IN_DOMAIN" -> score += 15;
                case "URL_SHORTENER_DETECTED" -> score += 15;
                case "DOUBLE_SLASH_IN_PATH" -> score += 15;
                case "SUSPICIOUS_KEYWORD_IN_PATH" -> score += 10;
                case "EXCESSIVE_SUBDOMAINS" -> score += 10;
                case "UNUSUALLY_LONG_URL" -> score += 10;
                case "PERCENT_ENCODING_PRESENT" -> score += 5;
                case "NOT_HTTPS" -> score += 5;
                case "INVALID_URL" -> score += 0;
                default -> {}
            }
        }

        return Math.min(score, 100);
    }

    /**
     * Checks if the given hostname is an official brand domain or verified subdomain.
     */
    private boolean isOfficialBrandDomain(String host) {
        for (String official : BRAND_OFFICIAL_DOMAINS) {
            if (host.equals(official) || host.endsWith("." + official)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if a non-official hostname impersonates a major brand.
     * Prevents false positives by checking token boundaries rather than arbitrary substrings.
     */
    private boolean detectBrandImpersonation(String host) {
        String cleanHost = host.toLowerCase(Locale.ROOT);
        if (cleanHost.startsWith("www.")) {
            cleanHost = cleanHost.substring(4);
        }

        // Break host into dot-separated labels and hyphen-separated tokens
        String[] labels = cleanHost.split("\\.");

        for (String label : labels) {
            String[] tokens = label.split("-");

            for (String token : tokens) {
                if (BRAND_TO_PRIMARY_DOMAIN.containsKey(token)) {
                    return true;
                }
            }

            // Also check compound prefixes/suffixes/substrings (e.g. paypalupdate, loginpaypal, paypalsecure)
            for (String brand : BRAND_TO_PRIMARY_DOMAIN.keySet()) {
                if (label.startsWith(brand) || label.endsWith(brand) || label.contains(brand)) {
                    // Check if it's not a harmless word like pineapple
                    if (brand.equals("apple") && (label.contains("pineapple") || label.contains("grapple") || label.contains("snapple") || label.contains("dapple"))) {
                        continue;
                    }
                    return true;
                }
            }
        }

        return false;
    }

    public String getIdentifiedBrand(String host) {
        if (host == null) return null;
        String cleanHost = host.toLowerCase(Locale.ROOT);
        if (cleanHost.startsWith("www.")) {
            cleanHost = cleanHost.substring(4);
        }

        // Direct typosquat pattern identification (e.g. paypa1 -> paypal, g00gle -> google)
        if (cleanHost.contains("paypa1") || cleanHost.contains("paypai") || cleanHost.contains("paypal")) return "paypal";
        if (cleanHost.contains("g00gle") || cleanHost.contains("g0ogle") || cleanHost.contains("google")) return "google";
        if (cleanHost.contains("amaz0n") || cleanHost.contains("amazon")) return "amazon";
        if (cleanHost.contains("app1e") || cleanHost.contains("appie") || cleanHost.contains("apple")) {
            if (!cleanHost.contains("pineapple") && !cleanHost.contains("snapple")) return "apple";
        }
        if (cleanHost.contains("micr0soft") || cleanHost.contains("micr0s0ft") || cleanHost.contains("microsoft")) return "microsoft";
        if (cleanHost.contains("netf1ix") || cleanHost.contains("netfiix") || cleanHost.contains("netflix")) return "netflix";
        if (cleanHost.contains("faceb00k") || cleanHost.contains("faceb0ok") || cleanHost.contains("facebook")) return "facebook";
        if (cleanHost.contains("b1nance") || cleanHost.contains("binance")) return "binance";
        if (cleanHost.contains("c0inbase") || cleanHost.contains("coinbase")) return "coinbase";

        // Homoglyph normalized check (1->l, 0->o)
        String deobfuscated = cleanHost.replace('1', 'l').replace('0', 'o').replace('@', 'a');

        String[] labels = cleanHost.split("\\.");
        String[] deobfLabels = deobfuscated.split("\\.");

        for (int i = 0; i < labels.length; i++) {
            String label = labels[i];
            String deobfLabel = i < deobfLabels.length ? deobfLabels[i] : label;

            for (String brand : BRAND_TO_PRIMARY_DOMAIN.keySet()) {
                if (label.contains(brand) || deobfLabel.contains(brand)) {
                    if (brand.equals("apple") && (label.contains("pineapple") || label.contains("grapple") || label.contains("snapple") || label.contains("dapple"))) {
                        continue;
                    }
                    return brand;
                }
            }
        }
        return null;
    }

    public String getOfficialDomainForBrand(String brand) {
        if (brand == null) return null;
        return BRAND_TO_PRIMARY_DOMAIN.get(brand.toLowerCase(Locale.ROOT));
    }

    /**
     * Extracts the top-level domain (TLD) from a hostname.
     */
    private String extractTld(String host) {
        if (host == null || !host.contains(".")) {
            return null;
        }
        int lastDot = host.lastIndexOf('.');
        if (lastDot == -1 || lastDot == host.length() - 1) {
            return null;
        }
        return host.substring(lastDot + 1).toLowerCase(Locale.ROOT);
    }
}
