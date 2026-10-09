
package com.phishradar.phishradarbackend.repository;

import com.phishradar.phishradarbackend.entities.mlmodel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface mlmodelrepository
        extends JpaRepository<mlmodel, Integer> {

    List<mlmodel> findByStatus(String status);

    List<mlmodel> findByAlgo(String algo);
}
