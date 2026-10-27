package com.aprendaplus.service;

import com.aprendaplus.dto.PaginaAtividades;
import com.aprendaplus.dto.UltimaAlteracao;
import com.aprendaplus.entity.RegistroAtividade;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.ProfessorRepository;
import com.aprendaplus.repository.RegistroAtividadeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.function.Supplier;

// Histórico de alterações: grava quem cadastrou/alterou/excluiu o quê, e quando.
// A gravação nunca derruba a operação do usuário: se falhar, só fica no log do servidor.
@Service
public class AtividadeService {

    private static final Logger LOG = LoggerFactory.getLogger(AtividadeService.class);
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    static final int TAMANHO_MAXIMO_PAGINA = 100;
    // Período usado quando a pessoa não escolhe datas
    static final LocalDateTime INICIO_DOS_TEMPOS = LocalDateTime.of(2000, 1, 1, 0, 0);
    static final LocalDateTime FIM_DOS_TEMPOS = LocalDateTime.of(3000, 1, 1, 0, 0);

    @Autowired
    private RegistroAtividadeRepository registroRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    @Autowired
    private AlunoRepository alunoRepository;

    @Autowired
    private ProfessorRepository professorRepository;

    Supplier<LocalDateTime> relogio = () -> LocalDateTime.now(FUSO);

    // Chamado pelo AtividadeInterceptor depois de cada requisição que deu certo
    public void registrar(String metodo, String caminho, String query, Integer usuarioId, String papel, Object resposta) {
        try {
            String tipo = switch (papel == null ? "" : papel) {
                case "ADMIN" -> "funcionario";
                case "ALUNO" -> "aluno";
                case "PROFESSOR" -> "professor";
                default -> "visitante";
            };
            AtividadeTexto.Descricao d = AtividadeTexto.descrever(metodo, caminho, query, tipo);
            if (d == null) {
                return;
            }

            Integer registroId = d.registroId();
            String texto = d.texto();
            if (d.idDaResposta()) {
                registroId = AtividadeTexto.idDaResposta(resposta, d.alvo());
                if (registroId != null) texto += " #" + registroId;
            }

            RegistroAtividade r = new RegistroAtividade();
            r.setQuando(relogio.get());
            r.setUsuarioTipo(tipo);
            r.setUsuarioId(usuarioId);
            r.setUsuarioNome(nomeDoUsuario(tipo, usuarioId, resposta));
            if ("visitante".equals(tipo) && "alunos".equals(d.alvo()) && registroId != null) {
                // Quem se cadastrou pelo site vira o próprio aluno no histórico
                r.setUsuarioTipo("aluno");
                r.setUsuarioId(registroId);
            }
            r.setModulo(cortar(d.modulo(), 40));
            r.setAcao(d.acao());
            r.setDescricao(cortar(texto, 300));
            r.setAlvo(d.alvo());
            r.setRegistroId(registroId);
            r.setMetodo(metodo);
            r.setCaminho(cortar(caminho, 200));
            registroRepository.save(r);
        } catch (RuntimeException e) {
            LOG.warn("Não foi possível gravar o histórico de {} {}: {}", metodo, caminho, e.getMessage());
        }
    }

    String nomeDoUsuario(String tipo, Integer usuarioId, Object resposta) {
        if ("funcionario".equals(tipo) && usuarioId != null) {
            return funcionarioRepository.findById(usuarioId).map(f -> f.getNomeCompleto()).orElse("Funcionário #" + usuarioId);
        }
        if ("professor".equals(tipo) && usuarioId != null) {
            return professorRepository.findById(usuarioId).map(p -> p.getNomeCompleto()).orElse("Professor #" + usuarioId);
        }
        if ("aluno".equals(tipo) && usuarioId != null) {
            return alunoRepository.findById(usuarioId).map(a -> a.getNomeCompleto()).orElse("Aluno #" + usuarioId);
        }
        String nomeNovo = nomeNaResposta(resposta);
        return nomeNovo != null ? nomeNovo : "Visitante do site";
    }

    // Cadastro pelo site: o nome vem do aluno que acabou de ser criado
    static String nomeNaResposta(Object resposta) {
        if (resposta == null) return null;
        try {
            Method m = resposta.getClass().getMethod("getNomeCompleto");
            Object nome = m.invoke(resposta);
            return nome instanceof String s && !s.isBlank() ? s : null;
        } catch (ReflectiveOperationException | RuntimeException e) {
            return null;
        }
    }

    // ===== Consultas =====

    public PaginaAtividades buscar(String modulo, String tipo, String acao, String busca,
                                   LocalDate de, LocalDate ate, int pagina, int tamanho) {
        int tam = Math.max(1, Math.min(tamanho, TAMANHO_MAXIMO_PAGINA));
        int pag = Math.max(1, pagina);
        LocalDateTime inicio = de == null ? INICIO_DOS_TEMPOS : de.atStartOfDay();
        LocalDateTime fim = ate == null ? FIM_DOS_TEMPOS : ate.plusDays(1).atStartOfDay();
        String m = limpo(modulo), t = limpo(tipo), a = limpo(acao), b = limpo(busca);

        long total = registroRepository.contar(m, t, a, b, inicio, fim);
        List<RegistroAtividade> itens = total == 0 ? List.of()
                : registroRepository.buscar(m, t, a, b, inicio, fim, tam, (pag - 1) * tam);
        int totalPaginas = (int) Math.max(1, (total + tam - 1) / tam);
        return new PaginaAtividades(itens, total, pag, tam, totalPaginas);
    }

    public UltimaAlteracao ultima(String alvo, Integer registroId) {
        if (alvo == null || alvo.isBlank() || registroId == null) {
            return new UltimaAlteracao(null, null, null, null, null);
        }
        var criado = registroRepository.findFirstByAlvoAndRegistroIdAndAcaoOrderByQuandoAscIdRegistroAsc(
                alvo, registroId, AtividadeTexto.CADASTROU).orElse(null);
        var ultimo = registroRepository.findFirstByAlvoAndRegistroIdOrderByQuandoDescIdRegistroDesc(alvo, registroId)
                .orElse(null);
        boolean soCadastro = ultimo != null && criado != null && ultimo.getIdRegistro().equals(criado.getIdRegistro());
        return new UltimaAlteracao(
                criado == null ? null : criado.getUsuarioNome(), criado == null ? null : criado.getQuando(),
                ultimo == null || soCadastro ? null : ultimo.getUsuarioNome(),
                ultimo == null || soCadastro ? null : ultimo.getQuando(),
                ultimo == null ? null : ultimo.getDescricao());
    }

    // Sem filtro de texto = "" (nunca null)
    private static String limpo(String valor) {
        return valor == null ? "" : valor.trim();
    }

    private static String cortar(String valor, int limite) {
        if (valor == null) return null;
        return valor.length() <= limite ? valor : valor.substring(0, limite);
    }
}
