package com.aprendaplus.repository;

import com.aprendaplus.dto.DocumentoResumo;
import com.aprendaplus.entity.DocumentoAluno;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocumentoAlunoRepository extends JpaRepository<DocumentoAluno, Integer> {

    // Documentos de um aluno, o mais novo primeiro, sem carregar os arquivos
    @Query("select new com.aprendaplus.dto.DocumentoResumo(d.idDocumento, d.aluno.idAluno, d.nomeArquivo, d.contentType,"
            + " d.tamanho, d.status, d.observacao, d.enviadoEm, d.revisadoEm)"
            + " from DocumentoAluno d where d.aluno.idAluno = :idAluno order by d.idDocumento desc")
    List<DocumentoResumo> resumosDoAluno(@Param("idAluno") Integer idAluno);

    // Todos os documentos, sem os arquivos (o painel monta a situação de cada aluno)
    @Query("select new com.aprendaplus.dto.DocumentoResumo(d.idDocumento, d.aluno.idAluno, d.nomeArquivo, d.contentType,"
            + " d.tamanho, d.status, d.observacao, d.enviadoEm, d.revisadoEm)"
            + " from DocumentoAluno d order by d.idDocumento desc")
    List<DocumentoResumo> todosOsResumos();

    boolean existsByAluno_IdAlunoAndStatus(Integer idAluno, String status);
}
