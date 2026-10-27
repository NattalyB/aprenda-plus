package com.aprendaplus.service;

import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.NivelAcesso;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.NivelAcessoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FuncionarioServiceTest {

    @Mock
    private FuncionarioRepository funcionarioRepository;

    @Mock
    private NivelAcessoRepository nivelAcessoRepository;

    @InjectMocks
    private FuncionarioService funcionarioService;

    private final NivelAcesso master = nivel(1, "Master", true);
    private final NivelAcesso administrativo = nivel(2, "Administrativo", false);
    private final NivelAcesso financeiro = nivel(3, "Financeiro", false);

    private static NivelAcesso nivel(int id, String nome, boolean master) {
        NivelAcesso n = new NivelAcesso();
        n.setIdNivel(id);
        n.setNome(nome);
        n.setMaster(master);
        return n;
    }

    // Só o id do nível, como chega do formulário
    private static NivelAcesso soId(int id) {
        NivelAcesso n = new NivelAcesso();
        n.setIdNivel(id);
        return n;
    }

    @Test
    void contasMasterSoAparecemParaOMaster() {
        Funcionario suporte = new Funcionario();
        suporte.setIdFuncionario(3);
        suporte.setNivel(master);
        Funcionario dono = new Funcionario();
        dono.setIdFuncionario(9);
        dono.setNivel(administrativo);
        Funcionario semNivel = new Funcionario();
        semNivel.setIdFuncionario(10);
        when(funcionarioRepository.findById(3)).thenReturn(Optional.of(suporte));
        when(funcionarioRepository.findById(9)).thenReturn(Optional.of(dono));
        when(funcionarioRepository.findAll()).thenReturn(List.of(suporte, dono, semNivel));

        assertTrue(funcionarioService.podeVerContasMaster(null));
        assertTrue(funcionarioService.podeVerContasMaster(3));
        assertFalse(funcionarioService.podeVerContasMaster(9));
        assertTrue(FuncionarioService.ehContaMaster(suporte));
        assertFalse(FuncionarioService.ehContaMaster(semNivel));
        assertFalse(FuncionarioService.ehContaMaster(null));
        assertEquals(java.util.Set.of(3), funcionarioService.idsDasContasMaster());
    }

    @BeforeEach
    void niveisCadastrados() {
        lenient().when(nivelAcessoRepository.findById(1)).thenReturn(Optional.of(master));
        lenient().when(nivelAcessoRepository.findById(2)).thenReturn(Optional.of(administrativo));
        lenient().when(nivelAcessoRepository.findById(3)).thenReturn(Optional.of(financeiro));
    }

    // Funcionário com todos os dados obrigatórios preenchidos
    private Funcionario funcionarioValido() {
        Funcionario f = new Funcionario();
        f.setNomeCompleto("Admin Teste");
        f.setEmail("admin@teste.com");
        f.setTelefone("(51) 99999-0000");
        f.setCpf("12345678901");
        f.setDataNascimento(LocalDate.of(1990, 5, 10));
        f.setSenhaHash("admin123");
        f.setNivel(soId(2));
        return f;
    }

    private void saveDevolveOProprio() {
        when(funcionarioRepository.save(any(Funcionario.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void deveCriptografarSenhaAoCriarFuncionario() {
        saveDevolveOProprio();

        Funcionario resultado = funcionarioService.salvar(funcionarioValido());

        assertNotEquals("admin123", resultado.getSenhaHash());
        assertTrue(resultado.getSenhaHash().startsWith("$2"));
    }

    @Test
    void cargoEStatusVaziosRecebemOPadrao() {
        saveDevolveOProprio();
        Funcionario f = funcionarioValido();
        f.setCargo("  ");
        f.setStatus(null);

        Funcionario resultado = funcionarioService.salvar(f);

        assertEquals("administrativo", resultado.getCargo());
        assertEquals("ativo", resultado.getStatus());
    }

    @Test
    void deveListarTodosOsFuncionarios() {
        Funcionario funcionario = new Funcionario();
        funcionario.setIdFuncionario(1);
        when(funcionarioRepository.findAll()).thenReturn(Arrays.asList(funcionario));

        List<Funcionario> resultado = funcionarioService.listarTodos();

        assertEquals(1, resultado.size());
        verify(funcionarioRepository, times(1)).findAll();
    }

    @Test
    void deveExcluirFuncionario() {
        funcionarioService.deletar(1);

        verify(funcionarioRepository, times(1)).deleteById(1);
    }

    @Test
    void naoDeveRecriptografarSenhaJaCriptografada() {
        saveDevolveOProprio();
        Funcionario f = funcionarioValido();
        f.setSenhaHash("$2a$10$hashJaCriptografado");

        assertEquals("$2a$10$hashJaCriptografado", funcionarioService.salvar(f).getSenhaHash());
    }

    @Test
    void novoFuncionarioPrecisaDeSenha() {
        Funcionario f = funcionarioValido();
        f.setSenhaHash("  ");

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(f));

        assertEquals("Informe uma senha para o novo funcionário.", erro.getMessage());
        verify(funcionarioRepository, never()).save(any());
    }

    @Test
    void senhaCurtaEhRecusada() {
        Funcionario f = funcionarioValido();
        f.setSenhaHash("123");

        assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(f));
    }

    @Test
    void edicaoSemSenhaNovaMantemASenhaAtual() {
        Funcionario noBanco = funcionarioValido();
        noBanco.setIdFuncionario(2);
        noBanco.setSenhaHash("$2a$10$senhaAtual");
        when(funcionarioRepository.findById(2)).thenReturn(Optional.of(noBanco));
        saveDevolveOProprio();

        Funcionario edicao = funcionarioValido();
        edicao.setIdFuncionario(2);
        edicao.setSenhaHash(null);

        assertEquals("$2a$10$senhaAtual", funcionarioService.salvar(edicao).getSenhaHash());
    }

    @Test
    void camposObrigatoriosTemMensagemClara() {
        Funcionario semNome = funcionarioValido();
        semNome.setNomeCompleto(" ");
        assertEquals("Informe o nome completo.",
                assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(semNome)).getMessage());

        Funcionario emailRuim = funcionarioValido();
        emailRuim.setEmail("admin.com");
        assertEquals("Informe um e-mail válido.",
                assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(emailRuim)).getMessage());

        Funcionario semEmail = funcionarioValido();
        semEmail.setEmail(null);
        assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(semEmail));

        Funcionario semTelefone = funcionarioValido();
        semTelefone.setTelefone(null);
        assertEquals("Informe o telefone.",
                assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(semTelefone)).getMessage());

        Funcionario cpfRuim = funcionarioValido();
        cpfRuim.setCpf("123.456.789-01");
        assertEquals("O CPF deve conter exatamente 11 números.",
                assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(cpfRuim)).getMessage());

        Funcionario semCpf = funcionarioValido();
        semCpf.setCpf(null);
        assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(semCpf));

        Funcionario semNascimento = funcionarioValido();
        semNascimento.setDataNascimento(null);
        assertEquals("Informe a data de nascimento.",
                assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(semNascimento)).getMessage());

        verify(funcionarioRepository, never()).save(any());
    }

    // ===== Nível de acesso =====

    // Funcionário já salvo no banco, com o nível informado
    private Funcionario noBanco(int id, NivelAcesso nivel) {
        Funcionario f = funcionarioValido();
        f.setIdFuncionario(id);
        f.setSenhaHash("$2a$10$senhaAtual");
        f.setNivel(nivel);
        lenient().when(funcionarioRepository.findById(id)).thenReturn(Optional.of(f));
        return f;
    }

    private Funcionario edicaoDe(int id, Integer idNivel) {
        Funcionario f = funcionarioValido();
        f.setIdFuncionario(id);
        f.setSenhaHash(null);
        f.setNivel(idNivel == null ? null : soId(idNivel));
        return f;
    }

    @Test
    void novoFuncionarioPrecisaDeNivel() {
        Funcionario f = funcionarioValido();
        f.setNivel(null);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(f));

        assertEquals("Escolha o nível de acesso do funcionário.", erro.getMessage());
        verify(funcionarioRepository, never()).save(any());
    }

    @Test
    void nivelComIdVazioContaComoSemNivel() {
        Funcionario f = funcionarioValido();
        f.setNivel(new NivelAcesso());

        assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(f));
    }

    @Test
    void nivelInexistenteEhRecusado() {
        Funcionario f = funcionarioValido();
        f.setNivel(soId(77));
        when(nivelAcessoRepository.findById(77)).thenReturn(Optional.empty());

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(f));

        assertEquals("Nível de acesso não encontrado.", erro.getMessage());
    }

    @Test
    void salvaComONivelCompletoDoBanco() {
        saveDevolveOProprio();

        Funcionario salvo = funcionarioService.salvar(funcionarioValido());

        assertEquals("Administrativo", salvo.getNivel().getNome());
    }

    @Test
    void edicaoSemNivelMantemONivelAtual() {
        noBanco(4, financeiro);
        saveDevolveOProprio();

        Funcionario salvo = funcionarioService.salvar(edicaoDe(4, null));

        assertEquals("Financeiro", salvo.getNivel().getNome());
    }

    @Test
    void edicaoDeFuncionarioQueNaoExisteMaisPrecisaDeNivel() {
        when(funcionarioRepository.findById(9)).thenReturn(Optional.empty());

        assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(edicaoDe(9, null)));
    }

    @Test
    void naoMasterNaoCriaContaMaster() {
        noBanco(2, administrativo);
        Funcionario novo = funcionarioValido();
        novo.setNivel(soId(1));

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> funcionarioService.salvar(novo, 2));

        assertEquals("Só um usuário Master pode criar ou alterar contas Master.", erro.getMessage());
        verify(funcionarioRepository, never()).save(any());
    }

    @Test
    void naoMasterNaoAlteraContaMaster() {
        noBanco(2, administrativo);
        noBanco(1, master);

        assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(edicaoDe(1, 1), 2));
    }

    @Test
    void quemAlteraEQueNaoExisteMaisNaoEhMaster() {
        when(funcionarioRepository.findById(50)).thenReturn(Optional.empty());
        Funcionario novo = funcionarioValido();
        novo.setNivel(soId(1));

        assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(novo, 50));
    }

    @Test
    void quemAlteraSemNivelNaoEhMaster() {
        noBanco(2, null);
        Funcionario novo = funcionarioValido();
        novo.setNivel(soId(1));

        assertThrows(RegraDeNegocioException.class, () -> funcionarioService.salvar(novo, 2));
    }

    @Test
    void naoMasterCriaContaDeOutroNivel() {
        noBanco(2, administrativo);
        saveDevolveOProprio();
        Funcionario novo = funcionarioValido();
        novo.setNivel(soId(3));

        assertEquals("Financeiro", funcionarioService.salvar(novo, 2).getNivel().getNome());
    }

    @Test
    void masterPromoveOutroFuncionarioAMaster() {
        noBanco(1, master);
        noBanco(4, financeiro);
        saveDevolveOProprio();

        assertTrue(funcionarioService.salvar(edicaoDe(4, 1), 1).getNivel().isMaster());
    }

    @Test
    void ninguemMudaOProprioNivel() {
        noBanco(1, master);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class,
                () -> funcionarioService.salvar(edicaoDe(1, 2), 1));

        assertEquals("Você não pode mudar o seu próprio nível de acesso.", erro.getMessage());
    }

    @Test
    void contaSemNivelRecebeUmNivelPeloMaster() {
        noBanco(1, master);
        noBanco(6, null);
        saveDevolveOProprio();

        assertEquals("Financeiro", funcionarioService.salvar(edicaoDe(6, 3), 1).getNivel().getNome());
    }

    @Test
    void editarAPropriaContaSemMudarONivelPode() {
        noBanco(2, administrativo);
        saveDevolveOProprio();

        assertEquals("Administrativo", funcionarioService.salvar(edicaoDe(2, 2), 2).getNivel().getNome());
    }

    @Test
    void naoMasterNaoExcluiContaMaster() {
        noBanco(2, administrativo);
        noBanco(1, master);

        RegraDeNegocioException erro = assertThrows(RegraDeNegocioException.class, () -> funcionarioService.deletar(1, 2));

        assertEquals("Só um usuário Master pode excluir uma conta Master.", erro.getMessage());
        verify(funcionarioRepository, never()).deleteById(any());
    }

    @Test
    void naoMasterExcluiContaDeOutroNivelOuQueJaNaoExiste() {
        noBanco(2, administrativo);
        noBanco(4, financeiro);
        noBanco(5, null);
        when(funcionarioRepository.findById(8)).thenReturn(Optional.empty());

        funcionarioService.deletar(4, 2);
        funcionarioService.deletar(5, 2);
        funcionarioService.deletar(8, 2);

        verify(funcionarioRepository).deleteById(4);
        verify(funcionarioRepository).deleteById(5);
        verify(funcionarioRepository).deleteById(8);
    }

    @Test
    void masterExcluiOutraContaMaster() {
        noBanco(1, master);
        noBanco(5, master);

        funcionarioService.deletar(5, 1);

        verify(funcionarioRepository).deleteById(5);
    }
}
