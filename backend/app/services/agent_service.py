class AgentService:
    """Agent service for planning and execution."""

    async def run(self, task: str) -> dict:
        from app.agents.planner import make_plan, make_structured_plan
        from app.agents.crew import run_crew
        from app.services.tool_router_service import ToolRouterService

        intents = await ToolRouterService().infer_intents(task)
        plan = make_plan(task, intents=intents)
        structured_plan = make_structured_plan(task, intents=intents)
        output = await run_crew(task, intents=intents)
        return {
            "task": task,
            "intents": intents,
            "plan": plan,
            "structured_plan": structured_plan,
            "result": output,
        }
