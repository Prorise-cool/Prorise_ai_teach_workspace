import pytest

from app.features.learning_coach import service as learning_coach_service


def test_extract_json_payload_handles_raw_json() -> None:
    payload = learning_coach_service.extract_json_payload(
        '{"questions":[{"stem":"x","options":[],"correctOptionId":"A","explanation":"ok"}]}'
    )
    assert payload["questions"][0]["stem"] == "x"


def test_extract_json_payload_handles_fenced_json() -> None:
    payload = learning_coach_service.extract_json_payload(
        "```json\n{\"questions\": []}\n```"
    )
    assert payload == {"questions": []}


def test_extract_json_payload_handles_wrapped_json() -> None:
    payload = learning_coach_service.extract_json_payload(
        "前置说明\n{\"questions\": []}\n后置说明"
    )
    assert payload == {"questions": []}


def test_parse_llm_questions_returns_question_objects_and_answer_key() -> None:
    questions, answer_key = learning_coach_service.parse_llm_questions(
        '{"questions":[{"questionId":"q1","tag":"t","stem":"s","options":[{"optionId":"A","text":"a"},{"optionId":"B","text":"b"},{"optionId":"C","text":"c"},{"optionId":"D","text":"d"}],"correctOptionId":"B","explanation":"e"}]}',
        question_total=1,
    )

    assert len(questions) == 1
    assert questions[0].question_id == "q1"
    assert questions[0].stem == "s"
    assert answer_key["q1"].correct_option_id == "B"
    assert answer_key["q1"].explanation == "e"


def test_parse_llm_questions_rejects_missing_questions() -> None:
    with pytest.raises(ValueError):
        learning_coach_service.parse_llm_questions("{}", question_total=1)

