package com.phishradar.phishradarbackend.repository;

import com.phishradar.phishradarbackend.entities.threat;
import org.springframework.data.jpa.repository.JpaRepository;

public interface threatrepository extends JpaRepository<threat,Integer> {
}
