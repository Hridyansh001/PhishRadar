package com.phishradar.phishradarbackend;

import com.phishradar.phishradarbackend.service.mldetectionservice;
import com.phishradar.phishradarbackend.service.regexdetectionservice;
import com.phishradar.phishradarbackend.service.urlfeatureextractor;

import java.util.Arrays;

public class mlmodeltest {

    public static void main(String[] args) throws Exception {
        var ml = new mldetectionservice();
        var regex = new regexdetectionservice();

        String[] urls = {
                "https://www.google.com",
                "https://www.paypal.com/signin",
                "https://paypal-fake.com",
                "https://paypa1.com",
                "http://192.168.1.1/login",
                "https://account-verify.xyz"
        };

        System.out.println("==================================================");
        System.out.println("           PHISHRADAR DETECTION PIPELINE TEST      ");
        System.out.println("==================================================");

        for (String url : urls) {
            var prediction = ml.predict(url);
            var findings = regex.analyzeurl(url);
            int regexScore = regex.calculateriskscore(findings);
            double[] features = urlfeatureextractor.extract(url);

            System.out.println("\nURL: " + url);
            System.out.println("  Features: " + Arrays.toString(features));
            System.out.println("  Regex Findings: " + findings);
            System.out.println("  Regex Score: " + regexScore);
            System.out.println("  ML Classification: " + prediction.classification());
            System.out.println("  ML Phishing Probability: " + prediction.phishingProbability() + "%");
        }
        System.out.println("\n==================================================");
    }
}
