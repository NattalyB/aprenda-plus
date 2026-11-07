package com.aprendaplus.repository;

import com.aprendaplus.entity.Chamado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChamadoRepository extends JpaRepository<Chamado, Integer> {

    List<Chamado> findAllByOrderByAtualizadoEmDesc();

    List<Chamado> findByFuncionarioIdOrderByAtualizadoEmDesc(Integer funcionarioId);

    List<Chamado> findByProfessorIdOrderByAtualizadoEmDesc(Integer professorId);
}
