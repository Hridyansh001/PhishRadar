
package com.phishradar.phishradarbackend.service;

import java.net.URI;
import java.util.Locale;

public class urlfeatureextractor {

    private urlfeatureextractor() {
    }

    public static double[] extract(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("URL cannot be empty");
        }

        final URI uri;

        try {
            uri = URI.create(url.trim());
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
                    "URL must be a valid HTTP or HTTPS URL");
        }

        String normalizedUrl = url.trim();
        String lowerUrl = normalizedUrl.toLowerCase(Locale.ROOT);

        // 1. URLLength
        double urlLength = normalizedUrl.length();

        // 2. DomainLength
        double domainLength = host.length();

        // 3. IsDomainIP
        double isDomainIP =
                host.matches("^(\\d{1,3}\\.){3}\\d{1,3}$") ? 1 : 0;

        // 4. NoOfSubDomain
        String[] domainParts = host.split("\\.");
        double noOfSubDomain = Math.max(0, domainParts.length - 2);

        // 5. HasObfuscation
        double hasObfuscation =
                lowerUrl.contains("%") || lowerUrl.contains("@") ? 1 : 0;

        // 6. NoOfObfuscatedChar
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
        double isHttps = scheme.equalsIgnoreCase("https") ? 1 : 0;

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
