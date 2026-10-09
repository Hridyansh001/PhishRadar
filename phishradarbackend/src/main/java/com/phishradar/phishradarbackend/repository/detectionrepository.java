
package com.phishradar.phishradarbackend.repository;

import com.phishradar.phishradarbackend.entities.detection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface detectionrepository
        extends JpaRepository<detection, Integer> {

    List<detection> findByUserid(Integer userid);

    List<detection> findByWid(Integer wid);

    List<detection> findByFresult(String fresult);
}
