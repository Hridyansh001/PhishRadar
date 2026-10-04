package com.phishradar.phishradarbackend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Entity
@Getter
@Setter
@Table(name = "users")
public class users {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    @Column
    

}
