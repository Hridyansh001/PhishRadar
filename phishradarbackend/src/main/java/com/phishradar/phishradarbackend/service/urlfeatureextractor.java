
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
        int subdomains = Math.max(0, domainParts.length - 2);
        // In the PhiUSIIL training dataset, benign domains were indexed with 'www.' prefix (counting as 1).
        // For bare root domains (e.g. github.com), normalize to 1 so the lack of 'www.' does not falsely trigger
        // the decision forest's no-subdomain phishing split.
        if (subdomains == 0 && !domain.startsWith("www.") && domainParts.length == 2) {
            subdomains = 1;
        }
        double noOfSubDomain = subdomains;

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
