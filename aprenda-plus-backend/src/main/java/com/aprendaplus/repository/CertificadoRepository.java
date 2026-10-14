package com.aprendaplus.repository;

import com.aprendaplus.entity.Certificado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CertificadoRepository extends JpaRepository<Certificado, Integer> {

    Optional<Certificado> findFirstByAluno_IdAlunoAndTurma_IdTurma(Integer idAluno, Integer idTurma);

    Optional<Certificado> findFirstByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

    List<Certificado> findByTurma_IdTurma(Integer idTurma);

    List<Certificado> findByAluno_IdAluno(Integer idAluno);
}
