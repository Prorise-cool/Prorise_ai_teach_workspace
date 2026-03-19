# 使用官方的 Python 镜像作为基础镜像
FROM python:3.11.1-slim

# 设置工作目录
WORKDIR /ManimToVideo

# 更新包列表并安装所需的包
RUN apt-get update && apt-get install -y \
    texlive-full \
    sox \
    context \
    build-essential \
    python3-dev \
    libcairo2-dev \
    libpango1.0-dev \
    ffmpeg \
    portaudio19-dev \
    libsox-fmt-all \
    fonts-dejavu \
    fontconfig \
    pkg-config \
    fonts-noto-cjk \  
    fonts-wqy-microhei \  
    fonts-wqy-zenhei 

# 创建字体缓存目录
RUN mkdir -p /root/.fontconfig

# 下载思源黑体
RUN mkdir -p /usr/share/fonts/truetype/source-han-sans && \
    apt-get install -y wget unzip && \
    wget -q https://github.com/adobe-fonts/source-han-sans/releases/download/2.004R/SourceHanSansCN.zip && \
    unzip SourceHanSansCN.zip -d /usr/share/fonts/truetype/source-han-sans && \
    rm SourceHanSansCN.zip && \
    fc-cache -fv  # 更新字体缓存

# 设置环境变量
ENV FONTCONFIG_PATH=/root/.fontconfig

# 单独复制 requirements.txt 并安装 Python 依赖
COPY requirements.txt /ManimToVideo/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 复制当前目录的内容到容器内的 /ManimToVideo 目录
COPY . /ManimToVideo

# 安装自定义的包并清理构建文件
RUN pip install . && rm -rf build/ dist/ *.egg-info/

# 暴露 默认的运行端口
EXPOSE 2333

# 设置启动 FastAPI 的命令
# 设置 ENTRYPOINT 和 CMD
ENTRYPOINT ["uvicorn"]
CMD ["handler_fastapi:app", "--host", "0.0.0.0", "--port", "2333"]
