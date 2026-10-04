package com.phishradar.phishradarbackend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Entity
@Getter
@Setter
@Table(name = "mlmodel")
public class mlmodel {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    @Column(name = "mid")
    private Integer mid ;

    @Column(name = "mname")
    private String mname ;

    @Column(name = "algo")
    private String algo;

    @Column(name = "version")
    private String version;

    @Column(name = "accuracy")
    private Double accuracy;

    @Column(name = "status")
    private String status;



}
