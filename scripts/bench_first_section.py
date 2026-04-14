#!/usr/bin/env python3
"""
视频管道首段出片基准测试脚本。

用法:
    python scripts/bench_first_section.py [--prompt "数学题"] [--timeout 600]

流程:
    1. POST /api/v1/video/tasks → 创建任务
    2. GET SSE /api/v1/video/tasks/{id}/events → 监听事件流
    3. 并行轮询 GET /api/v1/video/tasks/{id}/preview → 检测首段就绪
    4. 报告各里程碑耗时
"""

import argparse
import asyncio
import json
import sys
import time
import uuid
from dataclasses import dataclass, field

import httpx

BASE_URL = "http://localhost:8090/api/v1"
TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJsb2dpblR5cGUiOiJsb2dpbiIsImxvZ2luSWQiOiJzeXNfdXNlcjoxIiwicm5TdHIiOiJiOXpBZVR5eTNVN2FlT0dFY1RWOUdFdlZ2T3pYaEdaciIsImNsaWVudGlkIjoiZTVjZDdlNDg5MWJmOTVkMWQxOTIwNmNlMjRhN2IzMmUiLCJ0ZW5hbnRJZCI6IjAwMDAwMCIsInVzZXJJZCI6MSwidXNlck5hbWUiOiJhZG1pbiIsImRlcHRJZCI6MTAzLCJkZXB0TmFtZSI6IueglOWPkemDqOmXqCIsImRlcHRDYXRlZ29yeSI6IiJ9."
    "pUeXj235ehqt6XHA5uG5Y48-xE-HLXabxRKbtvcoxXI"
)

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

DEFAULT_PROMPT = "求函数f(x)=x²-2x+1的最小值"


@dataclass
class Milestones:
    t0: float = 0.0
    task_created: float = 0.0
    first_event: float = 0.0
    outline_done: float = 0.0
    storyboard_done: float = 0.0
    first_section_generating: float = 0.0
    first_section_rendering: float = 0.0
    first_section_ready: float = 0.0
    tts_first_seen: float = 0.0
    completed: float = 0.0
    events_log: list[str] = field(default_factory=list)


def elapsed(t0: float, t: float) -> float:
    return round(t - t0, 1)


async def create_task(client: httpx.AsyncClient, prompt: str) -> str:
    """创建视频任务，返回 task_id。"""
    payload = {
        "inputType": "text",
        "sourcePayload": {"text": prompt},
        "clientRequestId": f"bench-{uuid.uuid4().hex[:12]}",
    }
    resp = await client.post(
        f"{BASE_URL}/video/tasks",
        json=payload,
        headers=HEADERS,
    )
    resp.raise_for_status()
    body = resp.json()
    task_id = body["data"]["taskId"]
    return task_id


async def listen_sse(
    client: httpx.AsyncClient,
    task_id: str,
    milestones: Milestones,
    stop_event: asyncio.Event,
    timeout: float,
):
    """监听 SSE 事件流，记录里程碑。"""
    url = f"{BASE_URL}/video/tasks/{task_id}/events"
    try:
        async with client.stream("GET", url, headers={**HEADERS, "Accept": "text/event-stream"}, timeout=httpx.Timeout(timeout)) as resp:
            if resp.status_code != 200:
                print(f"  [SSE] 非预期状态码: {resp.status_code}")
                return
            buffer = ""
            async for chunk in resp.aiter_text():
                if stop_event.is_set():
                    return
                buffer += chunk
                while "\n\n" in buffer:
                    raw_event, buffer = buffer.split("\n\n", 1)
                    event_data = {}
                    for line in raw_event.splitlines():
                        if line.startswith("data:"):
                            try:
                                event_data = json.loads(line[5:].strip())
                            except json.JSONDecodeError:
                                pass
                        elif line.startswith("event:"):
                            event_data["_event"] = line[6:].strip()
                        elif line.startswith("id:"):
                            event_data["_id"] = line[3:].strip()

                    if not event_data:
                        continue

                    now = time.monotonic()
                    evt_name = event_data.get("event") or event_data.get("_event") or "?"
                    msg = event_data.get("message") or ""
                    stage = event_data.get("stage") or event_data.get("currentStage") or ""
                    progress = event_data.get("progress") or ""
                    status = event_data.get("status") or ""
                    context = event_data.get("context", {})

                    log_line = f"T+{elapsed(milestones.t0, now):>6.1f}s  {evt_name or '?':<20} stage={stage or '':<16} progress={progress or ''} msg={(msg or '')[:60]}"
                    milestones.events_log.append(log_line)
                    print(f"  [SSE] {log_line}")

                    # 记录里程碑
                    if milestones.first_event == 0.0:
                        milestones.first_event = now

                    # outline/storyboard 完成
                    if stage in ("storyboard",) and evt_name == "progress":
                        if milestones.outline_done == 0.0:
                            milestones.outline_done = now
                    if stage == "storyboard" and msg and "complete" in msg.lower():
                        if milestones.storyboard_done == 0.0:
                            milestones.storyboard_done = now

                    # section_progress 事件
                    if evt_name == "section_progress":
                        sec_idx = context.get("sectionIndex", context.get("section_index"))
                        sec_status = context.get("status", "")
                        if sec_idx == 0 or sec_idx == "0" or sec_idx is None:
                            if sec_status in ("generating",) and milestones.first_section_generating == 0.0:
                                milestones.first_section_generating = now
                            if sec_status in ("rendering",) and milestones.first_section_rendering == 0.0:
                                milestones.first_section_rendering = now

                    # section_ready 事件
                    if evt_name == "section_ready":
                        now2 = time.monotonic()
                        sec_id = context.get("sectionId", context.get("section_id", ""))
                        sec_idx2 = context.get("sectionIndex", context.get("section_index"))
                        print(f"  [SSE] ★ Section ready: {sec_id} (index={sec_idx2}) at T+{elapsed(milestones.t0, now2):.1f}s")
                        if sec_idx2 == 0 or sec_idx2 == "0" or sec_idx2 is None:
                            if milestones.first_section_ready == 0.0:
                                milestones.first_section_ready = now2
                                stop_event.set()
                                return

                    # TTS 首次出现
                    if "tts" in stage.lower() and milestones.tts_first_seen == 0.0:
                        milestones.tts_first_seen = now

                    # completed
                    if evt_name == "completed" or status == "completed":
                        milestones.completed = now
                        stop_event.set()
                        return

                    # failed
                    if evt_name == "failed" or status == "failed":
                        err = event_data.get("errorCode", event_data.get("error_code", "unknown"))
                        print(f"  [SSE] ✗ Task failed: {err} msg={msg}")
                        stop_event.set()
                        return

    except httpx.ReadTimeout:
        print(f"  [SSE] 读取超时 ({timeout}s)")
    except Exception as e:
        print(f"  [SSE] 异常: {type(e).__name__}: {e}")


async def poll_preview(
    client: httpx.AsyncClient,
    task_id: str,
    milestones: Milestones,
    stop_event: asyncio.Event,
    interval: float = 5.0,
):
    """轮询 preview 端点，检测首段 clip_url 可用。"""
    url = f"{BASE_URL}/video/tasks/{task_id}/preview"
    while not stop_event.is_set():
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=interval)
            return  # stop_event fired
        except asyncio.TimeoutError:
            pass

        try:
            resp = await client.get(url, headers=HEADERS, timeout=15.0)
            if resp.status_code != 200:
                continue
            body = resp.json()
            data = body.get("data", body)
            sections = data.get("sections", [])
            for sec in sections:
                idx = sec.get("sectionIndex", sec.get("section_index", -1))
                if idx != 0:
                    continue
                sec_status = sec.get("status", "")
                clip_url = sec.get("clipUrl") or sec.get("clip_url")
                now = time.monotonic()
                if sec_status in ("generating",) and milestones.first_section_generating == 0.0:
                    milestones.first_section_generating = now
                if sec_status in ("rendering",) and milestones.first_section_rendering == 0.0:
                    milestones.first_section_rendering = now
                if sec_status == "ready" and clip_url:
                    if milestones.first_section_ready == 0.0:
                        milestones.first_section_ready = now
                        print(f"  [PREVIEW] ★ Section 0 ready (clip_url={clip_url[:60]}...) at T+{elapsed(milestones.t0, now):.1f}s")
                        stop_event.set()
                        return
                break  # 只看 section 0
        except Exception as e:
            print(f"  [PREVIEW] 轮询异常: {type(e).__name__}: {e}")


def print_report(m: Milestones, task_id: str, prompt: str):
    """输出基准测试报告。"""
    t0 = m.t0
    print("\n" + "=" * 70)
    print("  视频管道首段出片基准测试报告")
    print("=" * 70)
    print(f"  Task ID:  {task_id}")
    print(f"  Prompt:   {prompt}")
    print(f"  基准时间: T+0 = 任务创建请求发出时刻")
    print()

    rows = [
        ("任务创建响应", m.task_created),
        ("首个SSE事件", m.first_event),
        ("Outline完成", m.outline_done),
        ("Storyboard完成", m.storyboard_done),
        ("TTS首次出现", m.tts_first_seen),
        ("首段generating", m.first_section_generating),
        ("首段rendering", m.first_section_rendering),
        ("★ 首段ready", m.first_section_ready),
    ]

    for label, t in rows:
        if t > 0:
            print(f"  {label:<20} T+{elapsed(t0, t):>6.1f}s")
        else:
            print(f"  {label:<20} —")

    first_sec = m.first_section_ready
    if first_sec > 0:
        delta = elapsed(t0, first_sec)
        target = 120.0
        status = "✓ 达标" if delta <= target else f"✗ 超时 (+{delta - target:.0f}s)"
        print()
        print(f"  首段出片: {delta:.1f}s (目标: ≤{target:.0f}s) {status}")

        # 分解瓶颈
        if m.storyboard_done > 0 and m.first_section_generating > 0:
            gen_wait = elapsed(m.storyboard_done, m.first_section_generating)
            print(f"    storyboard → generating 等待: {gen_wait:.1f}s")
        if m.first_section_generating > 0 and m.first_section_rendering > 0:
            gen_time = elapsed(m.first_section_generating, m.first_section_rendering)
            print(f"    generating (LLM代码生成): {gen_time:.1f}s")
        if m.first_section_rendering > 0 and first_sec > 0:
            render_time = elapsed(m.first_section_rendering, first_sec)
            print(f"    rendering (Manim渲染): {render_time:.1f}s")
    else:
        print()
        print("  首段出片: 未在超时时间内完成")

    print()
    print("  SSE 事件流:")
    for line in m.events_log:
        print(f"    {line}")
    print("=" * 70)


async def run_benchmark(prompt: str, timeout: float):
    m = Milestones()
    m.t0 = time.monotonic()

    async with httpx.AsyncClient() as client:
        # 1. 创建任务
        print(f"[*] 创建视频任务: prompt='{prompt[:40]}...'")
        try:
            task_id = await create_task(client, prompt)
        except Exception as e:
            print(f"[!] 创建任务失败: {type(e).__name__}: {e}")
            if hasattr(e, "response") and e.response is not None:
                print(f"    响应: {e.response.text[:200]}")
            return
        m.task_created = time.monotonic()
        print(f"[✓] 任务已创建: {task_id} (耗时 {elapsed(m.t0, m.task_created):.1f}s)")

        # 2. 并行监听 SSE + 轮询 preview
        stop = asyncio.Event()
        sse_task = asyncio.create_task(listen_sse(client, task_id, m, stop, timeout))
        preview_task = asyncio.create_task(poll_preview(client, task_id, m, stop, interval=5.0))

        # 等待完成或超时
        try:
            await asyncio.wait_for(stop.wait(), timeout=timeout)
        except asyncio.TimeoutError:
            print(f"\n[!] 超时 ({timeout}s)，停止监听")
            stop.set()

        # 清理
        sse_task.cancel()
        preview_task.cancel()
        try:
            await asyncio.gather(sse_task, preview_task, return_exceptions=True)
        except Exception:
            pass

    # 3. 报告
    print_report(m, task_id, prompt)


def main():
    parser = argparse.ArgumentParser(description="视频管道首段出片基准测试")
    parser.add_argument("--prompt", default=DEFAULT_PROMPT, help="题目文本")
    parser.add_argument("--timeout", type=float, default=600, help="最大等待秒数 (默认600)")
    args = parser.parse_args()

    print("=" * 70)
    print("  视频管道首段出片基准测试")
    print("=" * 70)
    print(f"  目标: 首段 ready ≤ 120s")
    print(f"  超时: {args.timeout}s")
    print(f"  Prompt: {args.prompt}")
    print()

    asyncio.run(run_benchmark(args.prompt, args.timeout))


if __name__ == "__main__":
    main()
