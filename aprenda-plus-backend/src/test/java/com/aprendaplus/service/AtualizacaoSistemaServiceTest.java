package com.aprendaplus.service;

import com.aprendaplus.entity.AtualizacaoSistema;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AtualizacaoSistemaRepository;
import com.aprendaplus.service.AtualizacaoSistemaService.Dados;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AtualizacaoSistemaServiceTest {

    private static final LocalDateTime INICIO = LocalDateTime.of(2026, 11, 20, 22, 0);
    private static final LocalDateTime FIM = LocalDateTime.of(2026, 11, 20, 22, 30);

    @Mock
    private AtualizacaoSistemaRepository repository;

    @InjectMocks
    private AtualizacaoSistemaService service;

    private static String erro(Runnable acao) {
        return assertThrows(RegraDeNegocioException.class, acao::run).getMessage();
    }

    @Test
    void listaDaMaisNovaParaAMaisAntiga() {
        List<AtualizacaoSistema> lista = List.of(new AtualizacaoSistema());
        when(repository.findAllByOrderByPublicadoEmDescIdAtualizacaoDesc()).thenReturn(lista);
        assertSame(lista, service.listar());
    }

    @Test
    void manutencoesPendentesSaoAsQueAindaNaoTerminaram() {
        List<AtualizacaoSistema> lista = List.of(new AtualizacaoSistema());
        when(repository.findByTipoAndFimManutencaoAfterOrderByInicioManutencaoAsc(eq("manutencao"), any())).thenReturn(lista);
        assertSame(lista, service.manutencoesPendentes());
    }

    @Test
    void publicaUmaNovidadeSemDatasDeManutencao() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        AtualizacaoSistema nova = service.criar(
                new Dados("  Chamados de suporte ", " Agora dá para abrir chamados. ", "novidade", " v1.9 ", INICIO, FIM), 1);

        assertEquals("Chamados de suporte", nova.getTitulo());
        assertEquals("Agora dá para abrir chamados.", nova.getDescricao());
        assertEquals("novidade", nova.getTipo());
        assertEquals("v1.9", nova.getVersao());
        assertNull(nova.getInicioManutencao());          // datas só valem para manutenção
        assertNull(nova.getFimManutencao());
        assertEquals(1, nova.getCriadoPorId());
        assertNotNull(nova.getPublicadoEm());
        assertEquals(nova.getPublicadoEm(), nova.getAtualizadoEm());
    }

    @Test
    void publicaUmaManutencaoProgramada() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        AtualizacaoSistema manutencao = service.criar(
                new Dados("Manutenção do servidor", "O sistema ficará fora do ar.", "manutencao", "", INICIO, FIM), 1);
        assertEquals(INICIO, manutencao.getInicioManutencao());
        assertEquals(FIM, manutencao.getFimManutencao());
        assertNull(manutencao.getVersao());
    }

    @Test
    void editaSemMudarQuemPublicouNemQuando() {
        AtualizacaoSistema existente = new AtualizacaoSistema();
        existente.setIdAtualizacao(4);
        existente.setCriadoPorId(1);
        LocalDateTime publicada = LocalDateTime.of(2026, 11, 1, 9, 0);
        existente.setPublicadoEm(publicada);
        when(repository.findById(4)).thenReturn(Optional.of(existente));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        AtualizacaoSistema editada = service.editar(4, new Dados("Novo título", "Texto", "correcao", null, null, null));

        assertEquals("Novo título", editada.getTitulo());
        assertEquals("correcao", editada.getTipo());
        assertEquals(publicada, editada.getPublicadoEm());
        assertEquals(1, editada.getCriadoPorId());
        assertNotNull(editada.getAtualizadoEm());
    }

    @Test
    void excluiAAtualizacao() {
        AtualizacaoSistema existente = new AtualizacaoSistema();
        when(repository.findById(4)).thenReturn(Optional.of(existente));
        service.excluir(4);
        verify(repository).delete(existente);
    }

    @Test
    void atualizacaoInexistente() {
        assertEquals("Atualização não encontrada.", erro(() -> service.excluir(99)));
        assertEquals("Atualização não encontrada.", erro(() -> service.editar(null, null)));
    }

    @Test
    void validaOsDados() {
        assertEquals("Informe os dados da atualização.", erro(() -> service.criar(null, 1)));
        assertEquals("Informe o título da atualização.",
                erro(() -> service.criar(new Dados(" ", "x", "novidade", null, null, null), 1)));
        assertEquals("O título pode ter no máximo 150 caracteres.",
                erro(() -> service.criar(new Dados("t".repeat(151), "x", "novidade", null, null, null), 1)));
        assertEquals("Descreva o que mudou.",
                erro(() -> service.criar(new Dados("T", null, "novidade", null, null, null), 1)));
        assertEquals("A descrição pode ter no máximo 5000 caracteres.",
                erro(() -> service.criar(new Dados("T", "d".repeat(5001), "novidade", null, null, null), 1)));
        assertEquals("Escolha o tipo: novidade, melhoria, correção ou manutenção.",
                erro(() -> service.criar(new Dados("T", "x", "lancamento", null, null, null), 1)));
        assertEquals("Escolha o tipo: novidade, melhoria, correção ou manutenção.",
                erro(() -> service.criar(new Dados("T", "x", null, null, null, null), 1)));
        assertEquals("A versão pode ter no máximo 20 caracteres.",
                erro(() -> service.criar(new Dados("T", "x", "melhoria", "v".repeat(21), null, null), 1)));
        assertEquals("Informe o início e o fim da manutenção.",
                erro(() -> service.criar(new Dados("T", "x", "manutencao", null, INICIO, null), 1)));
        assertEquals("Informe o início e o fim da manutenção.",
                erro(() -> service.criar(new Dados("T", "x", "manutencao", null, null, FIM), 1)));
        assertEquals("O fim da manutenção precisa ser depois do início.",
                erro(() -> service.criar(new Dados("T", "x", "manutencao", null, FIM, INICIO), 1)));
        assertEquals("O fim da manutenção precisa ser depois do início.",
                erro(() -> service.criar(new Dados("T", "x", "manutencao", null, INICIO, INICIO), 1)));
        verify(repository, never()).save(any());
    }

    @Test
    void guardaQuemPublicou() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        service.criar(new Dados("T", "x", "melhoria", null, null, null), 7);
        ArgumentCaptor<AtualizacaoSistema> salvo = ArgumentCaptor.forClass(AtualizacaoSistema.class);
        verify(repository).save(salvo.capture());
        assertEquals(7, salvo.getValue().getCriadoPorId());
    }
}
