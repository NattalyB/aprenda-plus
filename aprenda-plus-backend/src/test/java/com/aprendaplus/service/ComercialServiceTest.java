package com.aprendaplus.service;

import com.aprendaplus.dto.ContatoForm;
import com.aprendaplus.dto.LeadComercial;
import com.aprendaplus.dto.PainelComercial;
import com.aprendaplus.dto.PainelComercial.InteresseCurso;
import com.aprendaplus.dto.PainelComercial.TermoBuscado;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Carrinho;
import com.aprendaplus.entity.ContatoComercial;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.EventoNavegacao;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.entity.Matricula;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.ContatoComercialRepository;
import com.aprendaplus.repository.CursoRepository;
import com.aprendaplus.repository.EventoNavegacaoRepository;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.InscricaoRepository;
import com.aprendaplus.repository.ItemCarrinhoRepository;
import com.aprendaplus.repository.MatriculaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ComercialServiceTest {

    @Mock private EventoNavegacaoRepository eventoRepository;
    @Mock private AlunoRepository alunoRepository;
    @Mock private InscricaoRepository inscricaoRepository;
    @Mock private MatriculaRepository matriculaRepository;
    @Mock private ItemCarrinhoRepository itemCarrinhoRepository;
    @Mock private CursoRepository cursoRepository;
    @Mock private ContatoComercialRepository contatoRepository;
    @Mock private FuncionarioRepository funcionarioRepository;

    @InjectMocks
    private ComercialService service;

    // "Hoje" nos testes: 28/10/2026 às 15h
    private static final LocalDateTime AGORA = LocalDateTime.of(2026, 10, 28, 15, 0);
    private static final String S1 = "11111111-1111-4111-8111-111111111111";
    private static final String S2 = "22222222-2222-4222-8222-222222222222";
    private static final String S3 = "33333333-3333-4333-8333-333333333333";

    private Curso ads;
    private Curso dados;
    private Curso design;
    private final List<EventoNavegacao> eventos = new ArrayList<>();

    @BeforeEach
    void preparar() {
        service.relogio = () -> AGORA;
        ads = curso(1, "Análise e Desenvolvimento de Sistemas", "1200.00");
        dados = curso(2, "Ciência de Dados", "800.00");
        design = curso(3, "Design Gráfico", "500.00");
        when(cursoRepository.findAll()).thenReturn(List.of(ads, dados, design));
        when(eventoRepository.findByQuandoGreaterThanEqualAndQuandoLessThanOrderByQuandoAsc(any(), any()))
                .thenReturn(eventos);
        when(inscricaoRepository.findAll()).thenReturn(List.of());
        when(matriculaRepository.findAll()).thenReturn(List.of());
        when(alunoRepository.findAll()).thenReturn(List.of());
        when(itemCarrinhoRepository.findAll()).thenReturn(List.of());
        when(contatoRepository.findAllByOrderByQuandoDescIdContatoDesc()).thenReturn(List.of());
    }

    // ===================== Painel =====================

    @Test
    void funilContaPessoasDiferentesEmCadaEtapa() {
        Aluno ana = aluno(10, "Ana", AGORA.minusDays(2));
        eventos.addAll(List.of(
                evento(AGORA.minusDays(1), "VISUALIZACAO", S1, null, 1, null, null),
                evento(AGORA.minusDays(1), "VISUALIZACAO", S1, null, 1, null, null), // mesma pessoa de novo
                evento(AGORA.minusDays(1), "CARRINHO", S1, 10, 1, null, null),
                evento(AGORA.minusDays(3), "VISUALIZACAO", S2, null, 2, null, null),
                evento(AGORA.minusDays(3), "BUSCA", S3, null, null, "python", 0)));
        when(alunoRepository.findAll()).thenReturn(List.of(ana));
        when(inscricaoRepository.findAll()).thenReturn(List.of(
                inscricao(ana, ads, "pendente_pagamento", "1200.00", AGORA.minusDays(1))));
        when(matriculaRepository.findAll()).thenReturn(List.of(matricula(ana, AGORA.minusHours(2))));

        PainelComercial painel = service.painel(30);

        assertEquals(LocalDate.of(2026, 9, 29), painel.de());
        assertEquals(LocalDate.of(2026, 10, 28), painel.ate());
        assertEquals(List.of(3L, 2L, 1L, 1L, 1L), painel.funil().stream().map(PainelComercial.EtapaFunil::pessoas).toList());
        assertEquals(3, painel.indicadores().visitantes());
        assertEquals(1, painel.indicadores().cadastros());
        assertEquals(1, painel.indicadores().inscricoes());
        assertEquals(1, painel.indicadores().matriculas());
        assertEquals(1, painel.indicadores().buscas());
        assertEquals(1, painel.indicadores().buscasSemResultado());
        assertEquals(33.3, painel.indicadores().conversao());
        assertEquals(30, painel.porDia().size());
    }

    @Test
    void foraDoPeriodoNaoEntraNaConta() {
        Aluno antigo = aluno(10, "Antigo", AGORA.minusDays(60));
        when(alunoRepository.findAll()).thenReturn(List.of(antigo));
        when(inscricaoRepository.findAll()).thenReturn(List.of(
                inscricao(antigo, ads, "confirmada", "1200.00", AGORA.minusDays(40))));

        PainelComercial painel = service.painel(7);

        assertEquals(7, painel.dias());
        assertEquals(0, painel.indicadores().cadastros());
        assertEquals(0, painel.indicadores().inscricoes());
        assertEquals(0, painel.indicadores().conversao());
    }

    @Test
    void periodoFicaEntreUmE365Dias() {
        assertEquals(30, service.painel(null).dias());
        assertEquals(1, service.painel(0).dias());
        assertEquals(365, service.painel(5000).dias());
    }

    @Test
    void cursosOrdenadosPeloInteresseSeparandoVisitantesEAlunos() {
        Aluno ana = aluno(10, "Ana", AGORA.minusDays(100));
        eventos.addAll(List.of(
                evento(AGORA.minusDays(1), "VISUALIZACAO", S1, null, 2, null, null),
                evento(AGORA.minusDays(1), "VISUALIZACAO", S2, 10, 2, null, null),
                evento(AGORA.minusDays(1), "CARRINHO", S2, 10, 2, null, null),
                evento(AGORA.minusDays(1), "VISUALIZACAO", S3, null, 1, null, null)));
        when(inscricaoRepository.findAll()).thenReturn(List.of(
                inscricao(ana, dados, "pendente_pagamento", "800.00", AGORA.minusDays(1))));

        List<InteresseCurso> cursos = service.painel(30).cursos();

        assertEquals(3, cursos.size(), "cursos sem procura também aparecem");
        InteresseCurso primeiro = cursos.get(0);
        assertEquals("Ciência de Dados", primeiro.nome());
        assertEquals(2, primeiro.pessoas());
        assertEquals(1, primeiro.visitantes());
        assertEquals(1, primeiro.alunos());
        assertEquals(1, primeiro.carrinho());
        assertEquals(1, primeiro.inscricoes());
        assertEquals(50.0, primeiro.conversao());
        assertEquals("Design Gráfico", cursos.get(2).nome());
        assertEquals(0, cursos.get(2).pessoas());
    }

    @Test
    void termosAgrupadosSemAcentoEComOResultadoMaisRecente() {
        eventos.addAll(List.of(
                evento(AGORA.minusDays(3), "BUSCA", S1, null, null, "Ciência", 0),
                evento(AGORA.minusDays(2), "BUSCA", S2, null, null, "ciencia", 1),
                evento(AGORA.minusDays(1), "BUSCA", S2, null, null, "CIENCIA ", 1),
                evento(AGORA.minusDays(1), "BUSCA", S3, null, null, "python", 0)));

        List<TermoBuscado> termos = service.painel(30).buscas();

        assertEquals(2, termos.size());
        assertEquals("ciencia", termos.get(0).termo());
        assertEquals(3, termos.get(0).vezes());
        assertEquals(2, termos.get(0).pessoas());
        assertFalse(termos.get(0).semResultado());
        assertEquals("python", termos.get(1).termo());
        assertTrue(termos.get(1).semResultado());
    }

    @Test
    void movimentoPorDiaTemTodosOsDias() {
        eventos.add(evento(AGORA.minusHours(1), "BUSCA", S1, null, null, "web", 2));
        eventos.add(evento(AGORA.minusHours(1), "VISUALIZACAO", S1, null, 1, null, null));

        List<PainelComercial.DiaDeMovimento> dias = service.painel(7).porDia();

        assertEquals(7, dias.size());
        PainelComercial.DiaDeMovimento hoje = dias.get(6);
        assertEquals(LocalDate.of(2026, 10, 28), hoje.data());
        assertEquals(1, hoje.visitantes());
        assertEquals(1, hoje.visualizacoes());
        assertEquals(1, hoje.buscas());
        assertEquals(0, dias.get(0).visitantes());
    }

    // ===================== Leads =====================

    @Test
    void cadaAlunoApareceUmaVezNaEtapaMaisAvancada() {
        Aluno ana = aluno(10, "Ana", AGORA.minusDays(30));      // inscrição pendente + carrinho
        Aluno bruno = aluno(11, "Bruno", AGORA.minusDays(20));  // só carrinho
        Aluno carla = aluno(12, "Carla", AGORA.minusDays(5));   // só cadastro
        Aluno davi = aluno(13, "Davi", AGORA.minusDays(50));    // já comprou, nada pendente
        Aluno edu = aluno(14, "Edu", AGORA.minusDays(3));       // conta bloqueada
        edu.setStatus("bloqueado");
        ana.setAceitaMarketing(true);
        when(alunoRepository.findAll()).thenReturn(List.of(ana, bruno, carla, davi, edu));
        when(inscricaoRepository.findAll()).thenReturn(List.of(
                inscricao(ana, ads, "pendente_pagamento", "1200.00", AGORA.minusDays(4)),
                inscricao(davi, dados, "confirmada", "800.00", AGORA.minusDays(40))));
        when(matriculaRepository.findAll()).thenReturn(List.of(matricula(davi, AGORA.minusDays(39))));
        when(itemCarrinhoRepository.findAll()).thenReturn(List.of(
                item(ana, ads, AGORA.minusDays(6)),       // mesmo curso da inscrição: não soma de novo
                item(ana, design, AGORA.minusDays(6)),
                item(bruno, dados, AGORA.minusDays(2)),
                item(edu, dados, AGORA.minusDays(1))));
        eventos.add(evento(AGORA.minusDays(1), "VISUALIZACAO", S3, 12, 3, null, null));

        List<LeadComercial> leads = service.leads();

        assertEquals(List.of("Ana", "Bruno", "Carla"), leads.stream().map(LeadComercial::nome).toList());

        LeadComercial leadAna = leads.get(0);
        assertEquals(ComercialService.ETAPA_INSCRICAO, leadAna.etapa());
        assertEquals(List.of("Análise e Desenvolvimento de Sistemas", "Design Gráfico"), leadAna.cursos());
        assertEquals(0, new BigDecimal("1700.00").compareTo(leadAna.valor()));
        assertEquals(4, leadAna.diasParado());
        assertTrue(leadAna.aceitaMarketing());
        assertFalse(leadAna.jaEhAluno());

        LeadComercial leadBruno = leads.get(1);
        assertEquals(ComercialService.ETAPA_CARRINHO, leadBruno.etapa());
        assertEquals(0, new BigDecimal("800.00").compareTo(leadBruno.valor()));
        assertEquals(2, leadBruno.diasParado());
        assertFalse(leadBruno.aceitaMarketing());

        LeadComercial leadCarla = leads.get(2);
        assertEquals(ComercialService.ETAPA_CADASTRO, leadCarla.etapa());
        assertEquals(List.of("Design Gráfico"), leadCarla.cursos(), "cursos que ela abriu no site");
        assertNull(leadCarla.valor());
        assertEquals(5, leadCarla.diasParado());
    }

    @Test
    void quemJaEhAlunoComCarrinhoNovoViraLeadDeSegundoCurso() {
        Aluno davi = aluno(13, "Davi", AGORA.minusDays(50));
        when(alunoRepository.findAll()).thenReturn(List.of(davi));
        when(matriculaRepository.findAll()).thenReturn(List.of(matricula(davi, AGORA.minusDays(39))));
        when(itemCarrinhoRepository.findAll()).thenReturn(List.of(item(davi, design, AGORA.minusDays(1))));

        LeadComercial lead = service.leads().get(0);

        assertEquals(ComercialService.ETAPA_CARRINHO, lead.etapa());
        assertTrue(lead.jaEhAluno());
    }

    @Test
    void leadMostraOUltimoContatoEQuantosForamFeitos() {
        Aluno bruno = aluno(11, "Bruno", AGORA.minusDays(20));
        when(alunoRepository.findAll()).thenReturn(List.of(bruno));
        when(itemCarrinhoRepository.findAll()).thenReturn(List.of(item(bruno, dados, AGORA.minusDays(2))));
        when(contatoRepository.findAllByOrderByQuandoDescIdContatoDesc()).thenReturn(List.of(
                contato(11, AGORA.minusHours(3), "whatsapp", "interessado"),
                contato(11, AGORA.minusDays(2), "telefone", "sem_resposta")));

        LeadComercial lead = service.leads().get(0);

        assertEquals(2, lead.totalContatos());
        assertEquals("whatsapp", lead.ultimoContato().canal());
        assertEquals("interessado", lead.ultimoContato().resultado());
        assertEquals("Carla", lead.ultimoContato().funcionarioNome());
    }

    @Test
    void itemSemDataUsaACriacaoDoCarrinho() {
        Aluno bruno = aluno(11, "Bruno", AGORA.minusDays(20));
        ItemCarrinho antigo = item(bruno, dados, null);
        ReflectionTestUtils.setField(antigo.getCarrinho(), "criadoEm", AGORA.minusDays(10));
        when(alunoRepository.findAll()).thenReturn(List.of(bruno));
        when(itemCarrinhoRepository.findAll()).thenReturn(List.of(antigo));

        assertEquals(10, service.leads().get(0).diasParado());
    }

    // ===================== Contatos =====================

    @Test
    void registraContatoComONomeDoFuncionario() {
        Funcionario carla = new Funcionario();
        carla.setNomeCompleto("Carla Comercial");
        when(alunoRepository.existsById(11)).thenReturn(true);
        when(funcionarioRepository.findById(4)).thenReturn(Optional.of(carla));
        when(contatoRepository.save(any(ContatoComercial.class))).thenAnswer(i -> i.getArgument(0));

        ContatoComercial salvo = service.registrarContato(
                new ContatoForm(11, " WhatsApp ", "interessado", "  Pediu desconto no Pix  "), 4);

        assertEquals(11, salvo.getAlunoId());
        assertEquals(4, salvo.getFuncionarioId());
        assertEquals("Carla Comercial", salvo.getFuncionarioNome());
        assertEquals("whatsapp", salvo.getCanal());
        assertEquals("interessado", salvo.getResultado());
        assertEquals("Pediu desconto no Pix", salvo.getObservacao());
        assertEquals(AGORA, salvo.getQuando());
    }

    @Test
    void observacaoEmBrancoFicaVazia() {
        when(alunoRepository.existsById(11)).thenReturn(true);
        when(contatoRepository.save(any(ContatoComercial.class))).thenAnswer(i -> i.getArgument(0));

        ContatoComercial salvo = service.registrarContato(new ContatoForm(11, "email", "sem_resposta", "   "), null);

        assertNull(salvo.getObservacao());
        assertEquals("Equipe", salvo.getFuncionarioNome());
    }

    @Test
    void recusaContatoInvalido() {
        when(alunoRepository.existsById(11)).thenReturn(true);
        when(alunoRepository.existsById(99)).thenReturn(false);

        assertThrows(RegraDeNegocioException.class,
                () -> service.registrarContato(new ContatoForm(99, "email", "interessado", null), 1));
        assertThrows(RegraDeNegocioException.class,
                () -> service.registrarContato(new ContatoForm(null, "email", "interessado", null), 1));
        assertThrows(RegraDeNegocioException.class,
                () -> service.registrarContato(new ContatoForm(11, "pombo-correio", "interessado", null), 1));
        assertThrows(RegraDeNegocioException.class,
                () -> service.registrarContato(new ContatoForm(11, "email", "talvez", null), 1));
        assertThrows(RegraDeNegocioException.class,
                () -> service.registrarContato(new ContatoForm(11, "email", "interessado", "x".repeat(501)), 1));
        assertThrows(RegraDeNegocioException.class, () -> service.registrarContato(null, 1));
        verify(contatoRepository, never()).save(any());
    }

    @Test
    void listaOsContatosDoAluno() {
        ContatoComercial c = contato(11, AGORA, "email", "interessado");
        when(contatoRepository.findByAlunoIdOrderByQuandoDescIdContatoDesc(11)).thenReturn(List.of(c));

        assertEquals(List.of(c), service.contatosDoAluno(11));
    }

    // ===================== Ajudantes =====================

    @Test
    void normalizaTermosEPorcentagens() {
        assertEquals("ciencia de dados", ComercialService.normalizar("  Ciência   de DADOS "));
        assertEquals("", ComercialService.normalizar(null));
        assertEquals(33.3, ComercialService.porcentagem(1, 3));
        assertEquals(0, ComercialService.porcentagem(5, 0));
    }

    @Test
    void contatoRegistradoGuardaOQueFoiEnviado() {
        when(alunoRepository.existsById(11)).thenReturn(true);
        when(contatoRepository.save(any(ContatoComercial.class))).thenAnswer(i -> i.getArgument(0));

        service.registrarContato(new ContatoForm(11, "telefone", "retornar_depois", "Ligar sexta"), null);

        ArgumentCaptor<ContatoComercial> captor = ArgumentCaptor.forClass(ContatoComercial.class);
        verify(contatoRepository).save(captor.capture());
        assertEquals("telefone", captor.getValue().getCanal());
        assertEquals("Ligar sexta", captor.getValue().getObservacao());
    }

    // ===================== Montagem dos dados =====================

    private static Curso curso(int id, String nome, String valor) {
        Curso curso = new Curso();
        curso.setIdCurso(id);
        curso.setNome(nome);
        curso.setCategoria("Tecnologia");
        curso.setValor(new BigDecimal(valor));
        return curso;
    }

    private static Aluno aluno(int id, String nome, LocalDateTime criadoEm) {
        Aluno aluno = new Aluno();
        aluno.setIdAluno(id);
        aluno.setNomeCompleto(nome);
        aluno.setEmail(nome.toLowerCase() + "@teste.com");
        aluno.setTelefone("51999990000");
        aluno.setStatus("ativo");
        ReflectionTestUtils.setField(aluno, "criadoEm", criadoEm);
        return aluno;
    }

    private static Inscricao inscricao(Aluno aluno, Curso curso, String status, String valor, LocalDateTime quando) {
        Turma turma = new Turma();
        turma.setCurso(curso);
        Inscricao inscricao = new Inscricao();
        inscricao.setAluno(aluno);
        inscricao.setTurma(turma);
        inscricao.setStatus(status);
        inscricao.setValorTotal(new BigDecimal(valor));
        ReflectionTestUtils.setField(inscricao, "dataInscricao", quando);
        return inscricao;
    }

    private static Matricula matricula(Aluno aluno, LocalDateTime quando) {
        Matricula matricula = new Matricula();
        matricula.setAluno(aluno);
        ReflectionTestUtils.setField(matricula, "criadoEm", quando);
        return matricula;
    }

    private static ItemCarrinho item(Aluno aluno, Curso curso, LocalDateTime quando) {
        Carrinho carrinho = new Carrinho();
        carrinho.setAluno(aluno);
        ItemCarrinho item = new ItemCarrinho();
        item.setCarrinho(carrinho);
        item.setCurso(curso);
        item.setAdicionadoEm(quando);
        return item;
    }

    private static EventoNavegacao evento(LocalDateTime quando, String tipo, String sessao, Integer aluno,
                                          Integer curso, String termo, Integer resultados) {
        return new EventoNavegacao(quando, tipo, sessao, aluno, curso, termo, resultados);
    }

    private static ContatoComercial contato(int aluno, LocalDateTime quando, String canal, String resultado) {
        ContatoComercial contato = new ContatoComercial();
        contato.setAlunoId(aluno);
        contato.setQuando(quando);
        contato.setCanal(canal);
        contato.setResultado(resultado);
        contato.setFuncionarioNome("Carla");
        return contato;
    }
}
