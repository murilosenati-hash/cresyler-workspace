from fastapi.testclient import TestClient
from app.main import app


def test_modular_monolith_endpoints():
    with TestClient(app) as client:
        # 1. Healthcheck
        res_health = client.get("/health")
        assert res_health.status_code == 200
        assert res_health.json()["status"] == "ok"

        # 2. Kanban Board e Personas Iniciais
        res_board = client.get("/api/v1/kanban/boards")
        assert res_board.status_code == 200
        data_board = res_board.json()
        assert len(data_board["columns"]) == 6
        assert data_board["total_tickets"] >= 2

        res_personas = client.get("/api/v1/clients/personas")
        assert res_personas.status_code == 200
        assert len(res_personas.json()) >= 3

        # 3. Gerar nova demanda simulada
        res_gen = client.post("/api/v1/clients/demands/generate", json={"template_index": 0})
        assert res_gen.status_code == 201
        new_ticket = res_gen.json()
        ticket_id = new_ticket["id"]

        # 4. RF-K03: Bloqueio de transição para qa_review quando checklist está pendente
        res_blocked = client.patch(
            f"/api/v1/kanban/tickets/{ticket_id}/move",
            json={"status": "qa_review", "order": 1},
        )
        assert res_blocked.status_code == 422

        # 5. Concluir itens do checklist e avançar para completed
        res_move = client.patch(
            f"/api/v1/kanban/tickets/{ticket_id}/move",
            json={
                "status": "completed",
                "order": 1,
                "acceptance_criteria": [
                    {"item": "Validar colunas obrigatórias", "done": True},
                ],
            },
        )
        assert res_move.status_code == 200
        assert res_move.json()["status"] == "completed"

        # 6. Exportar Case de Portfólio (goals)
        res_export = client.post(f"/api/v1/goals/portfolio/export/{ticket_id}")
        assert res_export.status_code == 200
        assert res_export.json()["in_portfolio"] is True
        assert "Case de Portfólio" in res_export.json()["case_markdown"]

        # 7. Streaming SSE do Study Hub (study/rag)
        res_sse = client.get("/api/v1/study/rag/stream?q=Arquitetura+Monolito+Modular")
        assert res_sse.status_code == 200
        assert "data:" in res_sse.text
