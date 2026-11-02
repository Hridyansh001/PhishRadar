package com.phishradar.phishradarbackend.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ThreatFeedService {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    // Exact malicious URL matches
    private final Set<String> blacklistedUrls = ConcurrentHashMap.newKeySet();
    // Malicious domains/hostnames
    private final Set<String> blacklistedDomains = ConcurrentHashMap.newKeySet();
    // Feed source tracker (e.g. url -> "OpenPhish" / "URLhaus")
    private final Map<String, String> threatSources = new ConcurrentHashMap<>();

    // Public feeds
    private static final String OPENPHISH_URL = "https://openphish.com/feed.txt";
    private static final String URLHAUS_ONLINE_URL = "https://urlhaus.abuse.ch/downloads/csv_online/";

    public record ThreatFeedMatch(boolean isMatch, String source, String reason) {}

    public ThreatFeedMatch check(String normalizedUrl, String domain) {
        if (normalizedUrl != null && blacklistedUrls.contains(normalizedUrl.toLowerCase(Locale.ROOT))) {
            String src = threatSources.getOrDefault(normalizedUrl.toLowerCase(Locale.ROOT), "Global Threat Feed");
            return new ThreatFeedMatch(true, src, "URL actively confirmed in " + src + " intelligence database");
        }

        if (domain != null) {
            String cleanDomain = domain.toLowerCase(Locale.ROOT).trim();
            if (cleanDomain.startsWith("www.")) {
                cleanDomain = cleanDomain.substring(4);
            }
            if (blacklistedDomains.contains(cleanDomain)) {
                String src = threatSources.getOrDefault(cleanDomain, "Global Threat Feed");
                return new ThreatFeedMatch(true, src, "Domain actively flagged in " + src + " threat database");
            }
        }

        return new ThreatFeedMatch(false, null, null);
    }

    /**
     * Refresh feeds every 2 hours automatically
     */
    @Scheduled(fixedRate = 7200000, initialDelay = 5000)
    public void refreshFeeds() {
        fetchOpenPhish();
        fetchUrlhaus();
    }

    public int getCachedUrlCount() {
        return blacklistedUrls.size();
    }

    public int getCachedDomainCount() {
        return blacklistedDomains.size();
    }

    private void fetchOpenPhish() {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(OPENPHISH_URL))
                    .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) PhishRadar/2.0")
                    .timeout(Duration.ofSeconds(12))
                    .GET()
                    .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() == 200 && res.body() != null) {
                for (String line : res.body().split("\n")) {
                    String clean = line.trim();
                    if (!clean.isEmpty() && clean.startsWith("http")) {
                        String norm = clean.toLowerCase(Locale.ROOT);
                        blacklistedUrls.add(norm);
                        threatSources.put(norm, "OpenPhish");

                        try {
                            URI uri = URI.create(clean);
                            if (uri.getHost() != null) {
                                String host = uri.getHost().toLowerCase(Locale.ROOT);
                                if (host.startsWith("www.")) host = host.substring(4);
                                blacklistedDomains.add(host);
                                threatSources.putIfAbsent(host, "OpenPhish");
                            }
                        } catch (Exception ignored) {}
                    }
                }
            }
        } catch (Exception ignored) {
            // Fail open if offline or blocked
        }
    }

    private void fetchUrlhaus() {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(URLHAUS_ONLINE_URL))
                    .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) PhishRadar/2.0")
                    .timeout(Duration.ofSeconds(12))
                    .GET()
                    .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() == 200 && res.body() != null) {
                for (String line : res.body().split("\n")) {
                    if (line.startsWith("#") || line.isBlank()) continue;
                    String[] parts = line.split("\",\"");
                    if (parts.length > 2) {
                        String rawUrl = parts[2].replace("\"", "").trim();
                        if (rawUrl.startsWith("http")) {
                            String norm = rawUrl.toLowerCase(Locale.ROOT);
                            blacklistedUrls.add(norm);
                            threatSources.put(norm, "URLhaus");
                            try {
                                URI uri = URI.create(rawUrl);
                                if (uri.getHost() != null) {
                                    String host = uri.getHost().toLowerCase(Locale.ROOT);
                                    if (host.startsWith("www.")) host = host.substring(4);
                                    blacklistedDomains.add(host);
                                    threatSources.putIfAbsent(host, "URLhaus");
                                }
                            } catch (Exception ignored) {}
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            // Fail open if offline or blocked
        }
    }
}

