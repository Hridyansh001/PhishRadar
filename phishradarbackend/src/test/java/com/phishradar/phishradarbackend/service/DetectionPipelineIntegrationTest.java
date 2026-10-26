package com.phishradar.phishradarbackend.service;

import com.phishradar.phishradarbackend.entities.detection;
import com.phishradar.phishradarbackend.entities.users;
import com.phishradar.phishradarbackend.entities.website;
import com.phishradar.phishradarbackend.repository.detectionrepository;
import com.phishradar.phishradarbackend.repository.usersrepository;
import com.phishradar.phishradarbackend.repository.websiterepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class DetectionPipelineIntegrationTest {

    private detectionservice detectionService;
    private regexdetectionservice regexService;
    private mldetectionservice mlService;
    private usersrepository usersRepo;
    private websiterepository websiteRepo;
    private detectionrepository detectionRepo;

    @BeforeEach
    void setUp() {
        regexService = new regexdetectionservice();
        mlService = new mldetectionservice();
        usersRepo = Mockito.mock(usersrepository.class);
        websiteRepo = Mockito.mock(websiterepository.class);
        detectionRepo = Mockito.mock(detectionrepository.class);

        users mockUser = new users();
        mockUser.setUserid(1);
        mockUser.setUname("Test User");
        mockUser.setEmail("test@phishradar.local");
        when(usersRepo.findById(1)).thenReturn(Optional.of(mockUser));

        website mockSite = new website();
        mockSite.setWid(10);
        mockSite.setUrl("https://test.local");
        mockSite.setFirstseen(LocalDateTime.now());
        mockSite.setLastchecked(LocalDateTime.now());
        when(websiteRepo.findByUrl(any())).thenReturn(Optional.of(mockSite));
        when(websiteRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(detectionRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        detectionService = new detectionservice(regexService, usersRepo, websiteRepo, detectionRepo, mlService);
    }

    @Test
    @DisplayName("paypal-fake.com MUST be classified as SUSPICIOUS with HIGH risk score and WARNING action")
    void testPaypalFakeClassification() {
        Map<String, Object> result = detectionService.analyzeurl("https://paypal-fake.com", 1);

        assertEquals("SUSPICIOUS", result.get("finalresult"));
        assertEquals("WARNING", result.get("actiontaken"));
        assertEquals("HIGH", result.get("risklevel"));
        assertEquals("HIGH", result.get("riskLevel"));

        int riskScore = (int) result.get("riskscore");
        assertTrue(riskScore >= 60, "Expected risk score >= 60 for paypal-fake.com, got: " + riskScore);

        @SuppressWarnings("unchecked")
        List<String> findings = (List<String>) result.get("findings");
        assertTrue(findings.contains("BRAND_IMPERSONATION"));

        assertEquals("SUSPICIOUS", result.get("regexresult"));
        assertEquals("PHISHING", result.get("mlresult"));
    }

    @Test
    @DisplayName("paypal-fake.com without scheme MUST also be classified as SUSPICIOUS")
    void testSchemelessPaypalFake() {
        Map<String, Object> result = detectionService.analyzeurl("paypal-fake.com", 1);
        assertEquals("SUSPICIOUS", result.get("finalresult"));
        assertEquals("WARNING", result.get("actiontaken"));
        assertEquals("HIGH", result.get("risklevel"));
        assertEquals("PHISHING", result.get("mlresult"));
        int riskScore = (int) result.get("riskscore");
        assertTrue(riskScore >= 60);
    }

    @Test
    @DisplayName("paypa1.com typosquatting MUST be classified as SUSPICIOUS with HIGH risk")
    void testTyposquattingClassification() {
        Map<String, Object> result = detectionService.analyzeurl("https://paypa1.com", 1);

        assertEquals("SUSPICIOUS", result.get("finalresult"));
        assertEquals("WARNING", result.get("actiontaken"));
        assertEquals("HIGH", result.get("risklevel"));

        int riskScore = (int) result.get("riskscore");
        assertTrue(riskScore >= 60);

        @SuppressWarnings("unchecked")
        List<String> findings = (List<String>) result.get("findings");
        assertTrue(findings.contains("TYPOSQUATTING_DETECTED"));
    }

    @Test
    @DisplayName("IP-based URL http://192.168.1.1/login MUST be classified as SUSPICIOUS with HIGH risk")
    void testIpBasedUrlClassification() {
        Map<String, Object> result = detectionService.analyzeurl("http://192.168.1.1/login", 1);

        assertEquals("SUSPICIOUS", result.get("finalresult"));
        assertEquals("WARNING", result.get("actiontaken"));
        assertEquals("HIGH", result.get("risklevel"));

        int riskScore = (int) result.get("riskscore");
        assertTrue(riskScore >= 60);
    }

    @Test
    @DisplayName("Legitimate high-authority domains MUST be classified as SAFE, LOW risk (0 score), and ALLOWED")
    void testLegitimateHighAuthorityDomains() {
        // Official Google
        Map<String, Object> resultGoogle = detectionService.analyzeurl("https://www.google.com", 1);
        assertEquals("SAFE", resultGoogle.get("finalresult"));
        assertEquals("ALLOWED", resultGoogle.get("actiontaken"));
        assertEquals("LOW", resultGoogle.get("risklevel"));
        assertEquals(0, resultGoogle.get("riskscore"));
        assertEquals("LEGITIMATE", resultGoogle.get("mlresult"));

        // Official PayPal
        Map<String, Object> resultPaypal = detectionService.analyzeurl("https://www.paypal.com/signin", 1);
        assertEquals("SAFE", resultPaypal.get("finalresult"));
        assertEquals("ALLOWED", resultPaypal.get("actiontaken"));
        assertEquals("LOW", resultPaypal.get("risklevel"));
        assertEquals(0, resultPaypal.get("riskscore"));
        assertEquals("LEGITIMATE", resultPaypal.get("mlresult"));

        // Official GitHub
        Map<String, Object> resultGithub = detectionService.analyzeurl("https://github.com", 1);
        assertEquals("SAFE", resultGithub.get("finalresult"));
        assertEquals("ALLOWED", resultGithub.get("actiontaken"));
        assertEquals("LOW", resultGithub.get("risklevel"));
        assertEquals(0, resultGithub.get("riskscore"));
    }

    @Test
    @DisplayName("General benign domains without brand impersonation should be SAFE with LOW risk")
    void testGeneralBenignDomain() {
        Map<String, Object> result = detectionService.analyzeurl("https://pineapple-farms.com", 1);
        assertEquals("SAFE", result.get("finalresult"));
        assertEquals("ALLOWED", result.get("actiontaken"));
        assertEquals("LOW", result.get("risklevel"));

        int riskScore = (int) result.get("riskscore");
        assertTrue(riskScore < 20, "Safe & Clean must be below 20, got: " + riskScore);
    }

    @Test
    @DisplayName("Ambiguous cases with moderate indicators (e.g. suspicious TLD) should receive REVIEW verdict in [20, 60]")
    void testAmbiguousUrlClassification() {
        Map<String, Object> result = detectionService.analyzeurl("https://my-random-portfolio.xyz", 1);

        assertEquals("REVIEW", result.get("finalresult"));
        assertEquals("REVIEW", result.get("actiontaken"));
        assertEquals("MEDIUM", result.get("risklevel"));

        int riskScore = (int) result.get("riskscore");
        assertTrue(riskScore >= 20 && riskScore <= 60, "Requires Review score must be in [20, 60], got: " + riskScore);
    }

    @Test
    @DisplayName("All response fields must be present and mutually consistent across every decision tier")
    void testResponseFieldConsistency() {
        String[] testUrls = {
                "https://paypal-fake.com",
                "https://www.google.com",
                "https://my-random-portfolio.xyz",
                "http://192.168.1.1/login"
        };

        for (String url : testUrls) {
            Map<String, Object> response = detectionService.analyzeurl(url, 1);

            // Mandatory keys
            assertNotNull(response.get("url"));
            assertNotNull(response.get("domain"));
            assertNotNull(response.get("regexresult"));
            assertNotNull(response.get("mlresult"));
            assertNotNull(response.get("mlProbability"));
            assertNotNull(response.get("regexRiskScore"));
            assertNotNull(response.get("finalresult"));
            assertNotNull(response.get("actiontaken"));
            assertNotNull(response.get("findings"));
            assertNotNull(response.get("message"));

            // Compatibility keys
            assertEquals(response.get("risckscore"), response.get("riskscore"));
            assertEquals(response.get("riskScore"), response.get("riskscore"));
            assertEquals(response.get("risklevel"), response.get("riskLevel"));

            String finalResult = (String) response.get("finalresult");
            String riskLevel = (String) response.get("risklevel");
            String actionTaken = (String) response.get("actiontaken");
            int score = (int) response.get("riskscore");

            if ("SUSPICIOUS".equals(finalResult)) {
                assertEquals("HIGH", riskLevel);
                assertEquals("WARNING", actionTaken);
                assertTrue(score > 60, "Threats & Blocked score must be > 60, got: " + score);
            } else if ("REVIEW".equals(finalResult)) {
                assertEquals("MEDIUM", riskLevel);
                assertEquals("REVIEW", actionTaken);
                assertTrue(score >= 20 && score <= 60, "Suspicious & Review score must be in [20, 60], got: " + score);
            } else if ("SAFE".equals(finalResult)) {
                assertEquals("LOW", riskLevel);
                assertEquals("ALLOWED", actionTaken);
                assertTrue(score < 20, "Safe & Clean score must be < 20, got: " + score);
            }
        }
    }
}
