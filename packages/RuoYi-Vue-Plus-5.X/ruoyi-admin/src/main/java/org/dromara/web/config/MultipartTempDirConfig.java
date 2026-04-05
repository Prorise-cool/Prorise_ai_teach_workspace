package org.dromara.web.config;

import jakarta.servlet.MultipartConfigElement;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.web.servlet.MultipartProperties;
import org.springframework.boot.web.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * multipart 临时目录兜底配置。
 *
 * <p>某些本地运行环境会把上传临时目录解析到只读根目录，例如 `/ruoyi`，
 * 导致 Undertow 在解析 multipart 请求前就抛出 500。这里优先使用现有配置，
 * 若不可写则自动回退到当前 JVM 的临时目录或项目目录下的可写路径。</p>
 *
 * @author Codex
 */
@Slf4j
@Configuration
public class MultipartTempDirConfig {

    @Bean
    public MultipartConfigElement multipartConfigElement(MultipartProperties properties) {
        MultipartConfigFactory factory = new MultipartConfigFactory();
        factory.setMaxFileSize(properties.getMaxFileSize());
        factory.setMaxRequestSize(properties.getMaxRequestSize());
        factory.setFileSizeThreshold(properties.getFileSizeThreshold());

        String configuredLocation = properties.getLocation();
        Path resolvedLocation = resolveWritableLocation(
            configuredLocation,
            Paths.get(System.getProperty("java.io.tmpdir")),
            Paths.get(System.getProperty("user.dir"))
        );

        if (StringUtils.hasText(configuredLocation) && !resolvedLocation.equals(Paths.get(configuredLocation))) {
            log.warn("multipart 临时目录 [{}] 不可写，已回退到 [{}]", configuredLocation, resolvedLocation);
        }

        factory.setLocation(resolvedLocation.toString());
        return factory.createMultipartConfig();
    }

    static Path resolveWritableLocation(String configuredLocation, Path tempRoot, Path workingRoot) {
        if (StringUtils.hasText(configuredLocation)) {
            Path preferredLocation = ensureWritableDirectory(Paths.get(configuredLocation));
            if (preferredLocation != null) {
                return preferredLocation;
            }
        }

        Path systemTempLocation = ensureWritableDirectory(tempRoot.resolve("ruoyi").resolve("server").resolve("temp"));
        if (systemTempLocation != null) {
            return systemTempLocation;
        }

        Path projectTempLocation = ensureWritableDirectory(workingRoot.resolve("ruoyi-data").resolve("upload-temp"));
        if (projectTempLocation != null) {
            return projectTempLocation;
        }

        throw new IllegalStateException("无法找到可写的 multipart 临时目录");
    }

    private static Path ensureWritableDirectory(Path directory) {
        try {
            Files.createDirectories(directory);
            if (Files.isDirectory(directory) && Files.isWritable(directory)) {
                return directory;
            }
        } catch (IOException | RuntimeException ignored) {
            // 尝试下一个可写目录
        }
        return null;
    }
}
