package com.phishradar.phishradarbackend.controller;


import com.phishradar.phishradarbackend.service.detectionservice;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/detect")
public class detectioncontroller {

    private final detectionservice detectionservice;

    public detectioncontroller(detectionservice detectionservice)
    {
        this.detectionservice=detectionservice;
    }
    @PostMapping
    ResponseEntity<?> detecturl(@RequestBody Map<String, Object> request) {
        try {
            String url = request.get("url") != null ? request.get("url").toString() : null;
            Integer userid = 1;
            if (request.get("userid") != null) {
                try {
                    userid = Integer.valueOf(request.get("userid").toString());
                } catch (NumberFormatException ignored) {}
            }
            Map<String, Object> result = detectionservice.analyzeurl(url, userid);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
