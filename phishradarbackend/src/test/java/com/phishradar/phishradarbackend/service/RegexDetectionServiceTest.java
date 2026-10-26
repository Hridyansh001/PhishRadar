package com.phishradar.phishradarbackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class RegexDetectionServiceTest {

    private regexdetectionservice regexService;

    @BeforeEach
    void setUp() {
        regexService = new regexdetectionservice();
    }

    @Test
    @DisplayName("Should detect brand impersonation on synthetic paypal-fake.com")
    void testBrandImpersonationPaypalFake() {
        String url = "https://paypal-fake.com";
        List<String> findings = regexService.analyzeurl(url);

        assertTrue(findings.contains("BRAND_IMPERSONATION"),
                "Expected BRAND_IMPERSONATION for paypal-fake.com, but got: " + findings);

        int riskScore = regexService.calculateriskscore(findings);
        assertTrue(riskScore >= 55, "Expected risk score >= 55, got: " + riskScore);
    }

    @Test
    @DisplayName("Should detect brand impersonation with keywords: login-apple.com")
    void testBrandImpersonationWithKeyword() {
        String url = "https://login-apple.com";
        List<String> findings = regexService.analyzeurl(url);

        assertTrue(findings.contains("BRAND_IMPERSONATION"),
                "Expected BRAND_IMPERSONATION for login-apple.com");
        assertTrue(findings.contains("SUSPICIOUS_KEYWORD_IN_DOMAIN"),
                "Expected SUSPICIOUS_KEYWORD_IN_DOMAIN for login-apple.com");
    }

    @Test
    @DisplayName("Should detect typosquatting in domain: paypa1.com and g00gle.com")
    void testTyposquatting() {
        List<String> findings1 = regexService.analyzeurl("https://paypa1.com");
        assertTrue(findings1.contains("TYPOSQUATTING_DETECTED"),
                "Expected TYPOSQUATTING_DETECTED for paypa1.com");

        List<String> findings2 = regexService.analyzeurl("https://g00gle.com/login");
        assertTrue(findings2.contains("TYPOSQUATTING_DETECTED"),
                "Expected TYPOSQUATTING_DETECTED for g00gle.com");
    }

    @Test
    @DisplayName("Should detect IP address based URLs (IPv4 and IPv6)")
    void testIpBasedUrls() {
        List<String> findingsIpv4 = regexService.analyzeurl("http://192.168.1.1/login");
        assertTrue(findingsIpv4.contains("IP_ADDRESS_IN_URL"),
                "Expected IP_ADDRESS_IN_URL for 192.168.1.1");
        assertTrue(findingsIpv4.contains("HIGHLY_SUSPICIOUS_DOMAIN"),
                "Expected HIGHLY_SUSPICIOUS_DOMAIN for IP with auth keyword");

        List<String> findingsIpv6 = regexService.analyzeurl("http://[2001:db8::1]/path");
        assertTrue(findingsIpv6.contains("IP_ADDRESS_IN_URL"),
                "Expected IP_ADDRESS_IN_URL for IPv6");
    }

    @Test
    @DisplayName("Should detect suspicious TLDs without flagging normal domains")
    void testSuspiciousTld() {
        List<String> findingsXyz = regexService.analyzeurl("https://account-verify.xyz");
        assertTrue(findingsXyz.contains("SUSPICIOUS_TLD"),
                "Expected SUSPICIOUS_TLD for .xyz");

        List<String> findingsTop = regexService.analyzeurl("https://secure-banking.top");
        assertTrue(findingsXyz.contains("SUSPICIOUS_TLD"),
                "Expected SUSPICIOUS_TLD for .top");
    }

    @Test
    @DisplayName("Should detect UserInfo / @-symbol URL confusion")
    void testAtSymbolConfusion() {
        List<String> findings = regexService.analyzeurl("http://google.com@attacker-site.net/login");
        assertTrue(findings.contains("AT_SYMBOL_IN_URL"),
                "Expected AT_SYMBOL_IN_URL");
    }

    @Test
    @DisplayName("Should detect excessive hyphens and excessive subdomains")
    void testExcessiveHyphensAndSubdomains() {
        List<String> findingsHyphens = regexService.analyzeurl("https://secure-account-verification-support.com");
        assertTrue(findingsHyphens.contains("EXCESSIVE_HYPHENS_IN_DOMAIN"),
                "Expected EXCESSIVE_HYPHENS_IN_DOMAIN for >= 3 hyphens");

        List<String> findingsSubdomains = regexService.analyzeurl("https://a.b.c.d.example.com");
        assertTrue(findingsSubdomains.contains("EXCESSIVE_SUBDOMAINS"),
                "Expected EXCESSIVE_SUBDOMAINS for >= 4 domain labels");
    }

    @Test
    @DisplayName("Should NOT flag confirmed legitimate domains as brand impersonation")
    void testLegitimateDomainsNotFlagged() {
        // Official Google
        List<String> findingsGoogle = regexService.analyzeurl("https://www.google.com");
        assertFalse(findingsGoogle.contains("BRAND_IMPERSONATION"));
        assertFalse(findingsGoogle.contains("TYPOSQUATTING_DETECTED"));
        assertEquals(0, regexService.calculateriskscore(findingsGoogle));

        // Official PayPal
        List<String> findingsPaypal = regexService.analyzeurl("https://www.paypal.com/signin");
        assertFalse(findingsPaypal.contains("BRAND_IMPERSONATION"));
        assertFalse(findingsPaypal.contains("TYPOSQUATTING_DETECTED"));

        // Legitimate word containing a brand name as substring (e.g. pineapple)
        List<String> findingsPineapple = regexService.analyzeurl("https://pineapple-farms.com/about");
        assertFalse(findingsPineapple.contains("BRAND_IMPERSONATION"),
                "pineapple-farms.com should not trigger Apple brand impersonation");

        // Normal 2-hyphen blog
        List<String> findingsBlog = regexService.analyzeurl("https://my-tech-blog.org/articles");
        assertFalse(findingsBlog.contains("EXCESSIVE_HYPHENS_IN_DOMAIN"),
                "2-hyphen domain should not trigger EXCESSIVE_HYPHENS_IN_DOMAIN");

        // GitHub repository
        List<String> findingsGithub = regexService.analyzeurl("https://github.com/torvalds/linux");
        assertTrue(findingsGithub.isEmpty(), "Expected no findings for standard github url");
    }

    @Test
    @DisplayName("Should automatically normalize and detect schemeless URLs e.g. paypal-fake.com")
    void testSchemelessUrls() {
        List<String> findings = regexService.analyzeurl("paypal-fake.com");
        assertTrue(findings.contains("BRAND_IMPERSONATION"),
                "Expected BRAND_IMPERSONATION for schemeless paypal-fake.com");
    }

    @Test
    @DisplayName("Should flag invalid URLs appropriately")
    void testInvalidUrls() {
        List<String> findingsEmpty = regexService.analyzeurl("");
        assertTrue(findingsEmpty.contains("INVALID_URL"));

        List<String> findingsFtp = regexService.analyzeurl("ftp://ftp.example.com");
        assertTrue(findingsFtp.contains("INVALID_URL"));
    }
}
