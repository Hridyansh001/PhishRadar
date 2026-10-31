package com.phishradar.phishradarbackend.service;

import org.springframework.stereotype.Service;

import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import javax.net.ssl.HttpsURLConnection;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DomainIntelligenceService {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(1500))
            .build();

    // In-memory cache for domain intelligence to prevent rate limits and ensure low latency
    private final Map<String, DomainReport> cache = new ConcurrentHashMap<>();

    private static final Pattern REGISTRATION_DATE_PATTERN = Pattern.compile(
            "\"eventAction\"\\s*:\\s*\"registration\"[^}]*?\"eventDate\"\\s*:\\s*\"([^\"]+)\"",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern EVENT_FALLBACK_PATTERN = Pattern.compile(
            "\"eventDate\"\\s*:\\s*\"([^\"]+)\"[^}]*?\"eventAction\"\\s*:\\s*\"registration\"",
            Pattern.CASE_INSENSITIVE
    );

    public record DomainReport(
            String domain,
            Long ageInDays,
            Boolean hasMxRecord,
            Boolean isSslValid,
            Boolean isNewlyRegistered,
            List<String> threatFlags,
            List<String> explanations
    ) {}

    public DomainReport inspectDomain(String domain) {
        if (domain == null || domain.isBlank()) {
            return new DomainReport(domain, null, null, null, false, List.of(), List.of());
        }

        String cleanDomain = domain.toLowerCase().trim();
        if (cleanDomain.startsWith("www.")) {
            cleanDomain = cleanDomain.substring(4);
        }

        DomainReport cached = cache.get(cleanDomain);
        if (cached != null) {
            return cached;
        }

        List<String> threatFlags = new ArrayList<>();
        List<String> explanations = new ArrayList<>();
        Long ageInDays = null;
        Boolean isNewlyRegistered = false;

        // 1. Check Domain Age via RDAP
        try {
            ageInDays = fetchDomainAgeInDays(cleanDomain);
            if (ageInDays != null) {
                if (ageInDays < 14) {
                    threatFlags.add("NEWLY_REGISTERED_DOMAIN");
                    explanations.add("Domain was registered only " + ageInDays + " day(s) ago (High Risk - Typical for throwaway phishing infrastructure)");
                    isNewlyRegistered = true;
                } else if (ageInDays < 45) {
                    threatFlags.add("YOUNG_DOMAIN");
                    explanations.add("Domain is relatively new (" + ageInDays + " days old)");
                }
            }
        } catch (Exception ignored) {
            // RDAP queries can fail or be rate limited; fail open
        }

        // 2. Check DNS MX Records
        Boolean hasMxRecord = null;
        try {
            hasMxRecord = checkMxRecords(cleanDomain);
            if (Boolean.FALSE.equals(hasMxRecord)) {
                threatFlags.add("MISSING_MX_RECORDS");
                explanations.add("Domain lacks email/MX records commonly present on legitimate business services");
            }
        } catch (Exception ignored) {
            // DNS lookup failed
        }

        // 3. Inspect SSL Certificate
        Boolean isSslValid = null;
        try {
            isSslValid = inspectSslCertificate(cleanDomain, threatFlags, explanations);
        } catch (Exception ignored) {
            // SSL lookup failed
        }

        DomainReport report = new DomainReport(
                cleanDomain,
                ageInDays,
                hasMxRecord,
                isSslValid,
                isNewlyRegistered,
                Collections.unmodifiableList(threatFlags),
                Collections.unmodifiableList(explanations)
        );

        cache.put(cleanDomain, report);
        return report;
    }

    private Long fetchDomainAgeInDays(String domain) {
        if (domain.matches("^(\\d{1,3}\\.){3}\\d{1,3}$") || domain.contains("localhost")) {
            return null;
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://rdap.org/domain/" + domain))
                    .header("Accept", "application/rdap+json, application/json")
                    .timeout(Duration.ofMillis(1800))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                String body = response.body();
                Matcher m = REGISTRATION_DATE_PATTERN.matcher(body);
                if (m.find()) {
                    Instant regDate = Instant.parse(m.group(1));
                    return ChronoUnit.DAYS.between(regDate, Instant.now());
                }
                Matcher m2 = EVENT_FALLBACK_PATTERN.matcher(body);
                if (m2.find()) {
                    Instant regDate = Instant.parse(m2.group(1));
                    return ChronoUnit.DAYS.between(regDate, Instant.now());
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private Boolean checkMxRecords(String domain) {
        if (domain.matches("^(\\d{1,3}\\.){3}\\d{1,3}$") || domain.contains("localhost")) {
            return null;
        }

        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            env.put("com.sun.jndi.dns.timeout.initial", "1000");
            env.put("com.sun.jndi.dns.timeout.retries", "1");

            DirContext ictx = new InitialDirContext(env);
            Attributes attrs = ictx.getAttributes(domain, new String[]{"MX"});
            Attribute attr = attrs.get("MX");
            return (attr != null && attr.size() > 0);
        } catch (Exception e) {
            return false;
        }
    }

    private Boolean inspectSslCertificate(String domain, List<String> flags, List<String> explanations) {
        if (domain.matches("^(\\d{1,3}\\.){3}\\d{1,3}$") || domain.contains("localhost")) {
            return null;
        }

        try {
            URI uri = URI.create("https://" + domain);
            HttpsURLConnection conn = (HttpsURLConnection) uri.toURL().openConnection();
            conn.setConnectTimeout(1500);
            conn.setReadTimeout(1500);
            conn.setInstanceFollowRedirects(false);
            conn.connect();

            Certificate[] certs = conn.getServerCertificates();
            if (certs != null && certs.length > 0 && certs[0] instanceof X509Certificate x509) {
                try {
                    x509.checkValidity();
                } catch (Exception e) {
                    flags.add("SSL_EXPIRED_OR_INVALID");
                    explanations.add("SSL Certificate is expired or invalid");
                    return false;
                }

                // Check self-signed
                if (x509.getIssuerX500Principal().equals(x509.getSubjectX500Principal())) {
                    flags.add("SELF_SIGNED_SSL_CERT");
                    explanations.add("Website uses an untrusted self-signed SSL certificate");
                    return false;
                }

                return true;
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }
}
