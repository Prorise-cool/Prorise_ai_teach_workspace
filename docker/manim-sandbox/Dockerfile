# Manim 沙箱镜像 — 用于视频渲染流水线
# 包含: manim + CJK 字体 + LaTeX ctex + ffmpeg
#
# 构建示例:
#   docker build -t manim-sandbox:latest docker/manim-sandbox/
#
# 运行示例:
#   docker run --rm -v $(pwd):/workspace:rw manim-sandbox:latest python /workspace/run_manim.py MyScene

FROM python:3.11-slim AS base

# ---- 系统依赖 ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Manim 渲染核心依赖
    libcairo2-dev \
    libpango1.0-dev \
    pkg-config \
    build-essential \
    python3-dev \
    # LaTeX 引擎（精简安装，避免 texlive-full 的 4GB+ 体积）
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-lang-chinese \
    texlive-xetex \
    texlive-luatex \
    dvisvgm \
    ghostscript \
    # CJK 字体
    fonts-noto-cjk \
    fonts-noto-cjk-extra \
    fonts-wqy-microhei \
    fonts-wqy-zenhei \
    # 渲染相关音视频工具
    ffmpeg \
    # 字体管理
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# ---- 字体缓存 ----
RUN fc-cache -fv

# ---- Python 依赖 ----
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt

# ---- 工作目录 ----
WORKDIR /workspace

# 默认入口：运行 manim 渲染脚本
ENTRYPOINT ["python"]
