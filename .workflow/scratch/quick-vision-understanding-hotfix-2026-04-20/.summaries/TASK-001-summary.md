# Quick Task: Understanding Vision Hotfix

**Date:** 2026-04-20
**Status:** Completed

## Goal

修复视频理解阶段不传图片给LLM的问题。当前 UnderstandingService 只传 OCR 文本，需要像 Companion 一样用 generate_vision() 发送图片。

## Changes

**File:** `packages/fastapi-backend/app/features/video/pipeline/services.py`

1. 新增 `_read_image_as_base64()` 函数：从 `local://` 图片引用读取文件并返回 `(base64, mime_type)`
2. 修改 `UnderstandingService.execute()`:
   - 检测 `source_payload.imageRef`
   - 若存在图片，调用 `failover.generate_vision()`
   - 否则降级为纯文本 `generate()`
3. 修复路径：Repair 循环也使用 `generate_vision()` 保持一致性

## Verification

- 新增 `test_understanding_vision_hotfix.py`：3个测试全部通过
- 回归测试：187个测试通过（44 companion + 143 video）

## Technical Notes

参考 tavily 调研的 OpenAI SDK 最佳实践：
- 使用 `data:image/jpeg;base64,{b64}` 格式
- message content 为数组：`[{"type": "image_url"}, {"type": "text"}]`
- OpenAI SDK 已正确封装为 `generate_vision(image_base64=..., image_media_type=...)`