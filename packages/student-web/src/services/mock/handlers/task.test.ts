import {
  readJsonBody,
  readNumberProperty,
  readRecord,
  readStringProperty,
} from "@/lib/type-guards";
import { taskHandlers } from "@/services/mock/handlers/task";
import { registerMswServer } from "@/test/utils/msw-server";

registerMswServer(...taskHandlers);

async function readJsonRecord(response: Response) {
  const payload = readRecord(await readJsonBody(response));

  if (!payload) {
    throw new Error("任务 mock 响应必须是 JSON 对象");
  }

  return payload;
}

describe("task mock handlers", () => {
  it("returns an empty task list scenario", async () => {
    const response = await fetch(
      "http://localhost/api/v1/tasks?scenario=empty",
    );
    const payload = await readJsonRecord(response);

    expect(response.status).toBe(200);
    expect(readNumberProperty(payload, "code")).toBe(200);
    expect(readNumberProperty(payload, "total")).toBe(0);
    expect(Array.isArray(payload.rows) ? payload.rows : null).toEqual([]);
  });

  it("returns failed snapshot payloads for task state machines", async () => {
    const response = await fetch(
      "http://localhost/api/v1/tasks/task_mock_failed/snapshot",
    );
    const payload = await readJsonRecord(response);
    const payloadData = readRecord(payload.data);

    expect(response.status).toBe(200);
    expect(readStringProperty(payloadData ?? {}, "status")).toBe("failed");
    expect(readStringProperty(payloadData ?? {}, "errorCode")).toBe(
      "TASK_PROVIDER_TIMEOUT",
    );
  });

  it("returns processing snapshots for dynamically created mock video task ids", async () => {
    const taskId = "vtask_mock_text_mnn16hgn";
    const response = await fetch(
      `http://localhost/api/v1/tasks/${taskId}/snapshot`,
    );
    const payload = await readJsonRecord(response);
    const payloadData = readRecord(payload.data);

    expect(response.status).toBe(200);
    expect(readStringProperty(payloadData ?? {}, "taskId")).toBe(taskId);
    expect(readStringProperty(payloadData ?? {}, "status")).toBe("processing");
    expect(readNumberProperty(payloadData ?? {}, "progress")).toBe(42);
  });

  it("returns a forbidden envelope when the scenario requires access denial", async () => {
    const response = await fetch(
      "http://localhost/api/v1/tasks?scenario=forbidden",
    );
    const payload = await readJsonRecord(response);

    expect(response.status).toBe(403);
    expect(readNumberProperty(payload, "code")).toBe(403);
    expect(readStringProperty(payload, "msg")).toBe("当前账号暂无任务访问权限");
    expect(payload.data).toBeNull();
  });

  it("returns text/event-stream payloads for task event mocks", async () => {
    const response = await fetch(
      "http://localhost/api/v1/tasks/task_mock_completed/events",
    );
    const rawBody = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(rawBody).toContain("event: completed");
    expect(rawBody).toContain('"taskId":"task_mock_completed"');
  });
});
