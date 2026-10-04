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
@Table(name = "users")
public class users {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    @Column(name = "userid")
    private Integer userid ;

    @Column(name = "uname")
    private String uname;

    @Column(name = "email")
    private String email;

    @Column(name = "upassword")
    private String password;

    @Column(name = "ustatus")
    private String ustatus;

    @Column(name = "createdat")
    private LocalDateTime createdat;

}
