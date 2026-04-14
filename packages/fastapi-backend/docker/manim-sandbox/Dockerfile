FROM mcr.microsoft.com/devcontainers/python:1-3.11-bookworm

WORKDIR /workspace

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN rm -f /etc/apt/sources.list.d/yarn.list && \
    apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    fonts-dejavu \
    fonts-noto-cjk \
    fonts-wqy-microhei \
    fonts-wqy-zenhei \
    texlive \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-lang-chinese \
    texlive-xetex \
    texlive-luatex \
    texlive-science \
    dvisvgm \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

RUN python -m pip install --upgrade pip setuptools wheel && \
    python -m pip install manim==0.19.0 mypy==1.19.1

# 运行时由沙箱执行器挂载脚本与输出目录，镜像本身不内置任何业务代码或敏感配置。
ENTRYPOINT ["python"]
