package com.aprendaplus.service;

import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.FuncionarioRepository;
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

    @InjectMocks
    private FuncionarioService funcionarioService;

    // Funcionário com todos os dados obrigatórios preenchidos
    private Funcionario funcionarioValido() {
        Funcionario f = new Funcionario();
        f.setNomeCompleto("Admin Teste");
        f.setEmail("admin@teste.com");
        f.setTelefone("(51) 99999-0000");
        f.setCpf("12345678901");
        f.setDataNascimento(LocalDate.of(1990, 5, 10));
        f.setSenhaHash("admin123");
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
}
