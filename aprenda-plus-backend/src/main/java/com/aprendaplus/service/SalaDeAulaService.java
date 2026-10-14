package com.aprendaplus.service;

import com.aprendaplus.dto.AulaDaSala;
import com.aprendaplus.dto.CertificadoEmitido;
import com.aprendaplus.dto.MinhaTurmaEad;
import com.aprendaplus.dto.SalaDoAluno;
import com.aprendaplus.entity.*;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

// Área do aluno: sala de aula EAD (aulas, progresso, mural) e certificado de conclusão.
// O aluno só entra nas turmas em que tem matrícula ativa ou concluída.
@Service
public class SalaDeAulaService {

    // Sem letras e números parecidos (O/0, I/1), para facilitar digitar o código
    private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom SORTEIO = new SecureRandom();

    @Autowired
    private MatriculaRepository matriculaRepository;

    @Autowired
    private PlanoDeAulaRepository planoRepository;

    @Autowired
    private AulaRepository aulaRepository;

    @Autowired
    private AulaConcluidaRepository aulaConcluidaRepository;

    @Autowired
    private CertificadoRepository certificadoRepository;

    @Autowired
    private AlunoRepository alunoRepository;

    @Autowired
    private ConteudoEadService conteudoEadService;

    // ===== Lista de turmas do aluno =====

    @Transactional(readOnly = true)
    public List<MinhaTurmaEad> minhasTurmas(Integer idAluno) {
        List<MinhaTurmaEad> lista = new ArrayList<>();
        List<Matricula> matriculas = new ArrayList<>(matriculaRepository.findByAluno_IdAluno(idAluno));
        matriculas.sort(Comparator.comparing(Matricula::getIdMatricula, Comparator.nullsLast(Comparator.reverseOrder())));
        for (Matricula matricula : matriculas) {
            Turma turma = matricula.getTurma();
            if (turma == null || "cancelada".equals(matricula.getStatus())) {
                continue;
            }
            PlanoDeAula plano = planoRepository.findFirstByTurma_IdTurma(turma.getIdTurma()).orElse(null);
            List<Aula> aulas = aulasPublicadas(plano);
            int feitas = concluidas(idAluno, plano, aulas).size();
            boolean temCertificado = certificadoRepository
                    .findFirstByAluno_IdAlunoAndTurma_IdTurma(idAluno, turma.getIdTurma()).isPresent();
            lista.add(new MinhaTurmaEad(turma.getIdTurma(), turma.getNome(),
                    turma.getCurso() == null ? null : turma.getCurso().getNome(),
                    nomeDoProfessor(plano),
                    matricula.getStatus(), ConteudoEadService.STATUS_COM_ACESSO.contains(matricula.getStatus()),
                    aulas.size(), feitas, ConteudoEadService.percentual(feitas, aulas.size()), temCertificado));
        }
        return lista;
    }

    // ===== Sala de aula de uma turma =====

    @Transactional(readOnly = true)
    public SalaDoAluno sala(Integer idAluno, Integer idTurma) {
        Matricula matricula = acessar(idAluno, idTurma);
        Turma turma = matricula.getTurma();
        PlanoDeAula plano = planoRepository.findFirstByTurma_IdTurma(idTurma).orElse(null);
        List<Aula> aulas = aulasPublicadas(plano);
        Set<Integer> feitas = concluidas(idAluno, plano, aulas);
        LocalDate hoje = LocalDate.now(ConteudoEadService.FUSO);

        List<AulaDaSala> lista = aulas.stream()
                .map(a -> ConteudoEadService.paraDto(a, hoje, feitas.contains(a.getIdAula()), false))
                .toList();
        CertificadoEmitido certificado = certificadoRepository
                .findFirstByAluno_IdAlunoAndTurma_IdTurma(idAluno, idTurma)
                .map(c -> paraDto(c, plano))
                .orElse(null);
        Curso curso = turma.getCurso();
        return new SalaDoAluno(turma.getIdTurma(), turma.getNome(),
                curso == null ? null : curso.getNome(),
                turma.getModalidade(), turma.getDiasHorarios(), nomeDoProfessor(plano), cargaHoraria(turma),
                aulas.size(), feitas.size(), ConteudoEadService.percentual(feitas.size(), aulas.size()),
                lista, conteudoEadService.avisosDaTurma(idTurma), certificado);
    }

    // Marca (concluida = true) ou desmarca uma aula. Devolve a sala atualizada.
    @Transactional
    public SalaDoAluno marcarAula(Integer idAluno, Integer idAula, boolean concluida) {
        Aula aula = aulaRepository.findById(idAula)
                .filter(a -> !Boolean.FALSE.equals(a.getPublicada()))
                .orElseThrow(() -> new RegraDeNegocioException("Aula não encontrada."));
        Integer idTurma = aula.getPlano().getTurma().getIdTurma();
        acessar(idAluno, idTurma);

        Optional<AulaConcluida> existente = aulaConcluidaRepository.findFirstByAluno_IdAlunoAndAula_IdAula(idAluno, idAula);
        if (concluida) {
            if (!ConteudoEadService.estaLiberada(aula, LocalDate.now(ConteudoEadService.FUSO))) {
                throw new RegraDeNegocioException("Esta aula ainda não foi liberada.");
            }
            if (existente.isEmpty()) {
                AulaConcluida nova = new AulaConcluida();
                nova.setAluno(alunoRepository.findById(idAluno)
                        .orElseThrow(() -> new RegraDeNegocioException("Aluno não encontrado.")));
                nova.setAula(aula);
                nova.setConcluidaEm(LocalDateTime.now(ConteudoEadService.FUSO));
                aulaConcluidaRepository.save(nova);
            }
        } else {
            existente.ifPresent(aulaConcluidaRepository::delete);
        }
        return sala(idAluno, idTurma);
    }

    // ===== Certificado =====

    // Emite o certificado (ou devolve o que já foi emitido) quando todas as aulas estão concluídas
    @Transactional
    public CertificadoEmitido emitirCertificado(Integer idAluno, Integer idTurma) {
        Matricula matricula = acessar(idAluno, idTurma);
        PlanoDeAula plano = planoRepository.findFirstByTurma_IdTurma(idTurma).orElse(null);
        Optional<Certificado> existente = certificadoRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(idAluno, idTurma);
        if (existente.isPresent()) {
            return paraDto(existente.get(), plano);
        }

        List<Aula> aulas = aulasPublicadas(plano);
        int feitas = concluidas(idAluno, plano, aulas).size();
        if (aulas.isEmpty() || feitas < aulas.size()) {
            throw new RegraDeNegocioException("Conclua todas as aulas para emitir o certificado ("
                    + feitas + " de " + aulas.size() + " concluídas).");
        }

        Certificado certificado = new Certificado();
        certificado.setAluno(matricula.getAluno());
        certificado.setTurma(matricula.getTurma());
        certificado.setCodigo(novoCodigo());
        certificado.setCargaHoraria(cargaHoraria(matricula.getTurma()));
        certificado.setEmitidoEm(LocalDateTime.now(ConteudoEadService.FUSO));
        return paraDto(certificadoRepository.save(certificado), plano);
    }

    // Validação pública: qualquer pessoa confere se o certificado é verdadeiro
    @Transactional(readOnly = true)
    public CertificadoEmitido validar(String codigo) {
        String limpo = codigo == null ? "" : codigo.trim().toUpperCase(Locale.ROOT);
        Certificado certificado = certificadoRepository.findFirstByCodigo(limpo)
                .orElseThrow(() -> new RegraDeNegocioException("Certificado não encontrado. Confira o código."));
        PlanoDeAula plano = certificado.getTurma() == null ? null
                : planoRepository.findFirstByTurma_IdTurma(certificado.getTurma().getIdTurma()).orElse(null);
        return paraDto(certificado, plano);
    }

    // ===== Auxiliares =====

    Matricula acessar(Integer idAluno, Integer idTurma) {
        Matricula matricula = matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(idAluno, idTurma)
                .orElseThrow(() -> new RegraDeNegocioException("Você não está matriculado nesta turma."));
        if ("trancada".equals(matricula.getStatus())) {
            throw new RegraDeNegocioException("Sua matrícula nesta turma está trancada. Fale com a secretaria.");
        }
        if (!ConteudoEadService.STATUS_COM_ACESSO.contains(matricula.getStatus())) {
            throw new RegraDeNegocioException("Sua matrícula nesta turma não está ativa.");
        }
        return matricula;
    }

    String novoCodigo() {
        for (int tentativa = 0; tentativa < 10; tentativa++) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 12; i++) {
                if (i > 0 && i % 4 == 0) {
                    sb.append('-');
                }
                sb.append(ALFABETO.charAt(SORTEIO.nextInt(ALFABETO.length())));
            }
            String codigo = sb.toString();
            if (!certificadoRepository.existsByCodigo(codigo)) {
                return codigo;
            }
        }
        throw new RegraDeNegocioException("Não foi possível gerar o código do certificado. Tente novamente.");
    }

    private List<Aula> aulasPublicadas(PlanoDeAula plano) {
        if (plano == null) {
            return List.of();
        }
        return aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(plano.getIdPlano()).stream()
                .filter(a -> !Boolean.FALSE.equals(a.getPublicada()))
                .toList();
    }

    // Ids das aulas (entre as publicadas) que o aluno já concluiu
    private Set<Integer> concluidas(Integer idAluno, PlanoDeAula plano, List<Aula> publicadas) {
        if (plano == null) {
            return Set.of();
        }
        Set<Integer> validas = new HashSet<>();
        publicadas.forEach(a -> validas.add(a.getIdAula()));
        Set<Integer> feitas = new HashSet<>();
        for (AulaConcluida c : aulaConcluidaRepository.findByAluno_IdAlunoAndAula_Plano_IdPlano(idAluno, plano.getIdPlano())) {
            if (c.getAula() != null && validas.contains(c.getAula().getIdAula())) {
                feitas.add(c.getAula().getIdAula());
            }
        }
        return feitas;
    }

    private static Integer cargaHoraria(Turma turma) {
        if (turma.getCargaHoraria() != null) {
            return turma.getCargaHoraria();
        }
        return turma.getCurso() == null ? null : turma.getCurso().getCargaHoraria();
    }

    private static String nomeDoProfessor(PlanoDeAula plano) {
        return plano == null || plano.getProfessorResponsavel() == null ? null
                : plano.getProfessorResponsavel().getNomeCompleto();
    }

    private static CertificadoEmitido paraDto(Certificado c, PlanoDeAula plano) {
        Turma turma = c.getTurma();
        return new CertificadoEmitido(c.getCodigo(),
                c.getAluno() == null ? null : c.getAluno().getNomeCompleto(),
                turma == null || turma.getCurso() == null ? null : turma.getCurso().getNome(),
                turma == null ? null : turma.getNome(),
                c.getCargaHoraria(), nomeDoProfessor(plano), c.getEmitidoEm());
    }
}
