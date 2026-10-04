class AgentService:
    """Agent service for agricultural planning and execution using LangGraph."""

    async def run(self, task: str) -> dict:
        from app.agents.planner import make_plan, make_structured_plan
        from app.agents.langgraph_agent import run_agri_agent

        output = await run_agri_agent(query=task)
        intents = output.get("intents", ["crop"])
        plan = make_plan(task, intents=intents)
        structured_plan = make_structured_plan(task, intents=intents)
        
        return {
            "task": task,
            "intents": intents,
            "plan": plan,
            "structured_plan": structured_plan,
            "result": {
                "final_recommendation": output.get("answer"),
                "source": output.get("source"),
                "weather": output.get("weather_data"),
                "market": output.get("market_data"),
            },
        }

