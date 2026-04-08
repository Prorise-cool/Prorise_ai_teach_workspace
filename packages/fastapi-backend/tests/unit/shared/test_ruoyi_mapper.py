from datetime import datetime

from app.shared.ruoyi_mapper import RuoYiMapper


def test_ruoyi_mapper_normalizes_field_names_status_and_datetime() -> None:
    mapper = RuoYiMapper(
        field_aliases={
            "task_id": "id",
            "task_type": "type_name",
            "status": "task_state",
            "updated_at": "update_time"
        },
        status_fields={
            "status": {
                "1": "processing",
                "2": "completed",
                3: "failed"
            }
        },
        datetime_fields={"updated_at"}
    )

    normalized = mapper.from_ruoyi(
        {
            "id": "video_001",
            "type_name": "video",
            "task_state": "1",
            "update_time": "2026-03-29 10:30:00",
            "extra_field": "keep-me"
        }
    )

    assert normalized == {
        "task_id": "video_001",
        "task_type": "video",
        "status": "processing",
        "updated_at": datetime(2026, 3, 29, 10, 30, 0),
        "extra_field": "keep-me"
    }


def test_ruoyi_mapper_serializes_field_names_status_and_datetime() -> None:
    mapper = RuoYiMapper(
        field_aliases={
            "task_id": "id",
            "task_type": "type_name",
            "status": "task_state",
            "updated_at": "update_time"
        },
        status_fields={
            "status": {
                "1": "processing",
                "2": "completed",
                "done": "completed"
            }
        },
        datetime_fields={"updated_at"}
    )

    serialized = mapper.to_ruoyi(
        {
            "task_id": "video_001",
            "task_type": "video",
            "status": "completed",
            "updated_at": datetime(2026, 3, 29, 10, 30, 0),
            "extra_field": "keep-me"
        }
    )

    assert serialized == {
        "id": "video_001",
        "type_name": "video",
        "task_state": "2",
        "update_time": "2026-03-29 10:30:00",
        "extra_field": "keep-me"
    }
