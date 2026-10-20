package com.aprendaplus.repository;

import com.aprendaplus.entity.Pagamento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface PagamentoRepository extends JpaRepository<Pagamento, Integer> {

    // Parcelas de uma matrícula, em ordem
    List<Pagamento> findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(Integer idMatricula);

    // Parcelas de um aluno (área "Minhas inscrições")
    List<Pagamento> findByMatricula_Aluno_IdAlunoOrderByDataVencimentoAsc(Integer idAluno);

    // Parcelas com um status e vencimento antes de uma data (para marcar as atrasadas)
    List<Pagamento> findByStatusAndDataVencimentoBefore(String status, LocalDate data);

    // Parcelas em aberto que já chegaram no vencimento (para dar baixa automática no cartão)
    List<Pagamento> findByStatusInAndDataVencimentoLessThanEqual(Collection<String> status, LocalDate data);
}
