package com.aprendaplus.repository;

import com.aprendaplus.entity.RegistroAtividade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RegistroAtividadeRepository extends JpaRepository<RegistroAtividade, Long> {

    // Filtros: texto vazio = sem filtro; o período sempre vem preenchido (o service usa datas-limite).
    // Nunca vai null para o banco, o que evita erro de tipo de parâmetro no PostgreSQL.
    String FILTROS = " WHERE (:modulo = '' OR modulo = :modulo)"
            + " AND (:tipo = '' OR usuario_tipo = :tipo)"
            + " AND (:acao = '' OR acao = :acao)"
            + " AND (:busca = '' OR usuario_nome ILIKE CONCAT('%', :busca, '%') OR descricao ILIKE CONCAT('%', :busca, '%'))"
            + " AND quando >= :de AND quando < :ate";

    @Query(value = "SELECT * FROM registro_atividade" + FILTROS
            + " ORDER BY quando DESC, id DESC LIMIT :limite OFFSET :inicio", nativeQuery = true)
    List<RegistroAtividade> buscar(@Param("modulo") String modulo, @Param("tipo") String tipo,
                                   @Param("acao") String acao, @Param("busca") String busca,
                                   @Param("de") LocalDateTime de, @Param("ate") LocalDateTime ate,
                                   @Param("limite") int limite, @Param("inicio") int inicio);

    @Query(value = "SELECT COUNT(*) FROM registro_atividade" + FILTROS, nativeQuery = true)
    long contar(@Param("modulo") String modulo, @Param("tipo") String tipo,
                @Param("acao") String acao, @Param("busca") String busca,
                @Param("de") LocalDateTime de, @Param("ate") LocalDateTime ate);

    // Última coisa feita num registro (ex.: aluno #12)
    Optional<RegistroAtividade> findFirstByAlvoAndRegistroIdOrderByQuandoDescIdRegistroDesc(String alvo, Integer registroId);

    // Quem cadastrou o registro
    Optional<RegistroAtividade> findFirstByAlvoAndRegistroIdAndAcaoOrderByQuandoAscIdRegistroAsc(
            String alvo, Integer registroId, String acao);
}
