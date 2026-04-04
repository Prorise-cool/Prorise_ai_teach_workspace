# 小麦设计系统 (XiaoMai Design System) - Design Tokens

这份文档记录了项目中统一使用的全局设计规范变量（Design Tokens），旨在保持前后端以及设计稿的一致性。

## 一、颜色系统 (Color System)

### 1. 品牌色 (Brand Colors)
*   **Primary (主色)**: `#f5c547` (`$primary`)
*   **Primary Dark (深色主色)**: `#e6b841` (`$primary-dark`)
*   **Secondary (次色)**: `#f5ede1` (`$secondary`)
*   **Secondary Dark (深色次色)**: `#2a2420` (`$secondary-dark`)
*   **Decorative (装饰色)**: `#3b1701` (`$decorative`)

### 2. 模式表面色 (Mode Surfaces)
#### 亮色模式 (Light Mode)
*   **Background (背景色)**: `#f5ede1` (`$bg-light`)
*   **Surface (卡片/表面色)**: `#ffffff` (`$surface-light`)
*   **Text Primary (主要文本)**: `#3b1701` (`$text-primary`)
*   **Text Secondary (次要文本)**: `#6b4421` (`$text-secondary`)
*   **Border (边框色)**: `#e6dcc8` (`$border-light`)

#### 暗色模式 (Dark Mode)
*   **Background (背景色)**: `#1a1614` (`$bg-dark`)
*   **Surface (卡片/表面色)**: `#2a2420` (`$surface-dark`)
*   **Text Primary (主要文本)**: `#f5ede1` (`$text-primary-dark`)
*   **Text Secondary (次要文本)**: `#c4b8a8` (`$text-secondary-dark`)
*   **Border (边框色)**: `#3d3630` (`$border-dark`)

### 3. 语义色 (Semantic Colors)
*   **Success (成功)**: `#52c41a` (`$success`)
*   **Success Dark (深色成功)**: `#51d712` (`$success-dark`)
*   **Warning (警告)**: `#ff6700` (`$warning`)
*   **Warning Dark (深色警告)**: `#f34700` (`$warning-dark`)
*   **Error (错误)**: `#f82834` (`$error`)
*   **Error Dark (深色错误)**: `#bf0004` (`$error-dark`)


## 二、排版系统 (Typography)

*默认字体族*: `Inter`

*   **H1 (页面大标题)**: `48px` (`$font-h1`), Semibold (600) / Extrabold (800)
*   **H2 (模块标题)**: `36px` (`$font-h2`), Semibold (600)
*   **H3 (卡片标题)**: `24px` (`$font-h3`), Medium (500)
*   **Body Large (正文 - 大)**: `18px` (`$font-body-lg`), Regular (400) / Medium (500)
*   **Body (正文 - 中)**: `16px` (`$font-body`), Regular (400)
*   **Body Small (正文 - 小)**: `14px` (`$font-body-sm`), Regular (400)
*   **Caption (辅助文字)**: `12px` (`$font-caption`), Regular (400)


## 三、间距系统 (Spacing)

基于 4px 基础单位的间距系统。

*   `$spacing-1`: `4px` (紧凑间距，用于图标与文字)
*   `$spacing-2`: `8px`
*   `$spacing-3`: `12px`
*   `$spacing-4`: `16px` (默认间距，如按钮内边距)
*   `$spacing-5`: `20px`
*   `$spacing-6`: `24px` (模块间距，如气泡标签之间)
*   `$spacing-8`: `32px`
*   `$spacing-10`: `40px` (大模块间距，如输入框周围留白)


## 四、圆角系统 (Border Radius)

*   `$radius-sm`: `4px` (图标、复选框等小元素)
*   `$radius-md`: `8px` (标准卡片、弹窗内部元素、按钮)
*   `$radius-lg`: `16px` (核心对话框主体、大型内容卡片)
*   `$radius-full`: `9999px` (悬浮导航、药丸形标签、头像)


## 五、阴影系统 (Shadows)

*(基于 UI 设计稿提取的值)*

*   **Shadow Sm**: 偏移 (0, 2), 模糊 8, 颜色 `#0000001A`。用于卡片、按钮悬浮。
*   **Shadow Md**: 偏移 (0, 4), 模糊 16, 颜色 `#0000001F`。用于下拉菜单、气泡、输入框焦点等。
*   **Shadow Lg**: 偏移 (0, 8), 模糊 24, 颜色 `#00000029`。用于全局弹窗、抽屉。