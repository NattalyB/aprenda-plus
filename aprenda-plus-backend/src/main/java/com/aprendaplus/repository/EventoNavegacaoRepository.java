package com.aprendaplus.repository;

import com.aprendaplus.entity.EventoNavegacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface EventoNavegacaoRepository extends JpaRepository<EventoNavegacao, Long> {

    // Eventos de um período (o painel do Comercial soma tudo no service)
    List<EventoNavegacao> findByQuandoGreaterThanEqualAndQuandoLessThanOrderByQuandoAsc(LocalDateTime de,
                                                                                       LocalDateTime ate);
}
