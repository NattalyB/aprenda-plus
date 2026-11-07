package com.aprendaplus.repository;

import com.aprendaplus.entity.ChamadoMensagem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChamadoMensagemRepository extends JpaRepository<ChamadoMensagem, Integer> {

    List<ChamadoMensagem> findByChamadoIdOrderByCriadoEmAscIdMensagemAsc(Integer chamadoId);
}
