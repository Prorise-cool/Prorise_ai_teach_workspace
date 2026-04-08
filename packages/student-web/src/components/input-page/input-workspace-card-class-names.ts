/**
 * 文件说明：输入工作区卡片共享 BEM className 推导工具。
 * 负责为课堂页与视频页生成统一的卡片骨架 class 名集合。
 */

/** 输入工作区卡片 class 名集合。 */
export type InputWorkspaceCardClassNames = {
  root: string;
  hints: string;
  hint: string;
  hintAccent: string;
  hintDesc: string;
  body: string;
  toolbar: string;
  tools: string;
};

/**
 * 由页面 block 推导输入工作区卡片的 BEM class 名。
 *
 * @param block - 页面 block 名。
 * @returns 共享卡片骨架使用的 class 名集合。
 */
export function createInputWorkspaceCardClassNames(
  block: string,
): InputWorkspaceCardClassNames {
  const root = `${block}__card`;

  return {
    root,
    hints: `${root}-hints`,
    hint: `${root}-hint`,
    hintAccent: `${root}-hint--accent`,
    hintDesc: `${root}-hint-desc`,
    body: `${root}-body`,
    toolbar: `${root}-toolbar`,
    tools: `${root}-tools`,
  };
}
