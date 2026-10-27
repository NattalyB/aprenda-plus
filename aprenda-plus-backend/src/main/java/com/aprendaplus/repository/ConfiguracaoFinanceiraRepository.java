package com.aprendaplus.repository;

import com.aprendaplus.entity.ConfiguracaoFinanceira;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfiguracaoFinanceiraRepository extends JpaRepository<ConfiguracaoFinanceira, Integer> {
}
