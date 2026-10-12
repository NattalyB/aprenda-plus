package com.aprendaplus.service;

import com.aprendaplus.dto.MeuAcesso;
import com.aprendaplus.entity.Funcionario;
import com.aprendaplus.entity.NivelAcesso;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.FuncionarioRepository;
import com.aprendaplus.repository.NivelAcessoRepository;
import com.aprendaplus.security.Modulos;
import com.aprendaplus.security.PermissoesDoFuncionario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

// Níveis de acesso do painel (módulo "Sistema", só para o Master)
// e a consulta de permissões usada pela proteção da API.
@Service
public class NivelAcessoService implements PermissoesDoFuncionario {

    @Autowired
    private NivelAcessoRepository nivelAcessoRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    public List<NivelAcesso> listar() {
        return nivelAcessoRepository.findAllByOrderByMasterDescNomeAsc();
    }

    public NivelAcesso salvar(NivelAcesso nivel) {
        String nome = nivel.getNome() == null ? "" : nivel.getNome().trim();
        if (nome.isEmpty()) {
            throw new RegraDeNegocioException("Informe o nome do nível.");
        }
        if (nome.length() > 50) {
            throw new RegraDeNegocioException("O nome do nível pode ter no máximo 50 caracteres.");
        }

        if (nivel.getIdNivel() != null) {
            NivelAcesso atual = nivelAcessoRepository.findById(nivel.getIdNivel())
                    .orElseThrow(() -> new RegraDeNegocioException("Nível de acesso não encontrado."));
            if (atual.isMaster()) {
                throw new RegraDeNegocioException("O nível Master tem acesso a tudo e não pode ser alterado.");
            }
        }

        nivelAcessoRepository.findFirstByNomeIgnoreCase(nome)
                .filter(outro -> !outro.getIdNivel().equals(nivel.getIdNivel()))
                .ifPresent(outro -> {
                    throw new RegraDeNegocioException("Já existe um nível com o nome \"" + outro.getNome() + "\".");
                });

        nivel.setNome(nome);
        // Só existe um Master, criado pelo script do banco
        nivel.setMaster(false);
        return nivelAcessoRepository.save(nivel);
    }

    public void deletar(Integer id) {
        NivelAcesso nivel = nivelAcessoRepository.findById(id)
                .orElseThrow(() -> new RegraDeNegocioException("Nível de acesso não encontrado."));
        if (nivel.isMaster()) {
            throw new RegraDeNegocioException("O nível Master não pode ser excluído.");
        }
        long emUso = funcionarioRepository.countByNivel_IdNivel(id);
        if (emUso > 0) {
            throw new RegraDeNegocioException("O nível \"" + nivel.getNome() + "\" está sendo usado por " + emUso
                    + (emUso == 1 ? " funcionário" : " funcionários")
                    + ". Troque o nível dessas pessoas antes de excluir.");
        }
        nivelAcessoRepository.deleteById(id);
    }

    // Nível e módulos do funcionário logado (o front usa para montar o menu e os atalhos)
    public MeuAcesso doFuncionario(Integer idFuncionario) {
        Funcionario funcionario = funcionarioRepository.findById(idFuncionario)
                .orElseThrow(() -> new RegraDeNegocioException("Funcionário não encontrado."));
        NivelAcesso nivel = funcionario.getNivel();
        if (nivel == null) {
            return new MeuAcesso(null, false, List.of());
        }
        return new MeuAcesso(nivel.getNome(), nivel.isMaster(), nivel.getModulos());
    }

    // Usado pelo AuthInterceptor a cada requisição do painel.
    // Lê do banco na hora: se o Master mudar as permissões ou bloquear a conta,
    // vale imediatamente, sem precisar de novo login.
    @Override
    public Set<String> modulosLiberados(Integer idFuncionario) {
        if (idFuncionario == null) {
            return null;
        }
        Funcionario funcionario = funcionarioRepository.findById(idFuncionario).orElse(null);
        if (funcionario == null || !"ativo".equals(funcionario.getStatus())) {
            return null;
        }
        NivelAcesso nivel = funcionario.getNivel();
        if (nivel == null) {
            return Set.of();
        }
        return new LinkedHashSet<>(nivel.getModulos());
    }
}
