package com.aprendaplus.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.aprendaplus.entity.Curso;

@Repository
public interface CursoRepository extends JpaRepository<Curso, Integer> {
}