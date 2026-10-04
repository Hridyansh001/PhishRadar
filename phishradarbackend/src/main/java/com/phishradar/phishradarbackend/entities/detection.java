package com.phishradar.phishradarbackend.entities;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import org.springframework.context.annotation.Proxyable;

import java.time.LocalDate;

@Entity
@AllArgsConstructor
@Getter
@Setter
@Table(name = "detection")
public class detection {

    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    @Column(name = "did")
    private Integer did;

    @Column(name = "userid")
    private Integer userid;

    @Column(name = "wid")
    private Integer wid;

    @Column(name = "detectedat")
    private LocalDate detectedat;

    @Column(name = "rresult")
    private String rresult;

    @Column(name = "mlresult")
    private String mlresult;

    @Column(name = "fresult")
    private String fresult;

    @Column(name = "riskscore")
    private double risckscore;

    @Column(name = "actiontaken")
    private String actiontaken;


}
