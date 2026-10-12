package com.aprendaplus.service;

import com.aprendaplus.dto.MeuAcesso;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.NivelAcesso;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.NivelAcessoRepository;
import com.aprendaplus.security.Modulos;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NivelAcessoServiceTest {

    @Mock
    private NivelAcessoRepository nivelAcessoRepository;

    @Mock
    private FuncionarioRepository funcionarioRepository;

    @InjectMocks
    private NivelAcessoService nivelAcessoService;

    private static NivelAcesso nivel(Integer id, String nome, String modulos, boolean master) {
        NivelAcesso n = new NivelAcesso();
        n.setIdNivel(id);
        n.setNome(nome);
        n.setModulosTexto(modulos);
        n.setMaster(master);
        return n;
    }

    private static Funcionario funcionario(int id, String status, NivelAcesso nivel) {
        Funcionario f = new Funcionario();
        f.setIdFuncionario(id);
        f.setStatus(status);
        f.setNivel(nivel);
        return f;
    }

    private void saveDevolveOProprio() {
        when(nivelAcessoRepository.save(any(NivelAcesso.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void salvarRecusado(NivelAcesso nivel, String mensagem) {
        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> nivelAcessoService.salvar(nivel));
        assertEquals(mensagem, erro.getMessage());
        verify(nivelAcessoRepository, never()).save(any());
    }

    // ===== Cadastro de níveis =====

    @Test
    void listaComOMasterPrimeiro() {
        when(nivelAcessoRepository.findAllByOrderByMasterDescNomeAsc())
                .thenReturn(List.of(nivel(1, "Master", "", true), nivel(2, "Financeiro", "", false)));

        assertEquals("Master", nivelAcessoService.listar().get(0).getNome());
    }

    @Test
    void criaNivelComNomeLimpoESoModulosValidos() {
        saveDevolveOProprio();
        NivelAcesso novo = new NivelAcesso();
        novo.setNome("  Contabilidade ");
        novo.setModulos(List.of("matriculas", "sistema", "xpto", "inscricoes"));
        novo.setMaster(true);

        NivelAcesso salvo = nivelAcessoService.salvar(novo);

        assertEquals("Contabilidade", salvo.getNome());
        assertEquals(List.of("inscricoes", "matriculas"), salvo.getModulos());
        assertFalse(salvo.isMaster()); // ninguém cria outro Master pela API
    }

    @Test
    void editaUmNivelComum() {
        when(nivelAcessoRepository.findById(3)).thenReturn(Optional.of(nivel(3, "Financeiro", "inscricoes", false)));
        when(nivelAcessoRepository.findFirstByNomeIgnoreCase("Financeiro"))
                .thenReturn(Optional.of(nivel(3, "Financeiro", "inscricoes", false)));
        saveDevolveOProprio();
        NivelAcesso edicao = nivel(3, "Financeiro", "inscricoes,matriculas", false);

        assertEquals(List.of("inscricoes", "matriculas"), nivelAcessoService.salvar(edicao).getModulos());
    }

    @Test
    void nomeObrigatorio() {
        salvarRecusado(nivel(null, "   ", "", false), "Informe o nome do nível.");
        salvarRecusado(nivel(null, null, "", false), "Informe o nome do nível.");
    }

    @Test
    void nomeMuitoGrande() {
        salvarRecusado(nivel(null, "x".repeat(51), "", false), "O nome do nível pode ter no máximo 50 caracteres.");
    }

    @Test
    void nomeRepetidoEhRecusado() {
        when(nivelAcessoRepository.findFirstByNomeIgnoreCase("financeiro"))
                .thenReturn(Optional.of(nivel(3, "Financeiro", "", false)));

        salvarRecusado(nivel(null, "financeiro", "", false), "Já existe um nível com o nome \"Financeiro\".");
    }

    @Test
    void masterNaoPodeSerAlterado() {
        when(nivelAcessoRepository.findById(1)).thenReturn(Optional.of(nivel(1, "Master", "", true)));

        salvarRecusado(nivel(1, "Chefe", "", false), "O nível Master tem acesso a tudo e não pode ser alterado.");
    }

    @Test
    void editarNivelInexistente() {
        when(nivelAcessoRepository.findById(9)).thenReturn(Optional.empty());

        salvarRecusado(nivel(9, "Novo", "", false), "Nível de acesso não encontrado.");
    }

    @Test
    void excluiNivelSemFuncionarios() {
        when(nivelAcessoRepository.findById(4)).thenReturn(Optional.of(nivel(4, "Estagiário", "", false)));
        when(funcionarioRepository.countByNivel_IdNivel(4)).thenReturn(0L);

        nivelAcessoService.deletar(4);

        verify(nivelAcessoRepository).deleteById(4);
    }

    @Test
    void naoExcluiNivelEmUso() {
        when(nivelAcessoRepository.findById(3)).thenReturn(Optional.of(nivel(3, "Financeiro", "", false)));
        when(funcionarioRepository.countByNivel_IdNivel(3)).thenReturn(1L);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> nivelAcessoService.deletar(3));

        assertEquals("O nível \"Financeiro\" está sendo usado por 1 funcionário. Troque o nível dessas pessoas antes de excluir.",
                erro.getMessage());
        verify(nivelAcessoRepository, never()).deleteById(any());
    }

    @Test
    void mensagemNoPluralQuandoVariosUsamONivel() {
        when(nivelAcessoRepository.findById(3)).thenReturn(Optional.of(nivel(3, "Financeiro", "", false)));
        when(funcionarioRepository.countByNivel_IdNivel(3)).thenReturn(2L);

        assertTrue(assertThrows(RegraDeNegocioException.class, () -> nivelAcessoService.deletar(3))
                .getMessage().contains("2 funcionários"));
    }

    @Test
    void naoExcluiOMasterNemNivelInexistente() {
        when(nivelAcessoRepository.findById(1)).thenReturn(Optional.of(nivel(1, "Master", "", true)));
        when(nivelAcessoRepository.findById(9)).thenReturn(Optional.empty());

        assertEquals("O nível Master não pode ser excluído.",
                assertThrows(RegraDeNegocioException.class, () -> nivelAcessoService.deletar(1)).getMessage());
        assertEquals("Nível de acesso não encontrado.",
                assertThrows(RegraDeNegocioException.class, () -> nivelAcessoService.deletar(9)).getMessage());
        verify(nivelAcessoRepository, never()).deleteById(any());
    }

    // ===== Acesso do funcionário logado =====

    @Test
    void meuAcessoDeUmFuncionarioComum() {
        when(funcionarioRepository.findById(2))
                .thenReturn(Optional.of(funcionario(2, "ativo", nivel(3, "Financeiro", "inscricoes,matriculas", false))));

        MeuAcesso acesso = nivelAcessoService.doFuncionario(2);

        assertEquals("Financeiro", acesso.nivel());
        assertFalse(acesso.master());
        assertEquals(List.of("inscricoes", "matriculas"), acesso.modulos());
    }

    @Test
    void meuAcessoDoMasterTemTodosOsModulos() {
        when(funcionarioRepository.findById(1)).thenReturn(Optional.of(funcionario(1, "ativo", nivel(1, "Master", "", true))));

        MeuAcesso acesso = nivelAcessoService.doFuncionario(1);

        assertTrue(acesso.master());
        assertEquals(Modulos.TODOS, acesso.modulos());
    }

    @Test
    void meuAcessoSemNivelNaoTemModulos() {
        when(funcionarioRepository.findById(5)).thenReturn(Optional.of(funcionario(5, "ativo", null)));

        MeuAcesso acesso = nivelAcessoService.doFuncionario(5);

        assertNull(acesso.nivel());
        assertTrue(acesso.modulos().isEmpty());
    }

    @Test
    void meuAcessoDeFuncionarioInexistente() {
        when(funcionarioRepository.findById(9)).thenReturn(Optional.empty());

        assertThrows(RegraDeNegocioException.class, () -> nivelAcessoService.doFuncionario(9));
    }

    @Test
    void modulosLiberadosConfereOStatusDaContaNaHora() {
        when(funcionarioRepository.findById(2))
                .thenReturn(Optional.of(funcionario(2, "ativo", nivel(3, "Financeiro", "matriculas", false))));
        when(funcionarioRepository.findById(4))
                .thenReturn(Optional.of(funcionario(4, "bloqueado", nivel(3, "Financeiro", "matriculas", false))));
        when(funcionarioRepository.findById(5)).thenReturn(Optional.of(funcionario(5, "ativo", null)));
        when(funcionarioRepository.findById(9)).thenReturn(Optional.empty());

        assertEquals(Set.of("matriculas"), nivelAcessoService.modulosLiberados(2));
        assertNull(nivelAcessoService.modulosLiberados(4));
        assertEquals(Set.of(), nivelAcessoService.modulosLiberados(5));
        assertNull(nivelAcessoService.modulosLiberados(9));
        assertNull(nivelAcessoService.modulosLiberados(null));
    }
}
