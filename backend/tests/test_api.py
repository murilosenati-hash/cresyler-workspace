from fastapi.testclient import TestClient
from app.main import app


def test_v3_workspace_and_study_hub():
    with TestClient(app) as client:
        # 1. Healthcheck
        res_health = client.get("/health")
        assert res_health.status_code == 200
        assert res_health.json()["status"] == "ok"

        # 2. Reset board to guarantee clean/zero inbox state (v3 requirement #1)
        res_reset = client.delete("/api/v1/kanban/boards/reset")
        assert res_reset.status_code == 200

        res_board = client.get("/api/v1/kanban/boards")
        assert res_board.status_code == 200
        data_board = res_board.json()
        assert len(data_board["columns"]) == 6
        assert data_board["total_tickets"] == 0

        # 3. Login Local & Perfil (v3 requirement #4)
        res_login = client.post(
            "/api/v1/goals/profile/login",
            json={
                "username": "tomy",
                "display_name": "Tomy Dev",
                "role_title": "Dev Jr • Python & Web",
                "pin": "1234",
                "daily_goal_minutes": 45,
            },
        )
        assert res_login.status_code == 200
        assert res_login.json()["display_name"] == "Tomy Dev"
        assert res_login.json()["daily_goal_minutes"] == 45

        # 4. Modo Freelance Toggle 'Disponível para Trabalho' e Propostas Nível 1 (v3 requirement #1)
        res_avail = client.patch(
            "/api/v1/clients/availability",
            json={"available_for_work": True},
        )
        assert res_avail.status_code == 200
        assert res_avail.json()["available_for_work"] is True
        assert res_avail.json()["pending_proposals_count"] >= 2

        res_props = client.get("/api/v1/clients/proposals")
        assert res_props.status_code == 200
        proposals = res_props.json()
        assert len(proposals) >= 2
        first_prop = proposals[0]
        second_prop = proposals[1]
        assert first_prop["difficulty_level"] == 1
        assert "R$" in first_prop["budget_formatted"]

        # Recusar uma proposta
        res_reject = client.post(f"/api/v1/clients/proposals/{second_prop['id']}/reject")
        assert res_reject.status_code == 200
        assert res_reject.json()["status"] == "rejected"

        # Aceitar uma proposta -> move para Backlog com tutorial passo a passo
        res_accept = client.post(f"/api/v1/clients/proposals/{first_prop['id']}/accept")
        assert res_accept.status_code == 200
        accepted_ticket = res_accept.json()["ticket"]
        ticket_id = accepted_ticket["id"]
        assert accepted_ticket["status"] == "backlog"
        assert "Guia Passo a Passo" in (accepted_ticket["tutorial_guide"] or "")

        # 5. RF-K03: Bloqueio de transição para qa_review quando checklist está pendente
        res_blocked = client.patch(
            f"/api/v1/kanban/tickets/{ticket_id}/move",
            json={"status": "qa_review", "order": 1},
        )
        assert res_blocked.status_code == 422

        # Concluir checklist e avançar para completed
        res_move = client.patch(
            f"/api/v1/kanban/tickets/{ticket_id}/move",
            json={
                "status": "completed",
                "order": 1,
                "acceptance_criteria": [
                    {"item": "Critério validado", "done": True},
                ],
            },
        )
        assert res_move.status_code == 200
        assert res_move.json()["status"] == "completed"

        # 6. Exportar Case de Portfólio
        res_export = client.post(f"/api/v1/goals/portfolio/export/{ticket_id}")
        assert res_export.status_code == 200
        assert res_export.json()["in_portfolio"] is True

        # 7. Meta Diária & Pomodoro de 15 min (v3 requirements #2 & #3)
        res_focus = client.post(
            "/api/v1/goals/focus-sessions",
            json={"session_type": "study", "duration_seconds": 900, "completed": True},
        )
        assert res_focus.status_code == 201
        daily_focus = res_focus.json()["daily_focus"]
        assert daily_focus["focused_minutes_today"] >= 15
        assert daily_focus["daily_goal_minutes"] == 45

        # 8. Study Hub Anti-TDAH: Upload documento, Flashcards e QuickQuiz de 3 perguntas (v3 requirement #2)
        md_bytes = "# Guia Python Automacao\nUse logging e pathlib para scripts robustos.\nValide arquivos CSV antes de salvar no SQLite.".encode("utf-8")
        files = {"file": ("guia_automacao.md", md_bytes, "text/markdown")}
        res_up = client.post("/api/v1/study/upload", files=files, data={"study_track": "Automação Python"})
        assert res_up.status_code == 201
        doc_id = res_up.json()["id"]

        res_cards = client.get(f"/api/v1/study/flashcards?document_id={doc_id}")
        assert res_cards.status_code == 200
        cards = res_cards.json()
        assert len(cards) >= 2
        res_rev = client.post(f"/api/v1/study/flashcards/{cards[0]['id']}/review", json={"rating": "easy"})
        assert res_rev.status_code == 200
        assert res_rev.json()["repetitions"] >= 1

        res_quiz = client.get(f"/api/v1/study/quiz?document_id={doc_id}")
        assert res_quiz.status_code == 200
        quiz_questions = res_quiz.json()
        assert len(quiz_questions) == 3

        correct_answers = [q["correct_option_index"] for q in quiz_questions]
        res_submit = client.post(
            "/api/v1/study/quiz/submit",
            json={"document_id": doc_id, "answers": correct_answers},
        )
        assert res_submit.status_code == 200
        assert res_submit.json()["score"] == 3
        assert res_submit.json()["score_pct"] == 100

        # 9. Streaming SSE
        res_sse = client.get("/api/v1/study/rag/stream?q=Pomodoro+15+min")
        assert res_sse.status_code == 200
        assert "data:" in res_sse.text

        # 10. Leave the Kanban board clean/zerado at the end of tests as required by v3
        client.delete("/api/v1/kanban/boards/reset")
