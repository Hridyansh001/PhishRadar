
package com.phishradar.phishradarbackend.service;

import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class regexdetectionservice {

    private static final Pattern IPV4 = Pattern.compile(
            "^(?:\\d{1,3}\\.){3}\\d{1,3}$"
    );

    private static final Pattern SUSPICIOUS_SHORTENER = Pattern.compile(
            "(?:bit\\.ly|tinyurl\\.com|t\\.co|is\\.gd|cutt\\.ly)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern ENCODED_OBFUSCATION = Pattern.compile(
            "%[0-9a-fA-F]{2}"
    );

    private static final Pattern SUSPICIOUS_KEYWORD = Pattern.compile(
            "(?:login|verify|account|update|secure|password|signin)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern SUSPICIOUS_TLD = Pattern.compile(
            "(?:tk|ml|ga|cf|gq|xyz|top|icu|pw|online|site|club|rest|cfd|sbs|cyou|bond|quest|zip|mov)$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern HIGHLY_SUSPICIOUS_DOMAIN = Pattern.compile(
            "(?i)(?:[a-z0-9-]{20,}|"
                    + "(?:paypa[l1]|goog[l1]e|amaz[o0]n|app[l1]e)[a-z0-9-]*)"
                    + "\\.(?:xyz|top|icu|pw|online|site|club|tk|ml|ga|cf)$"
    );

    public List<String> analyzeurl(String url) {

        List<String> findings = new ArrayList<>();

        if (url == null || url.trim().isEmpty()) {
            findings.add("INVALID_URL");
            return findings;
        }

        try {
            URI uri = URI.create(url.trim());

            String scheme = uri.getScheme();
            String host = uri.getHost();
            String path = uri.getRawPath();
            String query = uri.getRawQuery();

            if (scheme == null ||
                    !(scheme.equalsIgnoreCase("http")
                            || scheme.equalsIgnoreCase("https"))
                    || host == null) {
                findings.add("INVALID_URL");
                return findings;
            }

            if (IPV4.matcher(host).matches()) {
                findings.add("IP_ADDRESS_IN_URL");
            }

            if (SUSPICIOUS_SHORTENER.matcher(host).matches()) {
                findings.add("URL_SHORTENER_DETECTED");
            }

            if (url.length() > 200) {
                findings.add("UNUSUALLY_LONG_URL");
            }

            String fullPathAndQuery =
                    (path == null ? "" : path) + " "
                            + (query == null ? "" : query);

            if (ENCODED_OBFUSCATION.matcher(url).find()) {
                findings.add("PERCENT_ENCODING_PRESENT");
            }

            if (SUSPICIOUS_KEYWORD.matcher(fullPathAndQuery).find()) {
                findings.add("SUSPICIOUS_KEYWORD");
            }

            if (SUSPICIOUS_TLD.matcher(host).find()) {
                findings.add("SUSPICIOUS_TLD");
            }

            if (HIGHLY_SUSPICIOUS_DOMAIN.matcher(host).matches()) {
                findings.add("HIGHLY_SUSPICIOUS_DOMAIN");
            }

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

                case "IP_ADDRESS_IN_URL":
                    score += 25;
                    break;

                case "UNUSUALLY_LONG_URL":
                    score += 10;
                    break;

                case "SUSPICIOUS_KEYWORD":
                    score += 10;
                    break;

                case "PERCENT_ENCODING_PRESENT":
                    score += 5;
                    break;

                case "URL_SHORTENER_DETECTED":
                    score += 10;
                    break;

                case "SUSPICIOUS_TLD":
                    score += 10;
                    break;

                case "HIGHLY_SUSPICIOUS_DOMAIN":
                    score += 30;
                    break;

                case "NOT_HTTPS":
                    score += 5;
                    break;

                case "INVALID_URL":
                    score += 0;
                    break;

                default:
                    break;
            }
        }

        return Math.min(score, 100);
    }
}
