package com.aprendaplus.service;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.repository.AlunoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlunoServiceTest {

    @Mock
    private AlunoRepository alunoRepository;

    @InjectMocks
    private AlunoService alunoService;

    @Test
    void deveCriptografarSenhaAoCriarAluno() {
        Aluno aluno = new Aluno();
        aluno.setNomeCompleto("Teste");
        aluno.setEmail("teste@teste.com");
        aluno.setSenhaHash("123456");

        when(alunoRepository.save(any(Aluno.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Aluno resultado = alunoService.salvar(aluno);

        assertNotEquals("123456", resultado.getSenhaHash());
        assertTrue(resultado.getSenhaHash().startsWith("$2a$"));
    }

    @Test
    void naoDeveRecriptografarSenhaJaCriptografada() {
        Aluno aluno = new Aluno();
        String hashExistente = "$2a$10$abcdefghijklmnopqrstuv";
        aluno.setSenhaHash(hashExistente);

        when(alunoRepository.save(any(Aluno.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Aluno resultado = alunoService.salvar(aluno);

        assertEquals(hashExistente, resultado.getSenhaHash());
    }
}