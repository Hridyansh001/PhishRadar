package com.phishradar.phishradarbackend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@AllArgsConstructor
@Entity
@Getter
@Setter
@Table(name ="website")
public class website {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    @Column(name = "wid")
    private Integer wid ;

    @Column(name = "url")
    private String url ;

    @Column(name = "domain")
    private String domain ;

    @Column(name = "ip")
    private String ip ;

    @Column(name = "protocol")
    private String protocol ;

    @Column(name = "firstseen")
    private LocalDateTime firstseen ;

    @Column(name = "lastchecked")
    private LocalDateTime lastchecked ;

}

