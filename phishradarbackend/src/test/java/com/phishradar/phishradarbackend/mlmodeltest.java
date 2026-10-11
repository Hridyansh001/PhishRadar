
package com.phishradar.phishradarbackend;

import com.phishradar.phishradarbackend.service.mldetectionservice;

public class mlmodeltest {



    public static void main(String[] args) throws Exception {
        var ml =
                new com.phishradar.phishradarbackend.service.mldetectionservice();

        String[] urls = {
                "https://www.google.com",
                "https://www.wikipedia.org",
                "http://192.168.1.1/login"
        };

        for (String url : urls) {
            var prediction = ml.predict(url);

            System.out.println("\nURL: " + url);
            System.out.println("Classification: "
                    + prediction.classification());
            System.out.println("Phishing probability: "
                    + prediction.phishingProbability() + "%");
        }
    }


}
