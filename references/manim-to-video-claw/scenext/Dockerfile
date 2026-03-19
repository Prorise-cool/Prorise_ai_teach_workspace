# 使用官方的 Python 镜像作为基础镜像
FROM python:3.11.1-slim

# 设置工作目录
WORKDIR /SCENEXT
RUN apt-get update && apt-get install -y \
    libpango1.0-dev \
    pkg-config \
    build-essential \
    python3-dev \
    libcairo2-dev && \
    rm -rf /var/lib/apt/lists/*

# 单独复制 requirements.txt 并安装 Python 依赖
COPY requirements.txt /SCENEXT/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 复制当前目录的内容到容器内的 /SCENEXT 目录
COPY . /SCENEXT

# 暴露 默认的运行端口
EXPOSE 2333

# 设置启动 FastAPI 的命令
# 设置 ENTRYPOINT 和 CMD
ENTRYPOINT ["uvicorn"]
CMD ["handler_fastapi:app", "--host", "0.0.0.0", "--port", "2333"]
