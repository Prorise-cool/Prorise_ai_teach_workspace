#!/usr/bin/env bash
# Video Pipeline Speed Benchmark — time every stage via SSE (curl-based)
# Usage: bash bench_video_pipeline.sh <token>
set -euo pipefail

TOKEN="${1:?Usage: $0 <bearer_token>}"
BASE="http://localhost:8090/api/v1"
AUTH="Authorization: Bearer $TOKEN"

echo "========================================="
echo "  Video Pipeline Speed Benchmark"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# ── Step 1: Create task ──
echo ""
echo "── Step 1: Creating video task ──"
T_START=$(python3 -c "import time; print(time.time())")

HTTP_CODE=$(curl -s -o /tmp/bench_create.json -w "%{http_code}" \
  -X POST "$BASE/video/tasks" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "inputType": "text",
    "sourcePayload": {
      "text": "请讲解一元二次方程求根公式"
    },
    "clientRequestId": "bench-'$$'-'$(date +%s)'"
  }')

T_CREATE=$(python3 -c "import time; print(f'{time.time() - $T_START:.3f}')")

if [ "$HTTP_CODE" != "202" ]; then
  echo "FAIL: HTTP $HTTP_CODE"
  cat /tmp/bench_create.json | python3 -m json.tool 2>/dev/null || cat /tmp/bench_create.json
  exit 1
fi

TASK_ID=$(python3 -c "import json; print(json.load(open('/tmp/bench_create.json'))['data']['taskId'])")
echo "  taskId: $TASK_ID"
echo "  HTTP $HTTP_CODE in ${T_CREATE}s"

# ── Step 2: Stream SSE with curl, pipe to python for parsing ──
echo ""
echo "── Step 2: Streaming SSE events ──"

# Use timeout 600s (10 min max)
timeout 600 curl -s -N -H "$AUTH" "$BASE/tasks/$TASK_ID/events" 2>/dev/null | python3 - "$TASK_ID" <<'PYEOF'
import json, sys, time, sys

TASK_ID = sys.argv[1]

t0 = time.time()
stage_times = {}
last_stage = None
event_count = 0
completed = False

def flush_report():
    total = time.time() - t0
    if last_stage and last_stage in stage_times and stage_times[last_stage]["end"] is None:
        stage_times[last_stage]["end"] = total

    print(f"\n=========================================", flush=True)
    print(f"  Stage Breakdown", flush=True)
    print(f"=========================================", flush=True)
    print(f"  {'Stage':<30s} {'Start':>8s} {'End':>8s} {'Duration':>10s}", flush=True)
    print(f"  {'-'*30} {'-'*8} {'-'*8} {'-'*10}", flush=True)

    for stage, times in stage_times.items():
        end = times["end"] or total
        dur = end - times["start"]
        print(f"  {stage:<30s} {times['start']:>7.1f}s {end:>7.1f}s {dur:>8.1f}s", flush=True)

    print(f"  {'-'*30} {'-'*8} {'-'*8} {'-'*10}", flush=True)
    print(f"  {'TOTAL':<30s} {'':>8s} {'':>8s} {total:>8.1f}s", flush=True)
    print(f"", flush=True)
    print(f"  Events received: {event_count}", flush=True)
    print(f"  Task ID: {TASK_ID}", flush=True)
    print(f"  Status: {'COMPLETED' if completed else 'FAILED/TIMEOUT'}", flush=True)
    print(f"=========================================", flush=True)

buf = ""
for line in sys.stdin:
    line = line.rstrip("\n")
    if line.startswith("event:"):
        current_event = line[6:].strip()
    elif line.startswith("data:"):
        data_str = line[5:].strip()
        if not data_str:
            continue
        try:
            data = json.loads(data_str)
        except json.JSONDecodeError:
            continue

        event_count += 1
        now = time.time() - t0
        evt_name = data.get("event", "unknown")

        # Track stage transitions
        stage = data.get("currentStage") or data.get("stage") or data.get("stageLabel")
        if stage and stage != last_stage:
            if last_stage and last_stage in stage_times:
                stage_times[last_stage]["end"] = now
            stage_times[stage] = {"start": now, "end": None}
            last_stage = stage

        progress = data.get("progress") or data.get("stageProgress")
        msg = data.get("message", "")

        # Print all events concisely
        if evt_name in ("connected", "task:completed", "task:failed"):
            print(f"  [{now:7.1f}s] {evt_name:25s} stage={stage or '-':20s} progress={str(progress or ''):>5s} {msg[:80]}", flush=True)
        elif evt_name == "task:progress":
            # Only print every 10th or stage change
            if event_count % 10 == 0:
                print(f"  [{now:7.1f}s] {evt_name:25s} stage={stage or '-':20s} progress={str(progress or ''):>5s}", flush=True)

        if evt_name in ("task:completed", "task:failed"):
            completed = True
            flush_report()
            break
    elif line == "":
        # End of SSE event block
        current_event = None

# If we exit loop without completion (e.g. timeout), still flush
if not completed:
    flush_report()
PYEOF
