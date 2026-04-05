package org.dromara.web.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MultipartTempDirConfigTest {

    @TempDir
    Path tempDir;

    @Test
    void shouldUseConfiguredLocationWhenWritable() {
        Path configuredLocation = tempDir.resolve("configured-upload-temp");

        Path resolvedLocation = MultipartTempDirConfig.resolveWritableLocation(
            configuredLocation.toString(),
            tempDir.resolve("system-temp"),
            tempDir.resolve("workspace")
        );

        assertEquals(configuredLocation, resolvedLocation);
        assertTrue(Files.isDirectory(resolvedLocation));
    }

    @Test
    void shouldFallbackWhenConfiguredLocationCannotBeCreated() throws IOException {
        Path occupiedFile = Files.createFile(tempDir.resolve("occupied-file"));
        Path configuredLocation = occupiedFile.resolve("child-temp");
        Path fallbackTempRoot = tempDir.resolve("system-temp");

        Path resolvedLocation = MultipartTempDirConfig.resolveWritableLocation(
            configuredLocation.toString(),
            fallbackTempRoot,
            tempDir.resolve("workspace")
        );

        assertEquals(fallbackTempRoot.resolve("ruoyi").resolve("server").resolve("temp"), resolvedLocation);
        assertTrue(Files.isDirectory(resolvedLocation));
    }
}
