package com.aprendaplus.service;

import com.aprendaplus.dto.EventoForm;
import com.aprendaplus.entity.EventoNavegacao;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.CursoRepository;
import com.aprendaplus.repository.EventoNavegacaoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Locale;
import java.util.function.Supplier;
import java.util.regex.Pattern;

// Registra o que as pessoas fazem no site (buscas, cursos abertos, cursos postos no carrinho).
// A rota é pública, então tudo que chega é conferido: tipo, código de sessão, curso e tamanho do termo.
@Service
public class EventoService {

    static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    // UUID gerado pelo navegador (crypto.randomUUID): 8-4-4-4-12 caracteres hexadecimais
    private static final Pattern SESSAO =
            Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
    static final int TAMANHO_MAXIMO_TERMO = 100;
    private static final int RESULTADOS_MAXIMOS = 10000;

    @Autowired
    private EventoNavegacaoRepository eventoRepository;

    @Autowired
    private CursoRepository cursoRepository;

    // Relógio trocável nos testes
    Supplier<LocalDateTime> relogio = () -> LocalDateTime.now(FUSO);

    // idAluno: quem está logado como aluno (null para visitante)
    public void registrar(EventoForm form, Integer idAluno) {
        if (form == null) {
            throw new RegraDeNegocioException("Evento inválido.");
        }
        String tipo = form.tipo() == null ? "" : form.tipo().trim().toUpperCase(Locale.ROOT);
        String sessao = form.sessao() == null ? "" : form.sessao().trim().toLowerCase(Locale.ROOT);
        if (!SESSAO.matcher(sessao).matches()) {
            throw new RegraDeNegocioException("Sessão inválida.");
        }

        Integer idCurso = null;
        String termo = null;
        Integer resultados = null;

        switch (tipo) {
            case EventoNavegacao.BUSCA -> {
                termo = limparTermo(form.termo());
                if (termo.length() < 2) {
                    throw new RegraDeNegocioException("A busca precisa ter pelo menos 2 letras.");
                }
                if (form.resultados() != null) {
                    resultados = Math.max(0, Math.min(form.resultados(), RESULTADOS_MAXIMOS));
                }
            }
            case EventoNavegacao.VISUALIZACAO, EventoNavegacao.CARRINHO -> {
                idCurso = form.idCurso();
                if (idCurso == null || !cursoRepository.existsById(idCurso)) {
                    throw new RegraDeNegocioException("Curso não encontrado.");
                }
            }
            default -> throw new RegraDeNegocioException("Tipo de evento inválido.");
        }

        eventoRepository.save(new EventoNavegacao(relogio.get(), tipo, sessao, idAluno, idCurso, termo, resultados));
    }

    // "  Ciência   de dados " -> "Ciência de dados" (no máximo 100 caracteres)
    static String limparTermo(String termo) {
        if (termo == null) {
            return "";
        }
        String limpo = termo.replaceAll("\\s+", " ").trim();
        return limpo.length() > TAMANHO_MAXIMO_TERMO ? limpo.substring(0, TAMANHO_MAXIMO_TERMO).trim() : limpo;
    }
}
