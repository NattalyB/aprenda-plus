package com.aprendaplus.repository;

import com.aprendaplus.entity.NivelAcesso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NivelAcessoRepository extends JpaRepository<NivelAcesso, Integer> {

    // Master primeiro, depois os outros em ordem alfabética
    List<NivelAcesso> findAllByOrderByMasterDescNomeAsc();

    Optional<NivelAcesso> findFirstByNomeIgnoreCase(String nome);
}
