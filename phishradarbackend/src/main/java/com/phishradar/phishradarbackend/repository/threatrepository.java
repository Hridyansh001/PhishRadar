
package com.phishradar.phishradarbackend.repository;

import com.phishradar.phishradarbackend.entities.threat;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface threatrepository
        extends JpaRepository<threat, Integer> {

    List<threat> findByWid(Integer wid);

    List<threat> findByThreattype(String threattype);

    List<threat> findBySeverity(String severity);

    List<threat> findByStatus(String status);
}
