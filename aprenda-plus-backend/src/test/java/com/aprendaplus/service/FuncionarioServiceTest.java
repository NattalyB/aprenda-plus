package com.aprendaplus.service;

import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.repository.FuncionarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FuncionarioServiceTest {

    @Mock
    private FuncionarioRepository funcionarioRepository;

    @InjectMocks
    private FuncionarioService funcionarioService;

    @Test
    void deveCriptografarSenhaAoCriarFuncionario() {
        Funcionario funcionario = new Funcionario();
        funcionario.setNomeCompleto("Admin Teste");
        funcionario.setSenhaHash("admin123");

        when(funcionarioRepository.save(any(Funcionario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Funcionario resultado = funcionarioService.salvar(funcionario);

        assertNotEquals("admin123", resultado.getSenhaHash());
        assertTrue(resultado.getSenhaHash().startsWith("$2a$"));
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
}