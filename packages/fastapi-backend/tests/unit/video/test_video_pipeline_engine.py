from __future__ import annotations

import time
from types import SimpleNamespace

from app.features.video.pipeline.engine.agent import (
    TeachingVideoAgent,
    required_render_successes,
)
from app.features.video.pipeline.engine.c2v_utils import topic_to_safe_name


def test_required_render_successes_rounds_up_to_quality_gate() -> None:
    assert required_render_successes(0) == 0
    assert required_render_successes(1) == 1
    assert required_render_successes(5) == 3


def test_topic_to_safe_name_falls_back_when_title_is_stripped() -> None:
    assert topic_to_safe_name("一元二次方程组") == "video"


def test_render_all_sections_keeps_submitting_remaining_sections_after_quality_gate() -> None:
    agent = TeachingVideoAgent.__new__(TeachingVideoAgent)
    agent.learning_topic = "测试知识点"
    agent.sections = [
        SimpleNamespace(id="section_1"),
        SimpleNamespace(id="section_2"),
        SimpleNamespace(id="section_3"),
        SimpleNamespace(id="section_4"),
        SimpleNamespace(id="section_5"),
    ]
    agent.section_videos = {}
    agent.render_results = {}
    agent.render_summary = {}
    agent.max_fix_bug_tries = 1
    agent.generate_section_code = lambda *args, **kwargs: None
    agent.debug_and_fix_code = lambda *args, **kwargs: False

    started_sections: list[str] = []
    sleep_map = {
        "section_1": 0.01,
        "section_2": 0.01,
        "section_3": 0.01,
        "section_4": 0.03,
        "section_5": 0.03,
    }

    def fake_render(section) -> bool:
        started_sections.append(section.id)
        time.sleep(sleep_map[section.id])
        agent.section_videos[section.id] = f"/tmp/{section.id}.mp4"
        return True

    agent.render_section = fake_render

    started_at = time.monotonic()
    results = TeachingVideoAgent.render_all_sections(
        agent,
        max_workers=2,
        per_section_timeout=1,
        overall_timeout=1,
        success_grace_seconds=0.05,
    )
    elapsed = time.monotonic() - started_at

    assert set(results) == {
        "section_1",
        "section_2",
        "section_3",
        "section_4",
        "section_5",
    }
    assert "section_5" in started_sections
    assert agent.render_summary["allSectionsRendered"] is True
    assert agent.render_summary["completionMode"] == "full"
    assert elapsed < 0.20


def test_render_all_sections_records_degraded_summary_when_budget_expires() -> None:
    agent = TeachingVideoAgent.__new__(TeachingVideoAgent)
    agent.learning_topic = "测试知识点"
    agent.sections = [
        SimpleNamespace(id="section_1"),
        SimpleNamespace(id="section_2"),
        SimpleNamespace(id="section_3"),
        SimpleNamespace(id="section_4"),
        SimpleNamespace(id="section_5"),
    ]
    agent.section_videos = {}
    agent.render_results = {}
    agent.render_summary = {}
    agent.max_fix_bug_tries = 1
    agent.generate_section_code = lambda *args, **kwargs: None
    agent.debug_and_fix_code = lambda *args, **kwargs: False

    sleep_map = {
        "section_1": 0.01,
        "section_2": 0.01,
        "section_3": 0.01,
        "section_4": 0.30,
        "section_5": 0.30,
    }

    def fake_render(section) -> bool:
        time.sleep(sleep_map[section.id])
        agent.section_videos[section.id] = f"/tmp/{section.id}.mp4"
        return True

    agent.render_section = fake_render

    results = TeachingVideoAgent.render_all_sections(
        agent,
        max_workers=2,
        per_section_timeout=1,
        overall_timeout=0.12,
        success_grace_seconds=0.02,
    )

    assert set(results) == {"section_1", "section_2", "section_3", "section_4"}
    assert agent.render_summary["allSectionsRendered"] is False
    assert agent.render_summary["completionMode"] == "degraded"
    assert agent.render_summary["stopReason"] in {
        "quality-gate-grace-expired",
        "overall-render-deadline-reached",
    }
