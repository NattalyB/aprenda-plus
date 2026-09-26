package com.aprendaplus.repository;

import com.aprendaplus.entity.CursoProfessor;
import com.aprendaplus.entity.CursoProfessorId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CursoProfessorRepository extends JpaRepository<CursoProfessor, CursoProfessorId> {
}