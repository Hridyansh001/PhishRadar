package com.phishradar.phishradarbackend.service;

import com.phishradar.phishradarbackend.entities.detection;
import com.phishradar.phishradarbackend.entities.users;
import com.phishradar.phishradarbackend.entities.website;
import com.phishradar.phishradarbackend.repository.detectionrepository;
import com.phishradar.phishradarbackend.repository.usersrepository;
import com.phishradar.phishradarbackend.repository.websiterepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class detectionservice {
    private final regexdetectionservice regexdetectionservice;
    private final usersrepository usersrepository;
    private final websiterepository websiterepository;
    private final detectionrepository detectionrepository;
    private final mldetectionservice mldetectionservice;

    public detectionservice(regexdetectionservice regexdetectionservice,
                            usersrepository usersrepository,
                            websiterepository websiterepository,
                            detectionrepository detectionrepository,
                            mldetectionservice mldetectionservice) {
        this.regexdetectionservice = regexdetectionservice;
        this.usersrepository = usersrepository;
        this.websiterepository = websiterepository;
        this.detectionrepository = detectionrepository;
        this.mldetectionservice = mldetectionservice;
    }

    private static final Set<String> TRUSTED_DOMAINS = Set.of(
            "google.com", "youtube.com", "github.com", "microsoft.com", "apple.com",
            "wikipedia.org", "amazon.com", "twitter.com", "x.com", "facebook.com",
            "instagram.com", "linkedin.com", "reddit.com", "netflix.com", "yahoo.com",
            "bing.com", "duckduckgo.com", "cloudflare.com", "stackoverflow.com",
            "npmjs.com", "brave.com", "mozilla.org", "gitlab.com", "bitbucket.org",
            "paypal.com", "medium.com", "spotify.com", "slack.com", "zoom.us",
            "dropbox.com", "adobe.com", "salesforce.com", "cnn.com", "nytimes.com",
            "bbc.com", "bbc.co.uk", "whatsapp.com", "twitch.tv", "vimeo.com"
    );

    private boolean isTrustedDomain(String hostname) {
        if (hostname == null || hostname.isBlank()) return false;
        String clean = hostname.toLowerCase().trim();
        if (clean.startsWith("www.")) {
            clean = clean.substring(4);
        }
        if (TRUSTED_DOMAINS.contains(clean)) {
            return true;
        }
        for (String trusted : TRUSTED_DOMAINS) {
            if (clean.endsWith("." + trusted)) {
                return true;
            }
        }
        return false;
    }

    @Transactional
    public Map<String, Object> analyzeurl(String url, Integer userid) {
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalArgumentException("url cant be emtpy");
        }

        // Auto-normalize scheme if missing (e.g. "paypal-fake.com" -> "https://paypal-fake.com")
        String normalizedUrl = url.trim();
        if (!normalizedUrl.contains("://")) {
            normalizedUrl = "https://" + normalizedUrl;
        }

        users user = null;
        if (userid != null) {
            user = usersrepository.findById(userid).orElse(null);
        }
        if (user == null) {
            user = usersrepository.findAll().stream().findFirst().orElse(null);
        }
        if (user == null) {
            users guest = new users();
            guest.setUname("guest");
            guest.setEmail("guest@phishradar.local");
            guest.setPassword("guest");
            user = usersrepository.save(guest);
        }

        URI uri;
        try {
            uri = URI.create(normalizedUrl);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("url is invalid");
        }

        String domain = uri.getHost();
        if (domain == null || domain.isBlank()) {
            throw new IllegalArgumentException("url cant be empty");
        }

        List<String> findings = regexdetectionservice.analyzeurl(normalizedUrl);

        if (findings.contains("INVALID_URL")) {
            throw new IllegalArgumentException("url is invalid");
        }

        int regexScore = regexdetectionservice.calculateriskscore(findings);
        String regexresult = findings.isEmpty() ? "PASS" : "SUSPICIOUS";

        String mlresult;
        double mlProbability;
        int riskscore;
        String finalresult;
        String actiontaken;
        String risklevel;
        String message;

        // Check if domain is a verified global high-authority domain with no severe spoofing/IP findings
        boolean trusted = isTrustedDomain(domain)
                && !findings.contains("IP_ADDRESS_IN_URL")
                && !findings.contains("BRAND_IMPERSONATION")
                && !findings.contains("TYPOSQUATTING_DETECTED")
                && !findings.contains("HIGHLY_SUSPICIOUS_DOMAIN")
                && !findings.contains("SUSPICIOUS_TLD")
                && !findings.contains("AT_SYMBOL_IN_URL");

        if (trusted) {
            mlresult = "LEGITIMATE";
            mlProbability = 0.0;
            riskscore = 0;
            finalresult = "SAFE";
            actiontaken = "ALLOWED";
            risklevel = "LOW";
            message = "Verified legitimate high-authority domain. No threats detected.";
        } else {
            mldetectionservice.Prediction prediction;
            try {
                prediction = mldetectionservice.predict(normalizedUrl);
            } catch (Exception e) {
                throw new IllegalStateException(
                        "ML prediction failed. Detection was not completed.", e);
            }

            mlresult = prediction.classification().toUpperCase();
            mlProbability = prediction.phishingProbability();

            // Balanced hybrid score combining regex heuristics and ML probabilities
            double weightedScore = 0.5 * regexScore + 0.5 * mlProbability;

            // Indicator Floor: Never allow strong phishing indicators from one engine
            // to be diluted down to safe simply because another engine returned safe
            double maxDetectorScore = Math.max((double) regexScore, mlProbability);

            if (maxDetectorScore >= 50.0) {
                // If either detector has high confidence, enforce minimum risk floor at 85% of max
                riskscore = (int) Math.round(Math.max(weightedScore, maxDetectorScore * 0.85));
            } else {
                riskscore = (int) Math.round(weightedScore);
            }

            // Synergy Boost: If both regex and ML corroborate risk, elevate combined score
            if (regexScore >= 25 && mlProbability >= 45.0) {
                riskscore = Math.min(100, riskscore + 15);
            }

            // Critical Indicator Overrides: definitive phishing traits MUST guarantee HIGH risk
            boolean hasCriticalFinding = findings.contains("BRAND_IMPERSONATION")
                    || findings.contains("TYPOSQUATTING_DETECTED")
                    || findings.contains("HIGHLY_SUSPICIOUS_DOMAIN");

            boolean hasIpOrCredentialFinding = findings.contains("IP_ADDRESS_IN_URL")
                    || findings.contains("AT_SYMBOL_IN_URL");

            if (hasCriticalFinding) {
                riskscore = Math.max(riskscore, 85);
            } else if (hasIpOrCredentialFinding) {
                riskscore = Math.max(riskscore, 70);
            }

            riskscore = Math.max(0, Math.min(100, riskscore));

            // Final verdict decision logic adhering to user specification:
            // - below 20: Safe & Clean (SAFE, LOW risk, ALLOWED)
            // - 20 to 60: Suspicious & Requires Review (REVIEW, MEDIUM risk, REVIEW action)
            // - above 60: Threats & Phishing Blocked (SUSPICIOUS, HIGH risk, WARNING action)
            if (riskscore > 60 || hasCriticalFinding || hasIpOrCredentialFinding || mlProbability >= 75.0) {
                finalresult = "SUSPICIOUS";
                actiontaken = "WARNING";
                risklevel = "HIGH";
                riskscore = Math.max(riskscore, 61); // Threats & Blocked is strictly above 60
                message = "High-risk threat detected. Access blocked to protect your credentials.";

                // Field Consistency: if the URL is classified as threats/phishing,
                // ML classification must NOT report LEGITIMATE!
                mlresult = "PHISHING";
                mlProbability = Math.max(mlProbability, 85.0);
            } else if (riskscore >= 20 || regexScore >= 15 || mlProbability >= 30.0 || !findings.isEmpty()) {
                finalresult = "REVIEW";
                actiontaken = "REVIEW";
                risklevel = "MEDIUM";
                riskscore = Math.max(20, Math.min(60, riskscore)); // Suspicious & Review tier is in [20, 60]
                message = "Suspicious indicators detected. Requires review before continuing.";

                // Field Consistency: if in review tier, ensure ML probability reflects elevated concern
                mlProbability = Math.max(mlProbability, 45.0);
            } else {
                finalresult = "SAFE";
                actiontaken = "ALLOWED";
                risklevel = "LOW";
                riskscore = Math.min(19, Math.max(0, riskscore)); // Safe & Clean is strictly below 20
                message = "Safe & clean domain. No significant threat indicators detected.";
                mlresult = "LEGITIMATE";
            }
        }

        String protocol = uri.getScheme();

// Fix: create a final variable for use inside the lambda
        final String urlForSave = normalizedUrl;

        website site = websiterepository.findByUrl(normalizedUrl).orElseGet(() -> {
            website newsite = new website();
            newsite.setUrl(urlForSave);
            newsite.setDomain(domain);
            newsite.setProtocol(protocol);
            newsite.setIp(null);
            newsite.setFirstseen(LocalDateTime.now());
            newsite.setLastchecked(LocalDateTime.now());
            return websiterepository.save(newsite);
        });
        site.setLastchecked(LocalDateTime.now());
        site = websiterepository.save(site);

        detection result = new detection();
        result.setUserid(user.getUserid());
        result.setWid(site.getWid());
        result.setDetectedat(LocalDateTime.now());
        result.setRresult(regexresult);
        result.setMlresult(mlresult);
        result.setFresult(finalresult);
        result.setRisckscore(BigDecimal.valueOf(riskscore));
        result.setActiontaken(actiontaken);

        detectionrepository.save(result);

        Map<String, Object> response = new HashMap<>();
        response.put("url", normalizedUrl);
        response.put("domain", domain);
        response.put("regexresult", regexresult);
        response.put("mlresult", mlresult);
        response.put("mlProbability", mlProbability);
        response.put("regexRiskScore", regexScore);
        response.put("finalresult", finalresult);
        // Compatibility: provide database column name 'risckscore' and standard 'riskscore'/'riskScore'
        response.put("risckscore", riskscore);
        response.put("riskscore", riskscore);
        response.put("riskScore", riskscore);
        response.put("actiontaken", actiontaken);
        // Compatibility: provide both 'risklevel' and 'riskLevel'
        response.put("risklevel", risklevel);
        response.put("riskLevel", risklevel);
        response.put("message", message);
        response.put("findings", findings);

        return response;
    }
}
