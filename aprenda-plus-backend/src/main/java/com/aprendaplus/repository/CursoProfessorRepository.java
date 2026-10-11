package com.aprendaplus.repository;

import com.aprendaplus.entity.CursoProfessor;
import com.aprendaplus.entity.CursoProfessorId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CursoProfessorRepository extends JpaRepository<CursoProfessor, CursoProfessorId> {

    // Todos os cursos em que um professor leciona (busca pelo professorId da chave composta)
    List<CursoProfessor> findByIdProfessorId(Integer professorId);
}
