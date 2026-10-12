package com.aprendaplus.service;

import com.aprendaplus.dto.MinhaInscricao;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Carrinho;
import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.entity.Matricula;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.CarrinhoRepository;
import com.aprendaplus.repository.InscricaoRepository;
import com.aprendaplus.repository.ItemCarrinhoRepository;
import com.aprendaplus.repository.MatriculaRepository;
import com.aprendaplus.repository.TurmaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InscricaoServiceTest {

    @Mock
    private InscricaoRepository inscricaoRepository;

    @Mock
    private TurmaRepository turmaRepository;

    @Mock
    private AlunoRepository alunoRepository;

    @Mock
    private CarrinhoRepository carrinhoRepository;

    @Mock
    private ItemCarrinhoRepository itemCarrinhoRepository;

    @Mock
    private TurmaService turmaService;

    @Mock
    private MatriculaRepository matriculaRepository;

    @InjectMocks
    private InscricaoService inscricaoService;

    private Inscricao inscricao;

    @BeforeEach
    void setUp() {
        inscricao = new Inscricao();
        inscricao.setIdInscricao(1);
        inscricao.setStatus("pendente_pagamento");
        inscricao.setValorTotal(new BigDecimal("199.90"));
        // Por padrão, toda turma tem vaga (os testes de vagas mudam isso)
        lenient().when(turmaService.vagasRestantes(any())).thenReturn(10L);
    }

    // ===== Operações básicas (usadas pelo painel do admin) =====

    @Test
    void deveListarTodasAsInscricoes() {
        when(inscricaoRepository.findAll()).thenReturn(Arrays.asList(inscricao));

        List<Inscricao> resultado = inscricaoService.listarTodos();

        assertEquals(1, resultado.size());
    }

    @Test
    void deveBuscarInscricaoPorId() {
        when(inscricaoRepository.findById(1)).thenReturn(Optional.of(inscricao));

        Inscricao resultado = inscricaoService.buscarPorId(1);

        assertEquals("pendente_pagamento", resultado.getStatus());
    }

    @Test
    void deveAtualizarStatusDaInscricao() {
        inscricao.setStatus("confirmada");
        when(inscricaoRepository.save(inscricao)).thenReturn(inscricao);

        Inscricao resultado = inscricaoService.salvar(inscricao);

        assertEquals("confirmada", resultado.getStatus());
    }

    @Test
    void deveExcluirInscricao() {
        inscricaoService.deletar(1);

        verify(inscricaoRepository, times(1)).deleteById(1);
    }

    @Test
    void excluirInscricaoQueOcupavaVagaChamaOPrimeiroDaFila() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        Inscricao naFila = filaDaTurma3();

        inscricaoService.deletar(10);

        verify(inscricaoRepository).deleteById(10);
        assertEquals("pendente_pagamento", naFila.getStatus());
        verify(inscricaoRepository).save(naFila);
    }

    @Test
    void excluirInscricaoDaFilaNaoPromoveNinguem() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "aguardando_vaga")));

        inscricaoService.deletar(10);

        verify(inscricaoRepository, never()).findFirstByTurma_IdTurmaAndStatusOrderByIdInscricaoAsc(any(), any());
    }

    @Test
    void excluirInscricaoSemTurmaNaoPromoveNinguem() {
        Inscricao semTurma = inscricaoDoAluno(10, 7, 3, 2, "confirmada");
        semTurma.setTurma(null);
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(semTurma));

        inscricaoService.deletar(10);

        verify(inscricaoRepository, never()).findFirstByTurma_IdTurmaAndStatusOrderByIdInscricaoAsc(any(), any());
    }

    // ===== Compra feita pelo aluno: o valor é calculado no servidor =====

    // Cria a turma 3, de um curso de R$ 10.000,00 que pode ser pago em até 10x
    private void turmaDoCurso(String valor, Integer numeroParcelas) {
        Curso curso = new Curso();
        curso.setNome("Desenvolvimento Full Stack");
        curso.setValor(valor == null ? null : new BigDecimal(valor));
        curso.setNumeroParcelas(numeroParcelas);

        Turma turma = new Turma();
        turma.setIdTurma(3);
        turma.setCurso(curso);

        when(turmaRepository.findById(3)).thenReturn(Optional.of(turma));
    }

    // Monta o que chega do navegador: aqui com aluno, status e valor "adulterados"
    private Inscricao pedido(String formaPagamento) {
        Aluno outroAluno = new Aluno();
        outroAluno.setIdAluno(99);

        Turma turma = new Turma();
        turma.setIdTurma(3);

        Inscricao dados = new Inscricao();
        dados.setIdInscricao(50);
        dados.setAluno(outroAluno);
        dados.setTurma(turma);
        dados.setStatus("confirmada");
        dados.setValorTotal(new BigDecimal("0.01"));
        dados.setFormaPagamento(formaPagamento);
        dados.setObservacoes("Prefiro aulas à noite");
        return dados;
    }

    private void saveDevolveAPropriaInscricao() {
        when(inscricaoRepository.save(any(Inscricao.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void pixDeveTerCincoPorCentoDeDescontoCalculadoNoServidor() {
        turmaDoCurso("10000.00", 10);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("Pix à vista (5% de desconto)"), 7);

        // O valor enviado pelo navegador (R$ 0,01) é ignorado
        assertEquals(new BigDecimal("9500.00"), salva.getValorTotal());
        assertEquals("Pix à vista (5% de desconto)", salva.getFormaPagamento());
    }

    @Test
    void inscricaoDoAlunoUsaDadosDoServidorENaoDoNavegador() {
        turmaDoCurso("10000.00", 10);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7);

        assertNull(salva.getIdInscricao());                 // não sobrescreve outra inscrição
        assertEquals(7, salva.getAluno().getIdAluno());     // aluno do token, não o 99
        assertEquals("pendente_pagamento", salva.getStatus()); // não nasce confirmada
        assertEquals(3, salva.getTurma().getIdTurma());
        assertEquals("Prefiro aulas à noite", salva.getObservacoes());
    }

    @Test
    void descontoPixDeveSerArredondadoEmCentavos() {
        turmaDoCurso("199.90", 1);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("Pix"), 7);

        // 199,90 x 0,95 = 189,905 -> 189,91
        assertEquals(new BigDecimal("189.91"), salva.getValorTotal());
    }

    @Test
    void cartaoParceladoCobraOValorCheioDoCurso() {
        turmaDoCurso("10000", 10);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("Cartão de crédito · 10x"), 7);

        assertEquals(new BigDecimal("10000.00"), salva.getValorTotal());
        assertEquals("Cartão de crédito · 10x", salva.getFormaPagamento());
    }

    @Test
    void boletoParceladoCobraOValorCheioDoCurso() {
        turmaDoCurso("10000.00", 10);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("Boleto bancário · 4x"), 7);

        assertEquals(new BigDecimal("10000.00"), salva.getValorTotal());
        assertEquals("Boleto bancário · 4x", salva.getFormaPagamento());
    }

    @Test
    void formaDePagamentoSemParcelasEhConsideradaAVista() {
        turmaDoCurso("500.00", 3);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("CARTAO DE CREDITO"), 7);

        assertEquals("Cartão de crédito · 1x", salva.getFormaPagamento());
        assertEquals(new BigDecimal("500.00"), salva.getValorTotal());
    }

    @Test
    void naoPodeParcelarAcimaDoLimiteDoCurso() {
        turmaDoCurso("10000.00", 10);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("Cartão de crédito · 12x"), 7));

        assertEquals("Este pedido pode ser parcelado em no máximo 10x.", erro.getMessage());
        verify(inscricaoRepository, never()).save(any());
    }

    @Test
    void naoPodeEscolherZeroParcelas() {
        turmaDoCurso("10000.00", 10);

        assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("Boleto bancário · 0x"), 7));
        verify(inscricaoRepository, never()).save(any());
    }

    @Test
    void cursoSemLimiteDeParcelasSoPodeSerPagoAVista() {
        turmaDoCurso("800.00", null);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("Cartão de crédito · 2x"), 7));

        assertTrue(erro.getMessage().contains("no máximo 1x"));
    }

    @Test
    void cursoComLimiteZeradoSoPodeSerPagoAVista() {
        turmaDoCurso("800.00", 0);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("Boleto bancário · 1x"), 7);

        assertEquals("Boleto bancário · 1x", salva.getFormaPagamento());
    }

    @Test
    void formaDePagamentoDesconhecidaEhRecusada() {
        turmaDoCurso("10000.00", 10);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("Bitcoin"), 7));

        assertEquals("Escolha uma forma de pagamento válida: Pix, cartão ou boleto.", erro.getMessage());
    }

    @Test
    void formaDePagamentoVaziaEhRecusada() {
        turmaDoCurso("10000.00", 10);

        assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido(null), 7));
    }

    @Test
    void inscricaoSemTurmaEhRecusada() {
        Inscricao semTurma = pedido("pix");
        semTurma.setTurma(null);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(semTurma, 7));

        assertEquals("Informe a turma da inscrição.", erro.getMessage());
    }

    @Test
    void inscricaoComTurmaSemIdEhRecusada() {
        Inscricao turmaSemId = pedido("pix");
        turmaSemId.getTurma().setIdTurma(null);

        assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(turmaSemId, 7));
    }

    @Test
    void turmaInexistenteEhRecusada() {
        when(turmaRepository.findById(3)).thenReturn(Optional.empty());

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7));

        assertEquals("Turma não encontrada.", erro.getMessage());
    }

    @Test
    void turmaSemCursoEhRecusada() {
        Turma turma = new Turma();
        turma.setIdTurma(3);
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turma));

        assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7));
    }

    @Test
    void cursoSemValorEhRecusado() {
        turmaDoCurso(null, 10);

        assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7));
    }

    // ===== Vários cursos no carrinho: vale o MAIOR limite de parcelas =====

    // Coloca no carrinho do aluno 7 cursos com os limites de parcelas informados
    private void carrinhoComCursosDe(Integer... limites) {
        Carrinho carrinho = new Carrinho();
        carrinho.setIdCarrinho(30);
        when(carrinhoRepository.findFirstByAluno_IdAluno(7)).thenReturn(Optional.of(carrinho));

        List<ItemCarrinho> itens = Arrays.stream(limites).map(limite -> {
            Curso curso = new Curso();
            curso.setNumeroParcelas(limite);
            ItemCarrinho item = new ItemCarrinho();
            item.setCurso(curso);
            return item;
        }).toList();
        when(itemCarrinhoRepository.findByCarrinho_IdCarrinho(30)).thenReturn(itens);
    }

    @Test
    void cursoCurtoPodeSerParceladoAteOLimiteDoCursoMaisLongoDoCarrinho() {
        // Técnico (até 12x) junto com Redes (até 36x) no carrinho: pode 36x
        turmaDoCurso("4800.00", 12);
        carrinhoComCursosDe(12, 36);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("Boleto bancário · 36x"), 7);

        assertEquals("Boleto bancário · 36x", salva.getFormaPagamento());
        assertEquals(new BigDecimal("4800.00"), salva.getValorTotal());
    }

    @Test
    void acimaDoMaiorLimiteDoCarrinhoContinuaRecusado() {
        turmaDoCurso("4800.00", 12);
        carrinhoComCursosDe(12, 36);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("Cartão de crédito · 48x"), 7));

        assertEquals("Este pedido pode ser parcelado em no máximo 36x.", erro.getMessage());
        verify(inscricaoRepository, never()).save(any());
    }

    @Test
    void cursoDoCarrinhoSemLimiteOuSemCursoNaoAumentaOMaximo() {
        turmaDoCurso("4800.00", 12);
        Carrinho carrinho = new Carrinho();
        carrinho.setIdCarrinho(30);
        when(carrinhoRepository.findFirstByAluno_IdAluno(7)).thenReturn(Optional.of(carrinho));
        Curso semLimite = new Curso();
        ItemCarrinho itemSemLimite = new ItemCarrinho();
        itemSemLimite.setCurso(semLimite);
        ItemCarrinho itemSemCurso = new ItemCarrinho();
        when(itemCarrinhoRepository.findByCarrinho_IdCarrinho(30)).thenReturn(List.of(itemSemLimite, itemSemCurso));

        assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("Cartão de crédito · 13x"), 7));
    }

    @Test
    void alunoSemCarrinhoUsaOLimiteDoProprioCurso() {
        turmaDoCurso("4800.00", 12);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("Cartão de crédito · 12x"), 7);

        assertEquals("Cartão de crédito · 12x", salva.getFormaPagamento());
    }

    // ===== Conta do aluno =====

    private void alunoComStatus(String status) {
        Aluno aluno = new Aluno();
        aluno.setIdAluno(7);
        aluno.setStatus(status);
        when(alunoRepository.findById(7)).thenReturn(Optional.of(aluno));
    }

    @Test
    void alunoBloqueadoNaoConsegueComprar() {
        alunoComStatus("bloqueado");

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7));

        assertEquals("Sua conta está bloqueada. Entre em contato com o suporte.", erro.getMessage());
        verify(inscricaoRepository, never()).save(any());
        verify(turmaRepository, never()).findById(any());
    }

    @Test
    void alunoInativoNaoConsegueComprar() {
        alunoComStatus("inativo");

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7));

        assertTrue(erro.getMessage().contains("inativa"));
        verify(inscricaoRepository, never()).save(any());
    }

    @Test
    void alunoAtivoCompraNormalmente() {
        alunoComStatus("ativo");
        turmaDoCurso("1000.00", 10);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7);

        assertEquals(new BigDecimal("950.00"), salva.getValorTotal());
    }

    // ===== Vagas e inscrição repetida =====

    @Test
    void turmaLotadaColocaOAlunoNaListaDeEspera() {
        turmaDoCurso("1000.00", 10);
        when(turmaService.vagasRestantes(any())).thenReturn(0L);
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7);

        assertEquals("aguardando_vaga", salva.getStatus());
        assertEquals(new BigDecimal("950.00"), salva.getValorTotal());
    }

    @Test
    void turmaComInscricoesEncerradasNaoAceitaInscricao() {
        Curso curso = new Curso();
        curso.setValor(new BigDecimal("1000.00"));
        Turma turma = new Turma();
        turma.setIdTurma(3);
        turma.setNome("Turma Antiga");
        turma.setCurso(curso);
        turma.setStatus("em_andamento");
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turma));

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7));

        assertEquals("As inscrições da turma \"Turma Antiga\" não estão abertas.", erro.getMessage());
        verify(inscricaoRepository, never()).save(any());
    }

    // Inscrição que o aluno já tem, numa turma do curso informado
    private Inscricao inscricaoExistente(int idCurso, String status) {
        Curso curso = new Curso();
        curso.setIdCurso(idCurso);
        Turma turma = new Turma();
        turma.setIdTurma(8);
        turma.setCurso(curso);
        Inscricao existente = new Inscricao();
        existente.setTurma(turma);
        existente.setStatus(status);
        return existente;
    }

    private void turmaDoCursoComId(int idCurso) {
        Curso curso = new Curso();
        curso.setIdCurso(idCurso);
        curso.setNome("Redes de Computadores");
        curso.setValor(new BigDecimal("1000.00"));
        curso.setNumeroParcelas(10);
        Turma turma = new Turma();
        turma.setIdTurma(3);
        turma.setCurso(curso);
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turma));
    }

    @Test
    void alunoNaoSeInscreveDuasVezesNoMesmoCurso() {
        turmaDoCursoComId(2);
        when(inscricaoRepository.findByAluno_IdAlunoOrderByIdInscricaoDesc(7))
                .thenReturn(List.of(inscricaoExistente(2, "pendente_pagamento")));

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7));

        assertTrue(erro.getMessage().contains("Você já tem uma inscrição no curso \"Redes de Computadores\""));
        verify(inscricaoRepository, never()).save(any());
    }

    @Test
    void inscricaoCanceladaOuDeOutroCursoNaoImpedeNovaInscricao() {
        turmaDoCursoComId(2);
        Inscricao semTurma = new Inscricao();
        semTurma.setStatus("pendente_pagamento");
        Inscricao turmaSemCurso = inscricaoExistente(2, "pendente_pagamento");
        turmaSemCurso.getTurma().setCurso(null);
        when(inscricaoRepository.findByAluno_IdAlunoOrderByIdInscricaoDesc(7)).thenReturn(List.of(
                inscricaoExistente(2, "cancelada"), inscricaoExistente(5, "confirmada"), semTurma, turmaSemCurso));
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.criarInscricaoDoAluno(pedido("pix"), 7);

        assertEquals("pendente_pagamento", salva.getStatus());
    }

    // ===== Minhas inscrições =====

    private Inscricao inscricaoDoAluno(int idInscricao, int idAluno, int idTurma, int idCurso, String status) {
        Aluno aluno = new Aluno();
        aluno.setIdAluno(idAluno);
        Curso curso = new Curso();
        curso.setIdCurso(idCurso);
        curso.setNome("Curso " + idCurso);
        Turma turma = new Turma();
        turma.setIdTurma(idTurma);
        turma.setNome("Turma " + idTurma);
        turma.setModalidade("Presencial");
        turma.setDiasHorarios("Seg 19h");
        turma.setCurso(curso);
        Inscricao i = new Inscricao();
        i.setIdInscricao(idInscricao);
        i.setAluno(aluno);
        i.setTurma(turma);
        i.setStatus(status);
        i.setFormaPagamento("Pix");
        i.setValorTotal(new BigDecimal("950.00"));
        return i;
    }

    @Test
    void listaAsInscricoesDoAlunoComOQueEleTemDireito() {
        Inscricao semTurma = new Inscricao();
        semTurma.setIdInscricao(11);
        semTurma.setStatus("cancelada");
        when(inscricaoRepository.findByAluno_IdAlunoOrderByIdInscricaoDesc(7)).thenReturn(List.of(
                inscricaoDoAluno(10, 7, 3, 2, "confirmada"), semTurma));

        List<MinhaInscricao> minhas = inscricaoService.listarDoAluno(7);

        assertEquals(2, minhas.size());
        assertEquals("Curso 2", minhas.get(0).curso());
        assertEquals("Turma 3", minhas.get(0).turma());
        assertEquals("Seg 19h", minhas.get(0).diasHorarios());
        assertTrue(minhas.get(0).podeTrocarTurma());
        assertNull(minhas.get(1).turma());
        assertFalse(minhas.get(1).podeTrocarTurma());
    }

    // ===== Troca de turma =====

    private Turma turmaNova(int idTurma, int idCurso) {
        Curso curso = new Curso();
        curso.setIdCurso(idCurso);
        curso.setNome("Curso " + idCurso);
        Turma turma = new Turma();
        turma.setIdTurma(idTurma);
        turma.setNome("Turma " + idTurma);
        turma.setCurso(curso);
        return turma;
    }

    @Test
    void alunoTrocaParaOutraTurmaComVagaDoMesmoCurso() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "pendente_pagamento")));
        when(turmaRepository.findById(4)).thenReturn(Optional.of(turmaNova(4, 2)));
        // A turma antiga é consultada para chamar alguém da lista de espera
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turmaNova(3, 2)));
        saveDevolveAPropriaInscricao();

        MinhaInscricao resultado = inscricaoService.trocarTurma(10, 4, 7);

        assertEquals(4, resultado.idTurma());
        assertEquals("Turma 4", resultado.turma());
    }

    @Test
    void adminTrocaATurmaDeQualquerAluno() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        when(turmaRepository.findById(4)).thenReturn(Optional.of(turmaNova(4, 2)));
        // A turma antiga é consultada para chamar alguém da lista de espera
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turmaNova(3, 2)));
        saveDevolveAPropriaInscricao();

        assertEquals(4, inscricaoService.trocarTurma(10, 4, null).idTurma());
    }

    private void trocaRecusada(String mensagemEsperada, Integer idNovaTurma, Integer idAluno) {
        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.trocarTurma(10, idNovaTurma, idAluno));
        assertEquals(mensagemEsperada, erro.getMessage());
        verify(inscricaoRepository, never()).save(any());
    }

    @Test
    void inscricaoInexistenteNaoTroca() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.empty());
        trocaRecusada("Inscrição não encontrada.", 4, 7);
    }

    @Test
    void alunoNaoTrocaInscricaoDeOutroAluno() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 99, 3, 2, "confirmada")));
        trocaRecusada("Inscrição não encontrada.", 4, 7);
    }

    @Test
    void inscricaoSemAlunoNaoEhTrocadaPorAluno() {
        Inscricao semAluno = inscricaoDoAluno(10, 7, 3, 2, "confirmada");
        semAluno.setAluno(null);
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(semAluno));
        trocaRecusada("Inscrição não encontrada.", 4, 7);
    }

    @Test
    void inscricaoCanceladaOuConcluidaNaoTroca() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "concluida")));
        trocaRecusada("Esta inscrição não permite mais troca de turma.", 4, 7);
    }

    @Test
    void precisaInformarANovaTurma() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        trocaRecusada("Escolha a nova turma.", null, 7);
    }

    @Test
    void naoTrocaParaAMesmaTurma() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        trocaRecusada("Você já está nesta turma.", 3, 7);
    }

    @Test
    void novaTurmaInexistenteNaoTroca() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        when(turmaRepository.findById(4)).thenReturn(Optional.empty());
        trocaRecusada("Turma não encontrada.", 4, 7);
    }

    @Test
    void naoTrocaParaTurmaDeOutroCurso() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        when(turmaRepository.findById(4)).thenReturn(Optional.of(turmaNova(4, 9)));
        trocaRecusada("A nova turma precisa ser do mesmo curso da inscrição.", 4, 7);
    }

    @Test
    void inscricaoSemTurmaAtualNaoTroca() {
        Inscricao semTurma = inscricaoDoAluno(10, 7, 3, 2, "confirmada");
        semTurma.setTurma(null);
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(semTurma));
        when(turmaRepository.findById(4)).thenReturn(Optional.of(turmaNova(4, 2)));
        trocaRecusada("A nova turma precisa ser do mesmo curso da inscrição.", 4, 7);
    }

    @Test
    void naoTrocaParaTurmaLotada() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        when(turmaRepository.findById(4)).thenReturn(Optional.of(turmaNova(4, 2)));
        when(turmaService.vagasRestantes(any())).thenReturn(0L);
        trocaRecusada("A turma \"Turma 4\" não tem mais vagas.", 4, 7);
    }

    @Test
    void naoTrocaParaTurmaComInscricoesFechadas() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        Turma fechada = turmaNova(4, 2);
        fechada.setStatus("planejada");
        when(turmaRepository.findById(4)).thenReturn(Optional.of(fechada));
        trocaRecusada("As inscrições da turma \"Turma 4\" não estão abertas.", 4, 7);
    }

    @Test
    void quemEstaNaFilaETrocaParaTurmaComVagaPassaAPendente() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "aguardando_vaga")));
        when(turmaRepository.findById(4)).thenReturn(Optional.of(turmaNova(4, 2)));
        saveDevolveAPropriaInscricao();

        MinhaInscricao resultado = inscricaoService.trocarTurma(10, 4, 7);

        assertEquals("pendente_pagamento", resultado.status());
        assertEquals(4, resultado.idTurma());
        // Quem estava na fila não liberou vaga nenhuma
        verify(inscricaoRepository, never()).findFirstByTurma_IdTurmaAndStatusOrderByIdInscricaoAsc(any(), any());
    }

    @Test
    void trocaLevaAMatriculaJuntoEChamaOPrimeiroDaFilaDaTurmaAntiga() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        when(turmaRepository.findById(4)).thenReturn(Optional.of(turmaNova(4, 2)));
        saveDevolveAPropriaInscricao();
        Matricula matricula = matricula(7, 3, "ativa");
        when(matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 3)).thenReturn(Optional.of(matricula));
        Inscricao naFila = filaDaTurma3();

        MinhaInscricao resultado = inscricaoService.trocarTurma(10, 4, 7);

        assertEquals("confirmada", resultado.status());
        assertEquals(4, matricula.getTurma().getIdTurma());
        verify(matriculaRepository).save(matricula);
        assertEquals("pendente_pagamento", naFila.getStatus());
    }

    @Test
    void adminTrocaInscricaoSemAlunoSemMexerEmMatricula() {
        Inscricao semAluno = inscricaoDoAluno(10, 7, 3, 2, "pendente_pagamento");
        semAluno.setAluno(null);
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(semAluno));
        when(turmaRepository.findById(4)).thenReturn(Optional.of(turmaNova(4, 2)));
        // A turma antiga é consultada para chamar alguém da lista de espera
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turmaNova(3, 2)));
        saveDevolveAPropriaInscricao();

        assertEquals(4, inscricaoService.trocarTurma(10, 4, null).idTurma());
        verifyNoInteractions(matriculaRepository);
    }

    // ===== Painel do admin: status da inscrição x matrícula x lista de espera =====

    private Matricula matricula(int idAluno, int idTurma, String status) {
        Aluno aluno = new Aluno();
        aluno.setIdAluno(idAluno);
        Turma turma = new Turma();
        turma.setIdTurma(idTurma);
        Matricula m = new Matricula();
        m.setIdMatricula(1);
        m.setAluno(aluno);
        m.setTurma(turma);
        m.setStatus(status);
        return m;
    }

    // A turma 3 existe e tem uma inscrição esperando vaga
    private Inscricao filaDaTurma3() {
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turmaNova(3, 2)));
        Inscricao naFila = inscricaoDoAluno(20, 8, 3, 2, "aguardando_vaga");
        when(inscricaoRepository.findFirstByTurma_IdTurmaAndStatusOrderByIdInscricaoAsc(3, "aguardando_vaga"))
                .thenReturn(Optional.of(naFila));
        return naFila;
    }

    // O que o painel envia: a inscrição inteira com o novo status
    private Inscricao doPainel(int idAluno, int idTurma, String status) {
        Inscricao dados = inscricaoDoAluno(10, idAluno, idTurma, 2, status);
        dados.setIdInscricao(null);
        dados.setFormaPagamento("Cartão de crédito · 3x");
        return dados;
    }

    @Test
    void adminAtualizaInscricaoInexistente() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.empty());

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.atualizarPeloAdmin(10, doPainel(7, 3, "confirmada")));

        assertEquals("Inscrição não encontrada.", erro.getMessage());
    }

    @Test
    void confirmarPagamentoCriaAMatriculaDoAluno() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "pendente_pagamento")));
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.atualizarPeloAdmin(10, doPainel(7, 3, "confirmada"));

        assertEquals(10, salva.getIdInscricao());
        assertEquals("confirmada", salva.getStatus());
        ArgumentCaptor<Matricula> captor = ArgumentCaptor.forClass(Matricula.class);
        verify(matriculaRepository).save(captor.capture());
        Matricula criada = captor.getValue();
        assertEquals(7, criada.getAluno().getIdAluno());
        assertEquals(3, criada.getTurma().getIdTurma());
        assertEquals("ativa", criada.getStatus());
        assertEquals("Cartão de crédito · 3x", criada.getPlanoPagamento());
    }

    @Test
    void confirmarDeNovoNaoDuplicaAMatriculaEReativaACancelada() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        saveDevolveAPropriaInscricao();
        Matricula existente = matricula(7, 3, "cancelada");
        when(matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 3)).thenReturn(Optional.of(existente));

        inscricaoService.atualizarPeloAdmin(10, doPainel(7, 3, "confirmada"));

        verify(matriculaRepository, times(1)).save(existente);
        assertEquals("ativa", existente.getStatus());
    }

    @Test
    void naoTiraDaFilaSeATurmaNaoTemVaga() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "aguardando_vaga")));
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turmaNova(3, 2)));
        when(turmaService.vagasRestantes(any())).thenReturn(0L);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.atualizarPeloAdmin(10, doPainel(7, 3, "confirmada")));

        assertEquals("A turma \"Turma 3\" não tem vaga. A inscrição continua aguardando vaga.", erro.getMessage());
        verify(inscricaoRepository, never()).save(any());
        verifyNoInteractions(matriculaRepository);
    }

    @Test
    void tiraDaFilaQuandoATurmaTemVaga() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "aguardando_vaga")));
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turmaNova(3, 2)));
        saveDevolveAPropriaInscricao();

        Inscricao salva = inscricaoService.atualizarPeloAdmin(10, doPainel(7, 3, "pendente_pagamento"));

        assertEquals("pendente_pagamento", salva.getStatus());
        verify(matriculaRepository, never()).save(any());
    }

    @Test
    void adminMudarParaTurmaInexistenteEhRecusado() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "pendente_pagamento")));
        when(turmaRepository.findById(4)).thenReturn(Optional.empty());

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> inscricaoService.atualizarPeloAdmin(10, doPainel(7, 4, "pendente_pagamento")));

        assertEquals("Turma não encontrada.", erro.getMessage());
    }

    @Test
    void cancelarInscricaoCancelaAMatriculaEChamaOPrimeiroDaFila() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        saveDevolveAPropriaInscricao();
        Matricula ativa = matricula(7, 3, "ativa");
        when(matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 3)).thenReturn(Optional.of(ativa));
        Inscricao naFila = filaDaTurma3();

        inscricaoService.atualizarPeloAdmin(10, doPainel(7, 3, "cancelada"));

        assertEquals("cancelada", ativa.getStatus());
        assertEquals("pendente_pagamento", naFila.getStatus());
        verify(inscricaoRepository).save(naFila);
    }

    @Test
    void cancelarSemNinguemNaFilaSoLiberaAVaga() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "pendente_pagamento")));
        saveDevolveAPropriaInscricao();
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turmaNova(3, 2)));

        Inscricao salva = inscricaoService.atualizarPeloAdmin(10, doPainel(7, 3, "cancelada"));

        assertEquals("cancelada", salva.getStatus());
        verify(matriculaRepository, never()).save(any());
        verify(inscricaoRepository, times(1)).save(any());
    }

    @Test
    void naoPromoveSeATurmaAntigaContinuaSemVaga() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "pendente_pagamento")));
        saveDevolveAPropriaInscricao();
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turmaNova(3, 2)));
        when(turmaService.vagasRestantes(any())).thenReturn(0L);

        inscricaoService.atualizarPeloAdmin(10, doPainel(7, 3, "cancelada"));

        verify(inscricaoRepository, never()).findFirstByTurma_IdTurmaAndStatusOrderByIdInscricaoAsc(any(), any());
    }

    @Test
    void naoPromoveSeATurmaAntigaNaoExisteMais() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "pendente_pagamento")));
        saveDevolveAPropriaInscricao();
        when(turmaRepository.findById(3)).thenReturn(Optional.empty());

        inscricaoService.atualizarPeloAdmin(10, doPainel(7, 3, "cancelada"));

        verify(inscricaoRepository, never()).findFirstByTurma_IdTurmaAndStatusOrderByIdInscricaoAsc(any(), any());
    }

    @Test
    void concluirInscricaoConcluiAMatricula() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        saveDevolveAPropriaInscricao();
        Matricula ativa = matricula(7, 3, "ativa");
        when(matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 3)).thenReturn(Optional.of(ativa));

        inscricaoService.atualizarPeloAdmin(10, doPainel(7, 3, "concluida"));

        assertEquals("concluida", ativa.getStatus());
        verify(matriculaRepository).save(ativa);
    }

    @Test
    void cancelarOuConcluirSemMatriculaNaoCriaMatricula() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "aguardando_vaga")));
        saveDevolveAPropriaInscricao();

        inscricaoService.atualizarPeloAdmin(10, doPainel(7, 3, "cancelada"));

        verify(matriculaRepository, never()).save(any());
    }

    @Test
    void adminTrocaATurmaPeloFormularioEAMatriculaVaiJunto() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        when(turmaRepository.findById(4)).thenReturn(Optional.of(turmaNova(4, 2)));
        saveDevolveAPropriaInscricao();
        Matricula antiga = matricula(7, 3, "ativa");
        when(matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 4)).thenReturn(Optional.empty());
        when(matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 3)).thenReturn(Optional.of(antiga));
        Inscricao naFila = filaDaTurma3();

        inscricaoService.atualizarPeloAdmin(10, doPainel(7, 4, "confirmada"));

        assertEquals(4, antiga.getTurma().getIdTurma());
        assertEquals("ativa", antiga.getStatus());
        verify(matriculaRepository, times(1)).save(antiga);
        assertEquals("pendente_pagamento", naFila.getStatus());
    }

    @Test
    void adminTrocaATurmaDeUmaInscricaoPendenteComMatriculaAntiga() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "pendente_pagamento")));
        when(turmaRepository.findById(4)).thenReturn(Optional.of(turmaNova(4, 2)));
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turmaNova(3, 2)));
        saveDevolveAPropriaInscricao();
        Matricula antiga = matricula(7, 3, "trancada");
        when(matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 4)).thenReturn(Optional.empty());
        when(matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(7, 3)).thenReturn(Optional.of(antiga));

        inscricaoService.atualizarPeloAdmin(10, doPainel(7, 4, "pendente_pagamento"));

        assertEquals(4, antiga.getTurma().getIdTurma());
        assertEquals("trancada", antiga.getStatus());
        verify(matriculaRepository).save(antiga);
    }

    @Test
    void adminTrocaDeTurmaSemMatriculaNenhuma() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "pendente_pagamento")));
        when(turmaRepository.findById(4)).thenReturn(Optional.of(turmaNova(4, 2)));
        when(turmaRepository.findById(3)).thenReturn(Optional.of(turmaNova(3, 2)));
        saveDevolveAPropriaInscricao();

        inscricaoService.atualizarPeloAdmin(10, doPainel(7, 4, "pendente_pagamento"));

        verify(matriculaRepository, never()).save(any());
    }

    @Test
    void camposVaziosDoPainelMantemOsDaInscricao() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        saveDevolveAPropriaInscricao();
        Inscricao soObservacao = new Inscricao();
        soObservacao.setStatus(" ");
        soObservacao.setValorTotal(new BigDecimal("950.00"));

        Inscricao salva = inscricaoService.atualizarPeloAdmin(10, soObservacao);

        assertEquals("confirmada", salva.getStatus());
        assertEquals(7, salva.getAluno().getIdAluno());
        assertEquals(3, salva.getTurma().getIdTurma());
    }

    @Test
    void painelComAlunoOuTurmaSemIdUsaOsDaInscricao() {
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(inscricaoDoAluno(10, 7, 3, 2, "confirmada")));
        saveDevolveAPropriaInscricao();
        Inscricao dados = new Inscricao();
        dados.setStatus(null);
        dados.setAluno(new Aluno());
        dados.setTurma(new Turma());

        Inscricao salva = inscricaoService.atualizarPeloAdmin(10, dados);

        assertEquals(7, salva.getAluno().getIdAluno());
        assertEquals(3, salva.getTurma().getIdTurma());
    }

    @Test
    void inscricaoAntigaSemAlunoNemTurmaNaoMexeEmMatricula() {
        Inscricao vazia = new Inscricao();
        vazia.setIdInscricao(10);
        vazia.setStatus("pendente_pagamento");
        when(inscricaoRepository.findById(10)).thenReturn(Optional.of(vazia));
        saveDevolveAPropriaInscricao();
        Inscricao dados = new Inscricao();
        dados.setStatus("confirmada");

        inscricaoService.atualizarPeloAdmin(10, dados);

        verifyNoInteractions(matriculaRepository);
    }
}
