package com.aprendaplus.service;

import com.aprendaplus.dto.ContatoForm;
import com.aprendaplus.dto.LeadComercial;
import com.aprendaplus.dto.PainelComercial;
import com.aprendaplus.dto.PainelComercial.DiaDeMovimento;
import com.aprendaplus.dto.PainelComercial.EtapaFunil;
import com.aprendaplus.dto.PainelComercial.Indicadores;
import com.aprendaplus.dto.PainelComercial.InteresseCurso;
import com.aprendaplus.dto.PainelComercial.TermoBuscado;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.ContatoComercial;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.EventoNavegacao;
import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.entity.Matricula;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.ContatoComercialRepository;
import com.aprendaplus.repository.CursoRepository;
import com.aprendaplus.repository.EventoNavegacaoRepository;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.InscricaoRepository;
import com.aprendaplus.repository.ItemCarrinhoRepository;
import com.aprendaplus.repository.MatriculaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.stream.Collectors;

// Módulo Comercial: transforma o que acontece no site (buscas, cursos vistos, carrinhos,
// inscrições) em informação para a equipe de vendas e marketing:
// - painel: funil de conversão, cursos com mais interesse, termos buscados e movimento por dia;
// - leads: quem começou a comprar e não terminou (ou só se cadastrou);
// - contatos: o que a equipe já conversou com cada pessoa.
// As contas são feitas aqui no Java (o volume do projeto é pequeno). Se crescer muito,
// dá para levar as somas para consultas SQL sem mudar a resposta da API.
@Service
public class ComercialService {

    public static final String ETAPA_INSCRICAO = "inscricao_pendente";
    public static final String ETAPA_CARRINHO = "carrinho";
    public static final String ETAPA_CADASTRO = "cadastro";
    private static final List<String> ORDEM_DAS_ETAPAS = List.of(ETAPA_INSCRICAO, ETAPA_CARRINHO, ETAPA_CADASTRO);

    public static final List<String> CANAIS = List.of("whatsapp", "telefone", "email");
    public static final List<String> RESULTADOS =
            List.of("sem_resposta", "interessado", "retornar_depois", "sem_interesse", "matriculou");

    static final int DIAS_PADRAO = 30;
    static final int DIAS_MAXIMOS = 365;
    // Para quem só se cadastrou: cursos que a pessoa abriu nos últimos 90 dias
    static final int DIAS_DE_INTERESSE = 90;
    static final int MAXIMO_DE_TERMOS = 50;
    static final int TAMANHO_MAXIMO_OBSERVACAO = 500;

    @Autowired
    private EventoNavegacaoRepository eventoRepository;

    @Autowired
    private AlunoRepository alunoRepository;

    @Autowired
    private InscricaoRepository inscricaoRepository;

    @Autowired
    private MatriculaRepository matriculaRepository;

    @Autowired
    private ItemCarrinhoRepository itemCarrinhoRepository;

    @Autowired
    private CursoRepository cursoRepository;

    @Autowired
    private ContatoComercialRepository contatoRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    // Relógio trocável nos testes
    Supplier<LocalDateTime> relogio = () -> LocalDateTime.now(EventoService.FUSO);

    // ===================== Painel =====================

    @Transactional(readOnly = true)
    public PainelComercial painel(Integer diasPedidos) {
        int dias = diasPedidos == null ? DIAS_PADRAO : Math.max(1, Math.min(diasPedidos, DIAS_MAXIMOS));
        LocalDate ate = relogio.get().toLocalDate();
        LocalDate de = ate.minusDays(dias - 1L);
        LocalDateTime inicio = de.atStartOfDay();
        LocalDateTime fim = ate.plusDays(1).atStartOfDay();

        List<EventoNavegacao> eventos =
                eventoRepository.findByQuandoGreaterThanEqualAndQuandoLessThanOrderByQuandoAsc(inicio, fim);
        List<Inscricao> inscricoes = inscricaoRepository.findAll().stream()
                .filter(i -> dentro(i.getDataInscricao(), inicio, fim))
                .toList();
        List<Matricula> matriculas = matriculaRepository.findAll().stream()
                .filter(m -> dentro(m.getCriadoEm(), inicio, fim))
                .toList();
        long cadastros = alunoRepository.findAll().stream()
                .filter(a -> dentro(a.getCriadoEm(), inicio, fim))
                .count();

        long visitantes = sessoes(eventos, e -> true);
        long buscas = eventos.stream().filter(e -> EventoNavegacao.BUSCA.equals(e.getTipo())).count();
        long buscasSemResultado = eventos.stream()
                .filter(e -> EventoNavegacao.BUSCA.equals(e.getTipo()) && Integer.valueOf(0).equals(e.getResultados()))
                .count();
        long pessoasInscritas = inscricoes.stream().map(this::idDoAluno).filter(Objects::nonNull).distinct().count();
        long pessoasMatriculadas = matriculas.stream().map(this::idDoAluno).filter(Objects::nonNull).distinct().count();

        Indicadores indicadores = new Indicadores(visitantes, cadastros, inscricoes.size(), matriculas.size(),
                buscas, buscasSemResultado, porcentagem(pessoasMatriculadas, visitantes));

        List<EtapaFunil> funil = List.of(
                new EtapaFunil("visitaram", "Visitaram o site", visitantes),
                new EtapaFunil("viram_curso", "Abriram um curso", sessoes(eventos, tipo(EventoNavegacao.VISUALIZACAO))),
                new EtapaFunil("carrinho", "Puseram no carrinho", sessoes(eventos, tipo(EventoNavegacao.CARRINHO))),
                new EtapaFunil("inscricao", "Fizeram inscrição", pessoasInscritas),
                new EtapaFunil("matricula", "Matricularam", pessoasMatriculadas));

        return new PainelComercial(de, ate, dias, indicadores, funil,
                interessePorCurso(eventos, inscricoes), termosBuscados(eventos), movimentoPorDia(eventos, de, ate));
    }

    // Todos os cursos, dos que têm mais interesse para os que têm menos
    // (os cursos que ninguém procura também aparecem: é informação para o marketing)
    List<InteresseCurso> interessePorCurso(List<EventoNavegacao> eventos, List<Inscricao> inscricoes) {
        Map<Integer, List<EventoNavegacao>> porCurso = eventos.stream()
                .filter(e -> e.getCursoId() != null)
                .collect(Collectors.groupingBy(EventoNavegacao::getCursoId));
        Map<Integer, Long> inscricoesPorCurso = inscricoes.stream()
                .map(this::idDoCurso)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(id -> id, Collectors.counting()));

        List<InteresseCurso> lista = new ArrayList<>();
        for (Curso curso : cursoRepository.findAll()) {
            List<EventoNavegacao> doCurso = porCurso.getOrDefault(curso.getIdCurso(), List.of());
            Predicate<EventoNavegacao> visualizacao = tipo(EventoNavegacao.VISUALIZACAO);
            long visualizacoes = doCurso.stream().filter(visualizacao).count();
            long pessoas = sessoes(doCurso, visualizacao);
            long visitantes = sessoes(doCurso, visualizacao.and(e -> e.getAlunoId() == null));
            long alunos = sessoes(doCurso, visualizacao.and(e -> e.getAlunoId() != null));
            long carrinho = sessoes(doCurso, tipo(EventoNavegacao.CARRINHO));
            long inscritos = inscricoesPorCurso.getOrDefault(curso.getIdCurso(), 0L);
            lista.add(new InteresseCurso(curso.getIdCurso(), curso.getNome(), curso.getCategoria(),
                    visualizacoes, pessoas, visitantes, alunos, carrinho, inscritos, porcentagem(inscritos, pessoas)));
        }
        lista.sort(Comparator.comparingLong(InteresseCurso::pessoas).reversed()
                .thenComparing(Comparator.comparingLong(InteresseCurso::inscricoes).reversed())
                .thenComparing(c -> c.nome() == null ? "" : c.nome()));
        return lista;
    }

    // Termos buscados, agrupados sem acentos e sem maiúsculas ("Ciencia" = "ciência").
    // O número de resultados é o da busca mais recente (o catálogo pode ter mudado).
    List<TermoBuscado> termosBuscados(List<EventoNavegacao> eventos) {
        Map<String, List<EventoNavegacao>> porTermo = new LinkedHashMap<>();
        for (EventoNavegacao evento : eventos) {
            if (!EventoNavegacao.BUSCA.equals(evento.getTipo()) || evento.getTermo() == null) continue;
            String chave = normalizar(evento.getTermo());
            if (chave.isEmpty()) continue;
            porTermo.computeIfAbsent(chave, k -> new ArrayList<>()).add(evento);
        }

        List<TermoBuscado> termos = new ArrayList<>();
        porTermo.forEach((chave, lista) -> {
            EventoNavegacao maisRecente = lista.stream()
                    .max(Comparator.comparing(EventoNavegacao::getQuando, Comparator.nullsFirst(Comparator.naturalOrder())))
                    .orElse(lista.get(lista.size() - 1));
            int resultados = maisRecente.getResultados() == null ? -1 : maisRecente.getResultados();
            String texto = maisRecente.getTermo().trim().toLowerCase(Locale.ROOT);
            termos.add(new TermoBuscado(texto, lista.size(), sessoes(lista, e -> true), resultados, resultados == 0));
        });
        termos.sort(Comparator.comparingLong(TermoBuscado::vezes).reversed()
                .thenComparing(Comparator.comparingLong(TermoBuscado::pessoas).reversed())
                .thenComparing(TermoBuscado::termo));
        return termos.size() > MAXIMO_DE_TERMOS ? List.copyOf(termos.subList(0, MAXIMO_DE_TERMOS)) : termos;
    }

    // Um item por dia do período, mesmo nos dias sem movimento (o gráfico não fica com buracos)
    List<DiaDeMovimento> movimentoPorDia(List<EventoNavegacao> eventos, LocalDate de, LocalDate ate) {
        Map<LocalDate, List<EventoNavegacao>> porDia = eventos.stream()
                .filter(e -> e.getQuando() != null)
                .collect(Collectors.groupingBy(e -> e.getQuando().toLocalDate()));
        List<DiaDeMovimento> dias = new ArrayList<>();
        for (LocalDate dia = de; !dia.isAfter(ate); dia = dia.plusDays(1)) {
            List<EventoNavegacao> doDia = porDia.getOrDefault(dia, List.of());
            dias.add(new DiaDeMovimento(dia, sessoes(doDia, e -> true),
                    doDia.stream().filter(tipo(EventoNavegacao.VISUALIZACAO)).count(),
                    doDia.stream().filter(tipo(EventoNavegacao.BUSCA)).count()));
        }
        return dias;
    }

    // ===================== Leads =====================

    // Uma linha por aluno ativo que ainda não concluiu uma compra, na etapa mais avançada que ele chegou
    @Transactional(readOnly = true)
    public List<LeadComercial> leads() {
        LocalDateTime agora = relogio.get();

        List<Inscricao> todasAsInscricoes = inscricaoRepository.findAll();
        Map<Integer, List<Inscricao>> pendentes = new HashMap<>();
        Set<Integer> comInscricao = new HashSet<>();
        for (Inscricao inscricao : todasAsInscricoes) {
            Integer idAluno = idDoAluno(inscricao);
            if (idAluno == null) continue;
            comInscricao.add(idAluno);
            if (InscricaoService.PENDENTE.equals(inscricao.getStatus())) {
                pendentes.computeIfAbsent(idAluno, k -> new ArrayList<>()).add(inscricao);
            }
        }

        Set<Integer> comMatricula = matriculaRepository.findAll().stream()
                .map(this::idDoAluno)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Integer, List<ItemCarrinho>> carrinhos = new HashMap<>();
        for (ItemCarrinho item : itemCarrinhoRepository.findAll()) {
            Integer idAluno = item.getCarrinho() == null || item.getCarrinho().getAluno() == null
                    ? null : item.getCarrinho().getAluno().getIdAluno();
            if (idAluno != null && item.getCurso() != null) {
                carrinhos.computeIfAbsent(idAluno, k -> new ArrayList<>()).add(item);
            }
        }

        Map<Integer, List<ContatoComercial>> contatos = contatoRepository.findAllByOrderByQuandoDescIdContatoDesc()
                .stream()
                .collect(Collectors.groupingBy(ContatoComercial::getAlunoId, LinkedHashMap::new, Collectors.toList()));

        Map<Integer, Set<String>> cursosVistos = cursosVistosPorAluno(agora);

        List<LeadComercial> leads = new ArrayList<>();
        for (Aluno aluno : alunoRepository.findAll()) {
            Integer id = aluno.getIdAluno();
            if (id == null || (aluno.getStatus() != null && !"ativo".equals(aluno.getStatus()))) continue;

            List<Inscricao> doAluno = pendentes.getOrDefault(id, List.of());
            List<ItemCarrinho> noCarrinho = carrinhos.getOrDefault(id, List.of());

            String etapa;
            Set<String> cursos = new LinkedHashSet<>();
            BigDecimal valor = BigDecimal.ZERO;
            LocalDateTime desde = null;

            if (!doAluno.isEmpty()) {
                etapa = ETAPA_INSCRICAO;
                Set<Integer> cursosInscritos = new HashSet<>();
                for (Inscricao inscricao : doAluno) {
                    Curso curso = cursoDaInscricao(inscricao);
                    if (curso != null) {
                        cursos.add(curso.getNome());
                        cursosInscritos.add(curso.getIdCurso());
                    }
                    valor = valor.add(inscricao.getValorTotal() == null ? BigDecimal.ZERO : inscricao.getValorTotal());
                    desde = maisRecente(desde, inscricao.getDataInscricao());
                }
                // O que ainda está no carrinho também é interesse dele
                for (ItemCarrinho item : noCarrinho) {
                    if (cursosInscritos.add(item.getCurso().getIdCurso())) {
                        cursos.add(item.getCurso().getNome());
                        valor = valor.add(valorDoCurso(item.getCurso()));
                    }
                }
            } else if (!noCarrinho.isEmpty()) {
                etapa = ETAPA_CARRINHO;
                for (ItemCarrinho item : noCarrinho) {
                    cursos.add(item.getCurso().getNome());
                    valor = valor.add(valorDoCurso(item.getCurso()));
                    LocalDateTime quando = item.getAdicionadoEm() != null ? item.getAdicionadoEm()
                            : item.getCarrinho().getCriadoEm();
                    desde = maisRecente(desde, quando);
                }
            } else if (!comInscricao.contains(id) && !comMatricula.contains(id)) {
                etapa = ETAPA_CADASTRO;
                cursos.addAll(cursosVistos.getOrDefault(id, Set.of()));
                valor = null;
                desde = aluno.getCriadoEm();
            } else {
                continue; // já comprou e não tem nada pendente
            }

            List<ContatoComercial> doLead = contatos.getOrDefault(id, List.of());
            LeadComercial.UltimoContato ultimo = doLead.isEmpty() ? null : resumo(doLead.get(0));
            long diasParado = desde == null ? 0 : Math.max(0, ChronoUnit.DAYS.between(desde.toLocalDate(), agora.toLocalDate()));

            leads.add(new LeadComercial(id, aluno.getNomeCompleto(), aluno.getEmail(), aluno.getTelefone(),
                    Boolean.TRUE.equals(aluno.getAceitaMarketing()), comMatricula.contains(id),
                    etapa, List.copyOf(cursos), valor, desde, diasParado, ultimo, doLead.size()));
        }

        leads.sort(Comparator.comparingInt((LeadComercial l) -> ORDEM_DAS_ETAPAS.indexOf(l.etapa()))
                .thenComparing(LeadComercial::desde, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(LeadComercial::idAluno));
        return leads;
    }

    // Cursos que cada aluno abriu nos últimos 90 dias (mais recentes primeiro, até 5)
    private Map<Integer, Set<String>> cursosVistosPorAluno(LocalDateTime agora) {
        LocalDateTime inicio = agora.toLocalDate().minusDays(DIAS_DE_INTERESSE).atStartOfDay();
        List<EventoNavegacao> eventos = eventoRepository
                .findByQuandoGreaterThanEqualAndQuandoLessThanOrderByQuandoAsc(inicio, agora.plusDays(1));
        Map<Integer, String> nomes = cursoRepository.findAll().stream()
                .filter(c -> c.getIdCurso() != null && c.getNome() != null)
                .collect(Collectors.toMap(Curso::getIdCurso, Curso::getNome, (a, b) -> a));

        Map<Integer, Set<String>> vistos = new HashMap<>();
        for (int i = eventos.size() - 1; i >= 0; i--) {
            EventoNavegacao evento = eventos.get(i);
            if (evento.getAlunoId() == null || evento.getCursoId() == null) continue;
            String nome = nomes.get(evento.getCursoId());
            if (nome == null) continue;
            Set<String> doAluno = vistos.computeIfAbsent(evento.getAlunoId(), k -> new LinkedHashSet<>());
            if (doAluno.size() < 5) doAluno.add(nome);
        }
        return vistos;
    }

    // ===================== Contatos =====================

    @Transactional
    public ContatoComercial registrarContato(ContatoForm form, Integer idFuncionario) {
        if (form == null || form.idAluno() == null || !alunoRepository.existsById(form.idAluno())) {
            throw new RegraDeNegocioException("Aluno não encontrado.");
        }
        String canal = form.canal() == null ? "" : form.canal().trim().toLowerCase(Locale.ROOT);
        if (!CANAIS.contains(canal)) {
            throw new RegraDeNegocioException("Escolha o canal do contato: WhatsApp, telefone ou e-mail.");
        }
        String resultado = form.resultado() == null ? "" : form.resultado().trim().toLowerCase(Locale.ROOT);
        if (!RESULTADOS.contains(resultado)) {
            throw new RegraDeNegocioException("Escolha como foi o contato.");
        }
        String observacao = form.observacao() == null ? null : form.observacao().trim();
        if (observacao != null && observacao.isEmpty()) {
            observacao = null;
        }
        if (observacao != null && observacao.length() > TAMANHO_MAXIMO_OBSERVACAO) {
            throw new RegraDeNegocioException("A observação pode ter no máximo " + TAMANHO_MAXIMO_OBSERVACAO + " caracteres.");
        }

        ContatoComercial contato = new ContatoComercial();
        contato.setAlunoId(form.idAluno());
        contato.setFuncionarioId(idFuncionario);
        contato.setFuncionarioNome(idFuncionario == null ? "Equipe" : funcionarioRepository.findById(idFuncionario)
                .map(f -> f.getNomeCompleto())
                .orElse("Equipe"));
        contato.setQuando(relogio.get());
        contato.setCanal(canal);
        contato.setResultado(resultado);
        contato.setObservacao(observacao);
        return contatoRepository.save(contato);
    }

    public List<ContatoComercial> contatosDoAluno(Integer idAluno) {
        return contatoRepository.findByAlunoIdOrderByQuandoDescIdContatoDesc(idAluno);
    }

    // ===================== Ajudantes =====================

    // "Ciência  de DADOS" -> "ciencia de dados"
    static String normalizar(String texto) {
        if (texto == null) return "";
        String semAcento = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return semAcento.replaceAll("\\s+", " ").trim().toLowerCase(Locale.ROOT);
    }

    // parte / total em %, com uma casa decimal (0 quando não há base)
    static double porcentagem(long parte, long total) {
        if (total <= 0) return 0;
        return Math.round(parte * 1000.0 / total) / 10.0;
    }

    private static boolean dentro(LocalDateTime quando, LocalDateTime inicio, LocalDateTime fim) {
        return quando != null && !quando.isBefore(inicio) && quando.isBefore(fim);
    }

    // Quantas pessoas diferentes (sessões) fizeram o que o filtro pede
    private static long sessoes(List<EventoNavegacao> eventos, Predicate<EventoNavegacao> filtro) {
        return eventos.stream().filter(filtro).map(EventoNavegacao::getSessao).filter(Objects::nonNull).distinct().count();
    }

    private static Predicate<EventoNavegacao> tipo(String tipo) {
        return e -> tipo.equals(e.getTipo());
    }

    private static LocalDateTime maisRecente(LocalDateTime atual, LocalDateTime novo) {
        if (novo == null) return atual;
        return atual == null || novo.isAfter(atual) ? novo : atual;
    }

    private static BigDecimal valorDoCurso(Curso curso) {
        return curso == null || curso.getValor() == null ? BigDecimal.ZERO : curso.getValor();
    }

    private Integer idDoAluno(Inscricao inscricao) {
        return inscricao.getAluno() == null ? null : inscricao.getAluno().getIdAluno();
    }

    private Integer idDoAluno(Matricula matricula) {
        return matricula.getAluno() == null ? null : matricula.getAluno().getIdAluno();
    }

    private static Curso cursoDaInscricao(Inscricao inscricao) {
        return inscricao.getTurma() == null ? null : inscricao.getTurma().getCurso();
    }

    private Integer idDoCurso(Inscricao inscricao) {
        Curso curso = cursoDaInscricao(inscricao);
        return curso == null ? null : curso.getIdCurso();
    }

    private static LeadComercial.UltimoContato resumo(ContatoComercial contato) {
        return new LeadComercial.UltimoContato(contato.getQuando(), contato.getCanal(), contato.getResultado(),
                contato.getFuncionarioNome(), contato.getObservacao());
    }
}
