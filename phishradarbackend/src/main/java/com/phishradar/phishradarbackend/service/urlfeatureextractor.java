
package com.phishradar.phishradarbackend.service;

import java.net.URI;

public class urlfeatureextractor {

    public static double[] extract(String url) {
        URI uri = URI.create(url);
        String host = uri.getHost();

        if (host == null) {
            throw new IllegalArgumentException("Invalid URL hostname");
        }

        String path = uri.getPath() == null ? "" : uri.getPath();

        double urlLength = url.length();
        double hostLength = host.length();
        double dotCount = count(host, '.');
        double hyphenCount = count(host, '-');
        double subdomainCount = Math.max(0, dotCount - 1);
        double hasIpAddress = host.matches(
                "^(\\d{1,3}\\.){3}\\d{1,3}$") ? 1 : 0;
        double usesHttps =
                "https".equalsIgnoreCase(uri.getScheme()) ? 1 : 0;
        double hasAtSymbol = url.contains("@") ? 1 : 0;
        double suspiciousKeywordCount = countKeywords(url);
        double pathLength = path.length();

        return new double[] {
                urlLength,
                hostLength,
                dotCount,
                hyphenCount,
                subdomainCount,
                hasIpAddress,
                usesHttps,
                hasAtSymbol,
                suspiciousKeywordCount,
                pathLength
        };
    }

    private static int count(String value, char target) {
        int total = 0;
        for (char c : value.toCharArray()) {
            if (c == target) {
                total++;
            }
        }
        return total;
    }

    private static int countKeywords(String url) {
        String[] keywords = {
                "login", "verify", "account", "secure",
                "password", "signin", "update", "confirm"
        };

        String lower = url.toLowerCase();
        int total = 0;

        for (String keyword : keywords) {
            if (lower.contains(keyword)) {
                total++;
            }
        }

        return total;
    }
}
