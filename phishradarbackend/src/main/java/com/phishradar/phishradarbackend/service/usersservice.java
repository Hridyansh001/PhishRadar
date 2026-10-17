package com.phishradar.phishradarbackend.service;

import com.phishradar.phishradarbackend.entities.users;
import com.phishradar.phishradarbackend.repository.usersrepository;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class usersservice {

    private final usersrepository usersrepository;
    public usersservice(usersrepository usersrepository)
    {
        this.usersrepository = usersrepository;
    }

    public users updateuser(users updateuser, Integer userid)
    {
        users existing = usersrepository.findById(userid)
                .orElseThrow(() -> new IllegalArgumentException("user not found"));
        if (updateuser.getUname() != null) existing.setUname(updateuser.getUname());
        if (updateuser.getEmail() != null) existing.setEmail(updateuser.getEmail());
        if (updateuser.getPassword() != null) existing.setPassword(hashPassword(updateuser.getPassword()));
        if (updateuser.getUstatus() != null) existing.setUstatus(updateuser.getUstatus());
        return usersrepository.save(existing);
    }

    public users register(String uname, String email, String rawPassword) {
        if (uname == null || uname.trim().isEmpty()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (email == null || email.trim().isEmpty() || !email.contains("@")) {
            throw new IllegalArgumentException("A valid email address is required");
        }
        if (rawPassword == null || rawPassword.trim().length() < 4) {
            throw new IllegalArgumentException("Password must be at least 4 characters long");
        }

        String normalizedEmail = email.trim().toLowerCase();
        Optional<users> existing = usersrepository.findByEmail(normalizedEmail);
        if (existing.isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists");
        }

        users newUser = new users();
        newUser.setUname(uname.trim());
        newUser.setEmail(normalizedEmail);
        newUser.setPassword(hashPassword(rawPassword.trim()));
        newUser.setUstatus("active");
        newUser.setCreatedat(LocalDateTime.now());

        return usersrepository.save(newUser);
    }

    public users authenticate(String email, String rawPassword) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (rawPassword == null || rawPassword.trim().isEmpty()) {
            throw new IllegalArgumentException("Password is required");
        }

        String normalizedEmail = email.trim().toLowerCase();
        users user = usersrepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!verifyPassword(rawPassword.trim(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        if (user.getUstatus() != null && "suspended".equalsIgnoreCase(user.getUstatus())) {
            throw new IllegalArgumentException("Account is suspended");
        }

        return user;
    }

    public Optional<users> findById(Integer userid) {
        if (userid == null) return Optional.empty();
        return usersrepository.findById(userid);
    }

    public static String hashPassword(String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 unavailable", e);
        }
    }

    public static boolean verifyPassword(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null) {
            return false;
        }
        String hashed = hashPassword(rawPassword);
        if (hashed.equalsIgnoreCase(storedPassword)) {
            return true;
        }
        // Support plaintext match for existing users
        return storedPassword.equals(rawPassword);
    }
}
