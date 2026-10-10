package com.phishradar.phishradarbackend.service;


import com.phishradar.phishradarbackend.entities.detection;
import com.phishradar.phishradarbackend.entities.users;
import com.phishradar.phishradarbackend.entities.website;
import com.phishradar.phishradarbackend.repository.detectionrepository;
import com.phishradar.phishradarbackend.repository.usersrepository;
import com.phishradar.phishradarbackend.repository.websiterepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class detectionservice {
    private final regexdetectionservice regexdetectionservice;
    private final usersrepository usersrepository;
    private final websiterepository websiterepository;
    private final detectionrepository detectionrepository;

    public detectionservice(regexdetectionservice regexdetectionservice, usersrepository usersrepository, websiterepository websiterepository, detectionrepository detectionrepository)
    {
        this.regexdetectionservice=regexdetectionservice;
        this.usersrepository=usersrepository;
        this.websiterepository=websiterepository;
        this.detectionrepository=detectionrepository;
    }

    @Transactional
    public Map<String, Object> analyzeurl(String url, Integer userid)
    {
        if(url==null||url.isEmpty())
            throw new IllegalArgumentException("url cant be emtpy");
        users user = usersrepository.findById(userid).orElseThrow(()->new IllegalArgumentException("user not found"));

        List<String> findings  = regexdetectionservice.analyzeurl(url);

        if(findings.contains("INVALID_URL"))
        {
            throw new IllegalArgumentException("url is invalid");
        }
        int riskscore = regexdetectionservice.calculateriskscore(findings);

        String finalresult = riskscore >= 40 ? "SUSPICIOUS" : "SAFE";

        String regexresult = findings.isEmpty() ? "PASS" : "SUSPICIOUS";

        String mlresult = "NA";


        String actiontaken = finalresult.equals("SUSPICIOUS") ? "WARNING" : "ALLOWED";
        URI uri = URI.create(url.trim());
        String domain = uri.getHost();

        if(domain==null || domain.isBlank())
        {
            throw new IllegalArgumentException("url cant be empty");
        }

        String protocol = uri.getScheme();

        website site = websiterepository.findByUrl(url).orElseGet(()->
        {
            website newsite = new website();

            newsite.setUrl(url);
            newsite.setDomain(domain);
            newsite.setProtocol(protocol);
            newsite.setIp(null);
            newsite.setFirstseen(LocalDateTime.now());
            newsite.setLastchecked(LocalDateTime.now());
            return websiterepository.save(newsite);
        });

        site.setLastchecked(LocalDateTime.now());
        site = websiterepository.save(site);

        detection result = new detection();

        result.setUserid(user.getUserid());
        result.setWid(site.getWid());
        result.setDetectedat(LocalDateTime.now());
        result.setRresult(regexresult);
        result.setMlresult(mlresult);
        result.setFresult(finalresult);
        result.setRisckscore(BigDecimal.valueOf(riskscore));
        result.setActiontaken(actiontaken);

        detectionrepository.save(result);

        Map<String , Object> response = new HashMap<>();

        response.put("url",url);
        response.put("domain",domain);
        response.put("regexresult",regexresult);
        response.put("mlresult",mlresult);
        response.put("finalresult",finalresult);
        response.put("risckscore",riskscore);
        response.put("actiontaken",actiontaken);
        response.put("findings",findings);

        return response;
    }

}
