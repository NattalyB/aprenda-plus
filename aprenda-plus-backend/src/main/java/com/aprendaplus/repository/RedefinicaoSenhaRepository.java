package com.aprendaplus.repository;

import com.aprendaplus.entity.RedefinicaoSenha;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RedefinicaoSenhaRepository extends JpaRepository<RedefinicaoSenha, Integer> {

    Optional<RedefinicaoSenha> findFirstByTokenHash(String tokenHash);

    // Links ainda não usados de uma pessoa (para invalidar quando ela pede outro)
    List<RedefinicaoSenha> findByTipoAndUsuarioIdAndUsadoEmIsNull(String tipo, Integer usuarioId);
}
