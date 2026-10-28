package com.aprendaplus.dto;

import java.time.LocalDate;
import java.util.List;

// Visão geral do módulo Comercial num período (últimos N dias):
// funil de conversão, cursos com mais interesse, termos buscados e movimento por dia.
public record PainelComercial(LocalDate de, LocalDate ate, int dias,
                              Indicadores indicadores,
                              List<EtapaFunil> funil,
                              List<InteresseCurso> cursos,
                              List<TermoBuscado> buscas,
                              List<DiaDeMovimento> porDia) {

    // visitantes = pessoas diferentes (sessões do navegador) que fizeram algo no site
    // conversao = % dos visitantes que viraram matrícula no período
    public record Indicadores(long visitantes, long cadastros, long inscricoes, long matriculas,
                              long buscas, long buscasSemResultado, double conversao) {
    }

    // Uma etapa do funil: quantas pessoas chegaram até ela
    public record EtapaFunil(String chave, String rotulo, long pessoas) {
    }

    // Interesse por curso. pessoas = sessões diferentes que abriram o curso;
    // visitantes/alunos = quantas dessas estavam sem login / logadas como aluno.
    public record InteresseCurso(Integer idCurso, String nome, String categoria,
                                 long visualizacoes, long pessoas, long visitantes, long alunos,
                                 long carrinho, long inscricoes, double conversao) {
    }

    // Termo digitado na busca do site (agrupado sem acentos e sem maiúsculas)
    public record TermoBuscado(String termo, long vezes, long pessoas, int resultados, boolean semResultado) {
    }

    public record DiaDeMovimento(LocalDate data, long visitantes, long visualizacoes, long buscas) {
    }
}
