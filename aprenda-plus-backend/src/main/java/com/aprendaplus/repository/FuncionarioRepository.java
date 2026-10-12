package com.aprendaplus.repository;

import com.aprendaplus.entity.Funcionario;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FuncionarioRepository extends JpaRepository<Funcionario, Integer> {
    Funcionario findByEmail(String email);

    // Quantos funcionários usam um nível de acesso (para não excluir nível em uso)
    long countByNivel_IdNivel(Integer idNivel);
}