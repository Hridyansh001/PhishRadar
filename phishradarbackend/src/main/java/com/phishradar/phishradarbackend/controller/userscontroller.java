package com.phishradar.phishradarbackend.controller;

import com.phishradar.phishradarbackend.entities.users;
import com.phishradar.phishradarbackend.service.usersservice;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping({"/api/users", "/api/auth"})
public class userscontroller {

    private final usersservice usersservice;

    public userscontroller(usersservice usersservice) {
        this.usersservice = usersservice;
    }

    @PostMapping({"/register", "/signup"})
    public ResponseEntity<?> register(@RequestBody Map<String, Object> request) {
        try {
            String uname = request.get("uname") != null ? request.get("uname").toString() : null;
            String email = request.get("email") != null ? request.get("email").toString() : null;
            String password = request.get("password") != null ? request.get("password").toString() : null;

            users created = usersservice.register(uname, email, password);
            return ResponseEntity.status(HttpStatus.CREATED).body(toUserMap(created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Registration error: " + e.getMessage()));
        }
    }

    @PostMapping({"/login", "/signin"})
    public ResponseEntity<?> login(@RequestBody Map<String, Object> request) {
        try {
            String email = request.get("email") != null ? request.get("email").toString() : null;
            String password = request.get("password") != null ? request.get("password").toString() : null;

            users authenticated = usersservice.authenticate(email, password);
            return ResponseEntity.ok(toUserMap(authenticated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Login error: " + e.getMessage()));
        }
    }

    @GetMapping({"/{id}", "/user/{id}"})
    public ResponseEntity<?> getUserById(@PathVariable Integer id) {
        return usersservice.findById(id)
                .map(u -> ResponseEntity.ok(toUserMap(u)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "User not found")));
    }

    private Map<String, Object> toUserMap(users user) {
        Map<String, Object> map = new HashMap<>();
        map.put("userid", user.getUserid());
        map.put("uname", user.getUname());
        map.put("email", user.getEmail());
        map.put("ustatus", user.getUstatus());
        map.put("createdat", user.getCreatedat() != null ? user.getCreatedat().toString() : null);
        return map;
    }
}
