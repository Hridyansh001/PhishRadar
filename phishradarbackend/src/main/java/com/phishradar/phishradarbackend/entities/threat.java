package com.phishradar.phishradarbackend.entities;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@AllArgsConstructor
@Getter
@Setter
@Table(name = "threat")
public class threat {

    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    @Column(name = "tid")
    private Integer tid;

    @Column(name = "wid")
    private Integer wid;

    @Column(name = "threattype")
    private String threattype;

    @Column(name = "severity")
    private String severity;

    @Column(name = "status")
    private String status;

    @Column(name = "description")
    private String description;

    @Column(name = "detectedat")
    private LocalDate detectedat;

}
