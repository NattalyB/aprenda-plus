package com.aprendaplus.security;

import java.util.Set;

// Diz quais módulos do painel um funcionário pode usar agora.
// Devolve null quando a conta não existe mais ou não está ativa.
@FunctionalInterface
public interface PermissoesDoFuncionario {
    Set<String> modulosLiberados(Integer idFuncionario);
}
