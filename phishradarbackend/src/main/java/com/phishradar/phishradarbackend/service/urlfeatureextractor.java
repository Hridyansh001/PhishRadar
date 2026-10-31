package com.phishradar.phishradarbackend.service;

import java.net.URI;
import java.util.*;

public class urlfeatureextractor {

    private urlfeatureextractor() {
    }

    /**
     * Legacy 10-feature extractor strictly compatible with Weka phishing.model
     */
    public static double[] extract(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("URL cannot be empty");
        }

        String normalizedUrl = url.trim();
        URI uri;

        try {
            uri = URI.create(normalizedUrl);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid URL format");
        }

        String scheme = uri.getScheme();
        String host = uri.getHost();

        if (scheme == null ||
                !(scheme.equalsIgnoreCase("http")
                        || scheme.equalsIgnoreCase("https"))
                || host == null) {
            throw new IllegalArgumentException(
                    "Provide a valid HTTP or HTTPS URL");
        }

        String lowerUrl = normalizedUrl.toLowerCase(Locale.ROOT);
        String domain = host.toLowerCase(Locale.ROOT);

        // 1. URLLength
        double urlLength = normalizedUrl.length();

        // 2. DomainLength
        double domainLength = domain.length();

        // 3. IsDomainIP: IPv4 literal check
        double isDomainIP =
                domain.matches("^(\\d{1,3}\\.){3}\\d{1,3}$")
                        ? 1.0 : 0.0;

        // 4. NoOfSubDomain: approximate count
        String[] domainParts = domain.split("\\.");
        double noOfSubDomain;
        if (isDomainIP == 1.0) {
            noOfSubDomain = 0.0;
        } else {
            int subdomains = Math.max(0, domainParts.length - 2);
            if (subdomains == 0 && !domain.startsWith("www.") && domainParts.length == 2) {
                subdomains = 1;
            }
            noOfSubDomain = subdomains;
        }

        // 5. HasObfuscation: provisional heuristic
        double hasObfuscation =
                lowerUrl.contains("%") || lowerUrl.contains("@")
                        ? 1.0 : 0.0;

        // 6. NoOfObfuscatedChar: provisional percent count
        double noOfObfuscatedChar = count(normalizedUrl, '%');

        // 7. NoOfLettersInURL
        double noOfLetters = normalizedUrl.chars()
                .filter(Character::isLetter)
                .count();

        // 8. NoOfDegitsInURL (dataset spelling)
        double noOfDigits = normalizedUrl.chars()
                .filter(Character::isDigit)
                .count();

        // 9. NoOfEqualsInURL
        double noOfEquals = count(normalizedUrl, '=');

        // 10. IsHTTPS
        double isHttps =
                scheme.equalsIgnoreCase("https") ? 1.0 : 0.0;

        return new double[] {
                urlLength,
                domainLength,
                isDomainIP,
                noOfSubDomain,
                hasObfuscation,
                noOfObfuscatedChar,
                noOfLetters,
                noOfDigits,
                noOfEquals,
                isHttps
        };
    }

    /**
     * Expanded Multi-Modal Feature Map (calculates Shannon entropy, punctuation ratios,
     * token metrics, and integrates DOM telemetry).
     */
    public static Map<String, Object> extractExpandedFeatures(String url, Map<String, Object> domFeatures) {
        String normalizedUrl = url != null ? url.trim() : "";
        URI uri;
        try {
            uri = URI.create(normalizedUrl);
        } catch (Exception e) {
            return Collections.emptyMap();
        }

        String host = uri.getHost() != null ? uri.getHost().toLowerCase(Locale.ROOT) : "";
        String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase(Locale.ROOT) : "";
        String path = uri.getPath() != null ? uri.getPath() : "";
        String query = uri.getQuery() != null ? uri.getQuery() : "";

        double urlLength = normalizedUrl.length();
        double domainLength = host.length();
        double isDomainIP = host.matches("^(\\d{1,3}\\.){3}\\d{1,3}$") ? 1.0 : 0.0;

        String[] domainParts = host.split("\\.");
        double noOfSubDomain = Math.max(0, domainParts.length - 2);
        String tld = domainParts.length > 0 ? domainParts[domainParts.length - 1] : "";
        double tldLength = tld.length();

        double noOfLetters = normalizedUrl.chars().filter(Character::isLetter).count();
        double noOfDigits = normalizedUrl.chars().filter(Character::isDigit).count();
        double letterRatio = urlLength > 0 ? noOfLetters / urlLength : 0.0;
        double digitRatio = urlLength > 0 ? noOfDigits / urlLength : 0.0;

        double noOfEquals = count(normalizedUrl, '=');
        double noOfQMark = count(normalizedUrl, '?');
        double noOfAmpersand = count(normalizedUrl, '&');
        double noOfHyphen = count(normalizedUrl, '-');
        double noOfDot = count(normalizedUrl, '.');
        double noOfSlash = count(normalizedUrl, '/');
        double noOfAt = count(normalizedUrl, '@');
        double noOfPercent = count(normalizedUrl, '%');

        double isHttps = scheme.equalsIgnoreCase("https") ? 1.0 : 0.0;
        double hasObfuscation = (noOfPercent > 0 || noOfAt > 0) ? 1.0 : 0.0;

        double urlEntropy = calculateEntropy(normalizedUrl);
        double domainEntropy = calculateEntropy(host);

        Map<String, Object> features = new HashMap<>();
        features.put("URLLength", urlLength);
        features.put("DomainLength", domainLength);
        features.put("IsDomainIP", isDomainIP);
        features.put("TLD", tld);
        features.put("TLDLength", tldLength);
        features.put("NoOfSubDomain", noOfSubDomain);
        features.put("HasObfuscation", hasObfuscation);
        features.put("NoOfObfuscatedChar", noOfPercent);
        features.put("NoOfLettersInURL", noOfLetters);
        features.put("LetterRatioInURL", letterRatio);
        features.put("NoOfDegitsInURL", noOfDigits);
        features.put("DegitRatioInURL", digitRatio);
        features.put("NoOfEqualsInURL", noOfEquals);
        features.put("NoOfQMarkInURL", noOfQMark);
        features.put("NoOfAmpersandInURL", noOfAmpersand);
        features.put("NoOfHyphenInURL", noOfHyphen);
        features.put("NoOfDotInURL", noOfDot);
        features.put("IsHTTPS", isHttps);
        features.put("UrlEntropy", urlEntropy);
        features.put("DomainEntropy", domainEntropy);

        // Merge DOM features if provided by Chrome Extension
        if (domFeatures != null) {
            features.put("HasPasswordField", getDouble(domFeatures, "hasPasswordField"));
            features.put("HasExternalFormSubmit", getDouble(domFeatures, "hasExternalFormSubmit"));
            features.put("NoOfiFrame", getDouble(domFeatures, "noOfiFrame"));
            features.put("HasHiddenFields", getDouble(domFeatures, "hasHiddenFields"));
            features.put("HasSubmitButton", getDouble(domFeatures, "hasSubmitButton"));
            features.put("NoOfImage", getDouble(domFeatures, "noOfImage"));
            features.put("NoOfCSS", getDouble(domFeatures, "noOfCSS"));
            features.put("NoOfJS", getDouble(domFeatures, "noOfJS"));
            features.put("SuspiciousBrandMismatch", getDouble(domFeatures, "suspiciousBrandMismatch"));
        } else {
            // Defaults when only URL is scanned (e.g. initial navigation)
            features.put("HasPasswordField", 0.0);
            features.put("HasExternalFormSubmit", 0.0);
            features.put("NoOfiFrame", 0.0);
            features.put("HasHiddenFields", 0.0);
            features.put("HasSubmitButton", 0.0);
            features.put("NoOfImage", 0.0);
            features.put("NoOfCSS", 0.0);
            features.put("NoOfJS", 0.0);
            features.put("SuspiciousBrandMismatch", 0.0);
        }

        return features;
    }

    public static double calculateEntropy(String input) {
        if (input == null || input.isEmpty()) return 0.0;
        Map<Character, Integer> freq = new HashMap<>();
        for (char c : input.toCharArray()) {
            freq.put(c, freq.getOrDefault(c, 0) + 1);
        }
        double entropy = 0.0;
        double len = input.length();
        for (int count : freq.values()) {
            double p = count / len;
            entropy -= p * (Math.log(p) / Math.log(2));
        }
        return Math.round(entropy * 1000.0) / 1000.0;
    }

    private static double getDouble(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof Boolean b) {
            return b ? 1.0 : 0.0;
        }
        if (val instanceof Number n) {
            return n.doubleValue();
        }
        return 0.0;
    }

    private static int count(String value, char target) {
        int total = 0;
        for (int i = 0; i < value.length(); i++) {
            if (value.charAt(i) == target) {
                total++;
            }
        }
        return total;
    }
}
