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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class detectionservice {
    private final regexdetectionservice regexdetectionservice;
    private final usersrepository usersrepository;
    private final websiterepository websiterepository;
    private final detectionrepository detectionrepository;
    private final mldetectionservice mldetectionservice;
    public detectionservice(regexdetectionservice regexdetectionservice, usersrepository usersrepository, websiterepository websiterepository, detectionrepository detectionrepository,mldetectionservice mldetectionservice)
    {
        this.regexdetectionservice=regexdetectionservice;
        this.usersrepository=usersrepository;
        this.websiterepository=websiterepository;
        this.detectionrepository=detectionrepository;
        this.mldetectionservice = mldetectionservice;
    }

    private static final java.util.Set<String> TRUSTED_DOMAINS = java.util.Set.of(
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
    public Map<String, Object> analyzeurl(String url, Integer userid)
    {
        if(url==null||url.isEmpty())
            throw new IllegalArgumentException("url cant be emtpy");
        users user = usersrepository.findById(userid).orElseThrow(()->new IllegalArgumentException("user not found"));

        URI uri = URI.create(url.trim());
        String domain = uri.getHost();

        if(domain==null || domain.isBlank())
        {
            throw new IllegalArgumentException("url cant be empty");
        }

        List<String> findings  = regexdetectionservice.analyzeurl(url);

        if(findings.contains("INVALID_URL"))
        {
            throw new IllegalArgumentException("url is invalid");
        }
        int regexScore =
                regexdetectionservice.calculateriskscore(findings);

        String regexresult =
                findings.isEmpty() ? "PASS" : "SUSPICIOUS";

        String mlresult;
        double mlProbability;
        int riskscore;
        String finalresult;
        String actiontaken;

        // If this is a verified global high-authority domain and has no high-risk heuristic flags,
        // prevent false positive ML triggers.
        boolean trusted = isTrustedDomain(domain)
                && !findings.contains("IP_ADDRESS_IN_URL")
                && !findings.contains("HIGHLY_SUSPICIOUS_DOMAIN")
                && !findings.contains("SUSPICIOUS_TLD");

        if (trusted) {
            mlresult = "LEGITIMATE";
            mlProbability = 0.0;
            riskscore = Math.min(regexScore, 10);
            finalresult = "SAFE";
            actiontaken = "ALLOWED";
        } else {
            mldetectionservice.Prediction prediction;
            try {
                prediction = mldetectionservice.predict(url);
            } catch (Exception e) {
                throw new IllegalStateException(
                        "ML prediction failed. Detection was not completed.", e);
            }

            mlresult = prediction.classification().toUpperCase();
            mlProbability = prediction.phishingProbability();

            // Balanced hybrid score combining regex heuristics and ML probabilities
            riskscore = (int) Math.round(0.5 * regexScore + 0.5 * mlProbability);
            riskscore = Math.max(0, Math.min(100, riskscore));

            // Hybrid decision: require corroboration or definitive heuristic red flags before blocking
            if (riskscore >= 60 || (regexScore >= 35 && mlProbability >= 50)
                    || findings.contains("HIGHLY_SUSPICIOUS_DOMAIN")
                    || findings.contains("IP_ADDRESS_IN_URL")) {
                finalresult = "SUSPICIOUS";
                actiontaken = "WARNING";
            } else if (riskscore >= 30 || regexScore >= 20 || mlProbability >= 70) {
                finalresult = "REVIEW";
                actiontaken = "REVIEW";
            } else {
                finalresult = "SAFE";
                actiontaken = "ALLOWED";
            }
        }

        String protocol = uri.getScheme();

        website site = websiterepository.findByUrl(url).orElseGet(()->
        {
            website newsite = new website();

            newsite.setUrl(url);
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

        Map<String , Object> response = new HashMap<>();

        String risklevel;
        String message;

        if (riskscore >= 60) {
            risklevel = "HIGH";
            message = "Potential phishing detected. Proceed with caution.";
        } else if (riskscore >= 30) {
            risklevel = "MEDIUM";
            message = "Some suspicious indicators were detected. Verify this URL.";
        } else {
            risklevel = "LOW";
            message = "No strong phishing indicators were detected.";
        }

        response.put("risklevel", risklevel);
        response.put("message", message);


        response.put("url",url);
        response.put("domain",domain);
        response.put("regexresult",regexresult);
        response.put("mlresult",mlresult);
        response.put("mlProbability", mlProbability);
        response.put("regexRiskScore", regexScore);
        response.put("finalresult",finalresult);
        response.put("risckscore",riskscore);
        response.put("actiontaken",actiontaken);
        response.put("findings",findings);

        return response;
    }

}
