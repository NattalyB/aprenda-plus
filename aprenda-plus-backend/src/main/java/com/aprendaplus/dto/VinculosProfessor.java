package com.aprendaplus.dto;

import java.util.List;

// Cursos e disciplinas que um professor leciona, só com os ids.
// Ex.: { "cursos": [1, 3], "disciplinas": [10, 11, 25] }
public record VinculosProfessor(List<Integer> cursos, List<Integer> disciplinas) {
}
