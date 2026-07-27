"""Optional LLM enhancer for the AI pipeline.

The pipeline is fully functional on heuristics alone. When an Anthropic API
key is configured, :func:`enhance_scenarios` can refine extracted scenarios
(clearer conditions/resolutions, better grouping). All calls degrade to a
no-op if the key or SDK is unavailable, so the pipeline never hard-depends on
network access.
"""

from __future__ import annotations

import json

from app.config import get_settings
from app.models.schemas import Scenario


def is_available() -> bool:
    return get_settings().llm_enabled


def _client():  # pragma: no cover - requires network + key
    from anthropic import Anthropic

    return Anthropic(api_key=get_settings().anthropic_api_key)


def enhance_scenarios(text: str, scenarios: list[Scenario]) -> list[Scenario]:
    """Refine scenario condition/resolution wording using the LLM.

    Returns the input unchanged when the enhancer is unavailable or the call
    fails for any reason.
    """
    if not is_available() or not scenarios:
        return scenarios

    try:  # pragma: no cover - network dependent
        settings = get_settings()
        prompt = (
            "You are refining rule scenarios extracted from a Standard "
            "Operating Procedure. For each scenario, rewrite the condition "
            "and resolution to be concise and unambiguous. Respond with a "
            "JSON array of objects with keys id, condition, resolution.\n\n"
            f"Scenarios:\n{json.dumps([s.model_dump() for s in scenarios])}"
        )
        message = _client().messages.create(
            model=settings.llm_model,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        payload = json.loads(message.content[0].text)
        refinements = {item["id"]: item for item in payload}
        for scenario in scenarios:
            ref = refinements.get(scenario.id)
            if ref:
                scenario.condition = ref.get("condition", scenario.condition)
                scenario.resolution = ref.get("resolution", scenario.resolution)
                scenario.confidence = min(1.0, scenario.confidence + 0.05)
        return scenarios
    except Exception:
        # Any failure (rate limit, parse error, offline) → heuristic result.
        return scenarios
