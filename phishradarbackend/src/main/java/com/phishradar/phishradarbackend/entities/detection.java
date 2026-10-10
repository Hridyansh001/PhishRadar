package com.phishradar.phishradarbackend.entities;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.context.annotation.Proxyable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@AllArgsConstructor
@Getter
@Setter
@NoArgsConstructor
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
    private LocalDateTime detectedat;

    @Column(name = "rresult")
    private String rresult;

    @Column(name = "mlresult")
    private String mlresult;

    @Column(name = "fresult")
    private String fresult;

    @Column(name = "riskscore")
    private BigDecimal risckscore;

    @Column(name = "actiontaken")
    private String actiontaken;


}
