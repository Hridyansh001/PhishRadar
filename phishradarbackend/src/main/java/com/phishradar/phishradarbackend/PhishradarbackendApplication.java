package com.phishradar.phishradarbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PhishradarbackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(PhishradarbackendApplication.class, args);
    }

}
