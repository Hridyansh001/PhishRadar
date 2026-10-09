package com.phishradar.phishradarbackend.repository;

import com.phishradar.phishradarbackend.entities.website;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface websiterepository extends JpaRepository<website, Integer> {
    Optional<website> findByUrl(String url);

    Optional<website> findByDomain(String domain);
}
