package com.phishradar.phishradarbackend.service;


import com.phishradar.phishradarbackend.entities.users;
import com.phishradar.phishradarbackend.repository.usersrepository;
import org.springframework.stereotype.Service;

@Service
public class usersservice {

    private final usersrepository usersrepository;
    public usersservice(usersrepository usersrepository)
    {
        this.usersrepository = usersrepository;
    }

    public users updateuser(users updateuser, Integer userid)
    {

    }



}
