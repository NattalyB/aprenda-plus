package com.aprendaplus.repository;

import com.aprendaplus.entity.InscricaoPagamento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InscricaoPagamentoRepository extends JpaRepository<InscricaoPagamento, Integer> {

    // Partes do pagamento de uma inscrição, na ordem em que o aluno escolheu
    List<InscricaoPagamento> findByInscricaoIdOrderByOrdemAsc(Integer inscricaoId);
}
