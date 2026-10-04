package com.phishradar.phishradarbackend.repository;

import com.phishradar.phishradarbackend.entities.users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface usersrepository extends JpaRepository<users, Integer> {

}
