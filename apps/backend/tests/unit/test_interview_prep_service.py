from unittest.mock import AsyncMock, patch

import pytest
from pydantic import ValidationError

from app.services.interview_prep import generate_interview_prep


SAMPLE_RESUME = {
    "personalInfo": {"name": "Jane Doe"},
    "summary": "Backend engineer",
    "workExperience": [],
    "education": [],
    "personalProjects": [],
    "additional": {"technicalSkills": ["Python", "FastAPI"]},
}


def _valid_payload():
    return {
        "role_fit_analysis": ["Python API experience is relevant."],
        "resume_questions": [
            {
                "question": "How did you build the API?",
                "focus_area": "Backend APIs",
                "suggested_answer_points": ["Use resume-grounded API details."],
            }
        ],
        "project_follow_ups": [],
        "skill_gaps": [
            {
                "skill": "Kubernetes",
                "why_it_matters": "The JD mentions deployment.",
                "preparation_suggestion": "Review basics without claiming experience.",
            }
        ],
        "talking_points": ["Connect FastAPI work to the role."],
    }


@pytest.mark.asyncio
async def test_generate_interview_prep_validates_successful_json():
    with patch(
        "app.services.interview_prep.complete_json",
        new_callable=AsyncMock,
    ) as mock_complete, patch(
        "app.services.interview_prep.get_model_name",
        return_value="openai/small-output-model",
    ) as mock_get_model_name, patch(
        "app.services.interview_prep.get_safe_max_tokens",
        return_value=4096,
    ) as mock_get_safe_max_tokens:
        mock_complete.return_value = _valid_payload()

        result = await generate_interview_prep(SAMPLE_RESUME, "Need FastAPI", "en")

    assert result.role_fit_analysis == ["Python API experience is relevant."]
    mock_complete.assert_awaited_once()
    mock_get_model_name.assert_called_once()
    mock_get_safe_max_tokens.assert_called_once_with(
        "openai/small-output-model",
        requested=8192,
    )
    assert mock_complete.await_args.kwargs["max_tokens"] == 4096
    assert mock_complete.await_args.kwargs["schema_type"] == "interview_prep"


@pytest.mark.asyncio
async def test_generate_interview_prep_bounds_prompt_inputs():
    with patch(
        "app.services.interview_prep.complete_json",
        new_callable=AsyncMock,
    ) as mock_complete:
        mock_complete.return_value = _valid_payload()

        large_resume = {
            **SAMPLE_RESUME,
            "summary": "Backend engineer " + ("with API delivery evidence. " * 3000),
        }
        await generate_interview_prep(
            large_resume,
            "Need FastAPI. " + ("Detailed requirement. " * 1500),
            "en",
        )

    prompt = mock_complete.await_args.kwargs["prompt"]
    assert len(prompt) < 50_000
    assert "Content truncated for prompt length" in prompt
    assert "do not infer or invent omitted details" in prompt


@pytest.mark.asyncio
async def test_generate_interview_prep_rejects_malformed_llm_json():
    with patch(
        "app.services.interview_prep.complete_json",
        new_callable=AsyncMock,
    ) as mock_complete:
        mock_complete.return_value = {
            "role_fit_analysis": ["Only one required key is present."]
        }

        with pytest.raises(ValidationError):
            await generate_interview_prep(SAMPLE_RESUME, "Need FastAPI", "en")
