package com.aprendaplus.service;

import com.aprendaplus.dto.TurmaDisponivel;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.repository.InscricaoRepository;
import com.aprendaplus.repository.TurmaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TurmaService {

    public static final String INSCRICOES_ABERTAS = "inscricoes_abertas";

    @Autowired
    private TurmaRepository turmaRepository;

    @Autowired
    private InscricaoRepository inscricaoRepository;

    public List<Turma> listarTodos() {
        return turmaRepository.findAll();
    }

    public Turma buscarPorId(Integer id) {
        return turmaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Turma não encontrada com id: " + id));
    }

    public Turma salvar(Turma turma) {
        return turmaRepository.save(turma);
    }

    public void deletar(Integer id) {
        turmaRepository.deleteById(id);
    }

    // Turmas de um curso que ainda aceitam inscrições, com as vagas que restam
    @Transactional(readOnly = true)
    public List<TurmaDisponivel> listarDisponiveisDoCurso(Integer idCurso) {
        return turmaRepository.findByCurso_IdCursoOrderByNomeAsc(idCurso).stream()
                .filter(turma -> INSCRICOES_ABERTAS.equals(turma.getStatus()))
                .map(turma -> new TurmaDisponivel(
                        turma.getIdTurma(),
                        turma.getNome(),
                        turma.getModalidade(),
                        turma.getDiasHorarios(),
                        turma.getPeriodoLetivo() == null ? null : turma.getPeriodoLetivo().getNome(),
                        turma.getCapacidadeMaxima(),
                        vagasRestantes(turma)))
                .toList();
    }

    // Inscrições com estes status NÃO ocupam vaga
    public static final List<String> STATUS_SEM_VAGA = List.of("cancelada", "aguardando_vaga");

    // Capacidade da turma menos as inscrições que ocupam vaga
    // (canceladas e quem está na lista de espera não contam).
    // Turma sem capacidade cadastrada é tratada como sem limite.
    public long vagasRestantes(Turma turma) {
        if (turma.getCapacidadeMaxima() == null) {
            return Long.MAX_VALUE;
        }
        long ocupadas = inscricaoRepository.countByTurma_IdTurmaAndStatusNotIn(turma.getIdTurma(), STATUS_SEM_VAGA);
        return Math.max(0, turma.getCapacidadeMaxima() - ocupadas);
    }
}
