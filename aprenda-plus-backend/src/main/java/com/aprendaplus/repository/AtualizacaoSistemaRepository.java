package com.aprendaplus.repository;

import com.aprendaplus.entity.AtualizacaoSistema;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AtualizacaoSistemaRepository extends JpaRepository<AtualizacaoSistema, Integer> {

    List<AtualizacaoSistema> findAllByOrderByPublicadoEmDescIdAtualizacaoDesc();

    // Manutenções que ainda não terminaram (programadas ou em andamento)
    List<AtualizacaoSistema> findByTipoAndFimManutencaoAfterOrderByInicioManutencaoAsc(String tipo, LocalDateTime agora);
}
