package com.aprendaplus.repository;

import com.aprendaplus.entity.TurmaProfessor;
import com.aprendaplus.entity.TurmaProfessorId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TurmaProfessorRepository extends JpaRepository<TurmaProfessor, TurmaProfessorId> {
}