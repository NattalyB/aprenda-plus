package com.aprendaplus.service;

import com.aprendaplus.entity.Chamado;
import com.aprendaplus.entity.ChamadoMensagem;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.ChamadoMensagemRepository;
import com.aprendaplus.repository.ChamadoRepository;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.ProfessorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

// Chamados de suporte: funcionários do painel e professores abrem quando têm algum problema com o sistema;
// quem tem o módulo "Chamados" (o Master sempre tem) atende pelo painel.
//
// Situações: aberto -> em atendimento -> resolvido -> fechado.
// - A primeira resposta do suporte passa o chamado de "aberto" para "em atendimento".
// - Se quem abriu responde um chamado resolvido, ele volta para "aberto" (o problema continua).
// - Fechado é o fim: só o suporte reabre (mudando a situação).
@Service
public class ChamadoService {

    public static final String ABERTO = "aberto";
    public static final String EM_ATENDIMENTO = "em_atendimento";
    public static final String RESOLVIDO = "resolvido";
    public static final String FECHADO = "fechado";

    public static final String FUNCIONARIO = "funcionario";
    public static final String PROFESSOR = "professor";
    public static final String SOLICITANTE = "solicitante";
    public static final String SUPORTE = "suporte";

    public static final Set<String> CATEGORIAS = Set.of("erro", "acesso", "duvida", "sugestao", "outro");
    public static final Set<String> PRIORIDADES = Set.of("baixa", "media", "alta", "urgente");
    public static final Set<String> SITUACOES = Set.of(ABERTO, EM_ATENDIMENTO, RESOLVIDO, FECHADO);
    public static final int TAMANHO_MAXIMO_ANEXO = 5 * 1024 * 1024;
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    private static final Map<String, String> NOME_DA_SITUACAO = Map.of(
            ABERTO, "Aberto", EM_ATENDIMENTO, "Em atendimento", RESOLVIDO, "Resolvido", FECHADO, "Fechado");

    @Autowired
    private ChamadoRepository chamadoRepository;

    @Autowired
    private ChamadoMensagemRepository mensagemRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private EmailService emailService;

    // Quem está usando: funcionário do painel ou professor
    public record Solicitante(String tipo, Integer id) {
        public static Solicitante funcionario(Integer id) { return new Solicitante(FUNCIONARIO, id); }
        public static Solicitante professor(Integer id) { return new Solicitante(PROFESSOR, id); }
    }

    // Anexo opcional de uma mensagem (print ou PDF)
    public record Anexo(String nome, byte[] conteudo) {
        boolean vazio() { return conteudo == null || conteudo.length == 0; }
    }

    public record NovoChamado(String assunto, String categoria, String prioridade, String descricao, String tela) {
    }

    // Alteração feita pelo suporte (campos nulos ficam como estão; responsavelId = 0 tira o responsável)
    public record Atendimento(String status, String prioridade, Integer responsavelId) {
    }

    public record MensagemDto(Integer idMensagem, String autorTipo, String autorNome, String texto,
                              String anexoNome, String anexoTipo, Integer anexoTamanho, LocalDateTime criadoEm) {
    }

    public record ChamadoDto(Integer idChamado, String assunto, String categoria, String prioridade, String status,
                             String tela, String tipoSolicitante, String nomeSolicitante, String emailSolicitante,
                             Integer responsavelId, String responsavelNome, String ultimaMensagemDe,
                             LocalDateTime criadoEm, LocalDateTime atualizadoEm, LocalDateTime resolvidoEm,
                             List<MensagemDto> mensagens) {
    }

    // ===================== Quem abriu =====================

    public List<ChamadoDto> meus(Solicitante quem) {
        validar(quem);
        List<Chamado> lista = FUNCIONARIO.equals(quem.tipo())
                ? chamadoRepository.findByFuncionarioIdOrderByAtualizadoEmDesc(quem.id())
                : chamadoRepository.findByProfessorIdOrderByAtualizadoEmDesc(quem.id());
        return resumos(lista);
    }

    public ChamadoDto meu(Solicitante quem, Integer idChamado) {
        return detalhe(doSolicitante(quem, idChamado));
    }

    @Transactional
    public ChamadoDto abrir(Solicitante quem, NovoChamado dados, Anexo anexo) {
        validar(quem);
        if (dados == null) {
            throw new RegraDeNegocioException("Informe os dados do chamado.");
        }
        String assunto = obrigatorio(dados.assunto(), "Informe o assunto do chamado.");
        if (assunto.length() > 150) {
            throw new RegraDeNegocioException("O assunto pode ter no máximo 150 caracteres.");
        }
        String descricao = textoDaMensagem(dados.descricao(), "Descreva o problema.");
        String categoria = escolha(dados.categoria(), CATEGORIAS, "erro", "Categoria inválida.");
        String prioridade = escolha(dados.prioridade(), PRIORIDADES, "media", "Prioridade inválida.");
        tipoDoAnexo(anexo);
        String tela = limpar(dados.tela());
        if (tela != null && tela.length() > 200) {
            tela = tela.substring(0, 200);
        }

        Pessoa pessoa = pessoa(quem);
        LocalDateTime agora = agora();
        Chamado chamado = new Chamado();
        chamado.setAssunto(assunto);
        chamado.setCategoria(categoria);
        chamado.setPrioridade(prioridade);
        chamado.setStatus(ABERTO);
        chamado.setTela(tela);
        chamado.setTipoSolicitante(quem.tipo());
        chamado.setFuncionarioId(FUNCIONARIO.equals(quem.tipo()) ? quem.id() : null);
        chamado.setProfessorId(PROFESSOR.equals(quem.tipo()) ? quem.id() : null);
        chamado.setNomeSolicitante(pessoa.nome());
        chamado.setEmailSolicitante(pessoa.email());
        chamado.setUltimaMensagemDe(SOLICITANTE);
        chamado.setCriadoEm(agora);
        chamado.setAtualizadoEm(agora);
        chamado = chamadoRepository.save(chamado);

        salvarMensagem(chamado.getIdChamado(), SOLICITANTE, quem.id(), pessoa.nome(), descricao, anexo, agora);
        return detalhe(chamado);
    }

    @Transactional
    public ChamadoDto responderComoSolicitante(Solicitante quem, Integer idChamado, String texto, Anexo anexo) {
        Chamado chamado = doSolicitante(quem, idChamado);
        if (FECHADO.equals(chamado.getStatus())) {
            throw new RegraDeNegocioException("Este chamado está fechado. Abra um novo chamado se o problema voltou.");
        }
        String mensagem = textoDaMensagem(texto, "Escreva a mensagem.");
        tipoDoAnexo(anexo);
        LocalDateTime agora = agora();
        salvarMensagem(chamado.getIdChamado(), SOLICITANTE, quem.id(), pessoa(quem).nome(), mensagem, anexo, agora);
        if (RESOLVIDO.equals(chamado.getStatus())) {
            chamado.setStatus(ABERTO);          // respondeu depois de resolvido: o problema continua
            chamado.setResolvidoEm(null);
        }
        chamado.setUltimaMensagemDe(SOLICITANTE);
        chamado.setAtualizadoEm(agora);
        return detalhe(chamadoRepository.save(chamado));
    }

    // Quem abriu confirma que está tudo certo e encerra o chamado
    @Transactional
    public ChamadoDto fecharComoSolicitante(Solicitante quem, Integer idChamado) {
        Chamado chamado = doSolicitante(quem, idChamado);
        if (!FECHADO.equals(chamado.getStatus())) {
            LocalDateTime agora = agora();
            if (chamado.getResolvidoEm() == null) {
                chamado.setResolvidoEm(agora);
            }
            chamado.setStatus(FECHADO);
            chamado.setAtualizadoEm(agora);
            chamado = chamadoRepository.save(chamado);
        }
        return detalhe(chamado);
    }

    public ChamadoMensagem anexoDoSolicitante(Solicitante quem, Integer idChamado, Integer idMensagem) {
        return anexo(doSolicitante(quem, idChamado), idMensagem);
    }

    // ===================== Suporte (módulo Chamados) =====================

    public List<ChamadoDto> todos() {
        return resumos(chamadoRepository.findAllByOrderByAtualizadoEmDesc());
    }

    public ChamadoDto doSuporte(Integer idChamado) {
        return detalhe(buscar(idChamado));
    }

    // Resposta do suporte. "novoStatus" permite responder e já marcar como resolvido, por exemplo.
    @Transactional
    public ChamadoDto responderComoSuporte(Integer idFuncionario, Integer idChamado, String texto, Anexo anexo,
                                          String novoStatus) {
        Chamado chamado = buscar(idChamado);
        String mensagem = textoDaMensagem(texto, "Escreva a resposta.");
        tipoDoAnexo(anexo);
        String status = limpar(novoStatus);
        if (status != null && !SITUACOES.contains(status)) {
            throw new RegraDeNegocioException("Situação inválida.");
        }
        Pessoa atendente = pessoa(Solicitante.funcionario(idFuncionario));
        LocalDateTime agora = agora();
        salvarMensagem(chamado.getIdChamado(), SUPORTE, idFuncionario, atendente.nome(), mensagem, anexo, agora);

        if (status == null && ABERTO.equals(chamado.getStatus())) {
            status = EM_ATENDIMENTO;    // a primeira resposta já coloca o chamado em atendimento
        }
        if (status != null) {
            mudarSituacao(chamado, status, agora);
        }
        if (chamado.getResponsavelId() == null) {
            chamado.setResponsavelId(idFuncionario);   // quem respondeu primeiro assume o chamado
        }
        chamado.setUltimaMensagemDe(SUPORTE);
        chamado.setAtualizadoEm(agora);
        chamado = chamadoRepository.save(chamado);

        emailService.chamadoRespondido(chamado.getEmailSolicitante(), chamado.getNomeSolicitante(),
                chamado.getIdChamado(), chamado.getAssunto(), mensagem, NOME_DA_SITUACAO.get(chamado.getStatus()),
                emailService.linkDoSite(linkDoChamado(chamado)));
        return detalhe(chamado);
    }

    // Situação, prioridade e responsável (sem mandar mensagem)
    @Transactional
    public ChamadoDto atender(Integer idChamado, Atendimento dados) {
        Chamado chamado = buscar(idChamado);
        if (dados == null) {
            throw new RegraDeNegocioException("Informe o que mudar no chamado.");
        }
        LocalDateTime agora = agora();
        String status = limpar(dados.status());
        if (status != null) {
            if (!SITUACOES.contains(status)) {
                throw new RegraDeNegocioException("Situação inválida.");
            }
            mudarSituacao(chamado, status, agora);
        }
        String prioridade = limpar(dados.prioridade());
        if (prioridade != null) {
            if (!PRIORIDADES.contains(prioridade)) {
                throw new RegraDeNegocioException("Prioridade inválida.");
            }
            chamado.setPrioridade(prioridade);
        }
        if (dados.responsavelId() != null) {
            if (dados.responsavelId() == 0) {
                chamado.setResponsavelId(null);
            } else {
                if (!funcionarioRepository.existsById(dados.responsavelId())) {
                    throw new RegraDeNegocioException("Funcionário responsável não encontrado.");
                }
                chamado.setResponsavelId(dados.responsavelId());
            }
        }
        chamado.setAtualizadoEm(agora);
        return detalhe(chamadoRepository.save(chamado));
    }

    public ChamadoMensagem anexoDoSuporte(Integer idChamado, Integer idMensagem) {
        return anexo(buscar(idChamado), idMensagem);
    }

    // ===================== Auxiliares =====================

    private record Pessoa(String nome, String email) {
    }

    private Pessoa pessoa(Solicitante quem) {
        if (FUNCIONARIO.equals(quem.tipo())) {
            Funcionario f = funcionarioRepository.findById(quem.id())
                    .orElseThrow(() -> new RegraDeNegocioException("Funcionário não encontrado."));
            return new Pessoa(f.getNomeCompleto(), f.getEmail());
        }
        Professor p = professorRepository.findById(quem.id())
                .orElseThrow(() -> new RegraDeNegocioException("Professor não encontrado."));
        return new Pessoa(p.getNomeCompleto(), p.getEmail());
    }

    private static void validar(Solicitante quem) {
        if (quem == null || quem.id() == null || (!FUNCIONARIO.equals(quem.tipo()) && !PROFESSOR.equals(quem.tipo()))) {
            throw new RegraDeNegocioException("Faça login para continuar.");
        }
    }

    private Chamado buscar(Integer idChamado) {
        if (idChamado == null) {
            throw new RegraDeNegocioException("Chamado não encontrado.");
        }
        return chamadoRepository.findById(idChamado)
                .orElseThrow(() -> new RegraDeNegocioException("Chamado não encontrado."));
    }

    // Só quem abriu enxerga o chamado (para os outros, ele "não existe")
    private Chamado doSolicitante(Solicitante quem, Integer idChamado) {
        validar(quem);
        Chamado chamado = buscar(idChamado);
        Integer dono = FUNCIONARIO.equals(quem.tipo()) ? chamado.getFuncionarioId() : chamado.getProfessorId();
        if (!quem.tipo().equals(chamado.getTipoSolicitante()) || !Objects.equals(dono, quem.id())) {
            throw new RegraDeNegocioException("Chamado não encontrado.");
        }
        return chamado;
    }

    private static void mudarSituacao(Chamado chamado, String status, LocalDateTime agora) {
        boolean finalizado = RESOLVIDO.equals(status) || FECHADO.equals(status);
        if (finalizado && chamado.getResolvidoEm() == null) {
            chamado.setResolvidoEm(agora);
        }
        if (!finalizado) {
            chamado.setResolvidoEm(null);
        }
        chamado.setStatus(status);
    }

    private ChamadoMensagem anexo(Chamado chamado, Integer idMensagem) {
        ChamadoMensagem mensagem = idMensagem == null ? null : mensagemRepository.findById(idMensagem).orElse(null);
        if (mensagem == null || !Objects.equals(mensagem.getChamadoId(), chamado.getIdChamado())
                || mensagem.getAnexoConteudo() == null || mensagem.getAnexoConteudo().length == 0) {
            throw new RegraDeNegocioException("Anexo não encontrado.");
        }
        return mensagem;
    }

    private void salvarMensagem(Integer idChamado, String autorTipo, Integer autorId, String autorNome, String texto,
                                Anexo anexo, LocalDateTime quando) {
        ChamadoMensagem mensagem = new ChamadoMensagem();
        mensagem.setChamadoId(idChamado);
        mensagem.setAutorTipo(autorTipo);
        mensagem.setAutorId(autorId);
        mensagem.setAutorNome(autorNome);
        mensagem.setTexto(texto);
        mensagem.setCriadoEm(quando);
        String tipo = tipoDoAnexo(anexo);
        if (tipo != null) {
            mensagem.setAnexoTipo(tipo);
            mensagem.setAnexoNome(DocumentoService.limparNome(anexo.nome(), tipo));
            mensagem.setAnexoTamanho(anexo.conteudo().length);
            mensagem.setAnexoConteudo(anexo.conteudo());
        }
        mensagemRepository.save(mensagem);
    }

    // Confere o anexo pelo conteúdo: print (PNG/JPG) ou PDF de até 5 MB. Sem anexo, devolve null.
    static String tipoDoAnexo(Anexo anexo) {
        if (anexo == null || anexo.vazio()) {
            return null;
        }
        if (anexo.conteudo().length > TAMANHO_MAXIMO_ANEXO) {
            throw new RegraDeNegocioException("O anexo pode ter no máximo 5 MB.");
        }
        String tipo = DocumentoService.tipoPeloConteudo(anexo.conteudo());
        if (tipo == null) {
            throw new RegraDeNegocioException("Anexe um print (PNG ou JPG) ou um PDF.");
        }
        return tipo;
    }

    private static String linkDoChamado(Chamado chamado) {
        return (PROFESSOR.equals(chamado.getTipoSolicitante()) ? "#/professor/suporte/" : "#/admin/suporte/")
                + chamado.getIdChamado();
    }

    private List<ChamadoDto> resumos(List<Chamado> chamados) {
        Map<Integer, String> nomes = new HashMap<>();
        return chamados.stream().map(c -> dto(c, nomeDoResponsavel(c.getResponsavelId(), nomes), null)).toList();
    }

    private ChamadoDto detalhe(Chamado chamado) {
        List<MensagemDto> mensagens = mensagemRepository.findByChamadoIdOrderByCriadoEmAscIdMensagemAsc(chamado.getIdChamado())
                .stream()
                .map(m -> new MensagemDto(m.getIdMensagem(), m.getAutorTipo(), m.getAutorNome(), m.getTexto(),
                        m.getAnexoNome(), m.getAnexoTipo(), m.getAnexoTamanho(), m.getCriadoEm()))
                .toList();
        return dto(chamado, nomeDoResponsavel(chamado.getResponsavelId(), new HashMap<>()), mensagens);
    }

    private String nomeDoResponsavel(Integer id, Map<Integer, String> cache) {
        if (id == null) {
            return null;
        }
        return cache.computeIfAbsent(id, chave -> funcionarioRepository.findById(chave)
                .map(Funcionario::getNomeCompleto).orElse(null));
    }

    private static ChamadoDto dto(Chamado c, String responsavelNome, List<MensagemDto> mensagens) {
        return new ChamadoDto(c.getIdChamado(), c.getAssunto(), c.getCategoria(), c.getPrioridade(), c.getStatus(),
                c.getTela(), c.getTipoSolicitante(), c.getNomeSolicitante(), c.getEmailSolicitante(),
                c.getResponsavelId(), responsavelNome, c.getUltimaMensagemDe(), c.getCriadoEm(), c.getAtualizadoEm(),
                c.getResolvidoEm(), mensagens);
    }

    private static String textoDaMensagem(String texto, String erro) {
        String limpo = obrigatorio(texto, erro);
        if (limpo.length() > 5000) {
            throw new RegraDeNegocioException("A mensagem pode ter no máximo 5000 caracteres.");
        }
        return limpo;
    }

    private static String escolha(String valor, Set<String> opcoes, String padrao, String erro) {
        String limpo = limpar(valor);
        if (limpo == null) {
            return padrao;
        }
        if (!opcoes.contains(limpo)) {
            throw new RegraDeNegocioException(erro);
        }
        return limpo;
    }

    private static String obrigatorio(String valor, String erro) {
        String limpo = limpar(valor);
        if (limpo == null) {
            throw new RegraDeNegocioException(erro);
        }
        return limpo;
    }

    private static String limpar(String valor) {
        if (valor == null) {
            return null;
        }
        String limpo = valor.trim();
        return limpo.isEmpty() ? null : limpo;
    }

    private static LocalDateTime agora() {
        return LocalDateTime.now(FUSO);
    }
}
