package com.phishradar.phishradarbackend.entities;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@AllArgsConstructor
@Getter
@Setter
@NoArgsConstructor
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
    private LocalDateTime detectedat;

}
