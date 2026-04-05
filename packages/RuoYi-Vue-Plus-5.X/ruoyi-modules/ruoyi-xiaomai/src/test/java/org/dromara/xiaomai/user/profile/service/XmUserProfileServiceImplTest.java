package org.dromara.xiaomai.user.profile.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.dromara.xiaomai.user.profile.domain.XmUserProfile;
import org.dromara.xiaomai.user.profile.domain.bo.XmUserProfileBo;
import org.dromara.xiaomai.user.profile.domain.vo.XmUserProfileVo;
import org.dromara.xiaomai.user.profile.mapper.XmUserProfileMapper;
import org.dromara.xiaomai.user.profile.service.impl.XmUserProfileServiceImpl;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 用户配置服务最小扩展测试。
 *
 * @author Codex
 */
@Tag("dev")
@Tag("local")
public class XmUserProfileServiceImplTest {

    @Test
    void shouldInsertCurrentProfileForFirstTimeUser() {
        XmUserProfileMapper mapper = mock(XmUserProfileMapper.class);
        XmUserProfileServiceImpl service = spy(new XmUserProfileServiceImpl(mapper));
        XmUserProfileBo bo = new XmUserProfileBo();
        bo.setBio("首次简介");
        bo.setTeacherTags("[\"humorous\",\"logical\"]");

        when(mapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
        doAnswer(invocation -> {
            XmUserProfileBo capturedBo = invocation.getArgument(0);
            capturedBo.setId(1001L);
            return true;
        }).when(service).insertByBo(any(XmUserProfileBo.class));

        XmUserProfileVo savedVo = new XmUserProfileVo();
        savedVo.setId(1001L);
        savedVo.setUserId(2001L);
        savedVo.setBio("首次简介");
        savedVo.setTeacherTags("[\"humorous\",\"logical\"]");
        savedVo.setLanguage("zh-CN");
        savedVo.setIsCompleted(0L);
        when(mapper.selectVoById(1001L)).thenReturn(savedVo);

        XmUserProfileVo result = service.saveCurrentProfile(2001L, bo);

        ArgumentCaptor<XmUserProfileBo> boCaptor = ArgumentCaptor.forClass(XmUserProfileBo.class);
        verify(service).insertByBo(boCaptor.capture());

        XmUserProfileBo inserted = boCaptor.getValue();
        assertEquals(2001L, inserted.getUserId());
        assertEquals("zh-CN", inserted.getLanguage());
        assertEquals(0L, inserted.getIsCompleted());
        assertEquals(1001L, bo.getId());
        assertEquals(1001L, result.getId());
    }

    @Test
    void shouldUpdateCurrentProfileWhenExistingRecordPresent() {
        XmUserProfileMapper mapper = mock(XmUserProfileMapper.class);
        XmUserProfileServiceImpl service = spy(new XmUserProfileServiceImpl(mapper));
        XmUserProfile existing = new XmUserProfile();
        existing.setId(3001L);
        existing.setUserId(2002L);
        existing.setIsCompleted(1L);

        XmUserProfileBo bo = new XmUserProfileBo();
        bo.setBio("更新后的简介");

        when(mapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(existing);
        doReturn(true).when(service).updateByBo(any(XmUserProfileBo.class));

        XmUserProfileVo savedVo = new XmUserProfileVo();
        savedVo.setId(3001L);
        savedVo.setUserId(2002L);
        savedVo.setBio("更新后的简介");
        savedVo.setIsCompleted(1L);
        when(mapper.selectVoById(3001L)).thenReturn(savedVo);

        XmUserProfileVo result = service.saveCurrentProfile(2002L, bo);

        ArgumentCaptor<XmUserProfileBo> boCaptor = ArgumentCaptor.forClass(XmUserProfileBo.class);
        verify(service).updateByBo(boCaptor.capture());

        XmUserProfileBo updated = boCaptor.getValue();
        assertEquals(3001L, updated.getId());
        assertEquals(2002L, updated.getUserId());
        assertEquals(1L, updated.getIsCompleted());
        assertEquals(3001L, result.getId());
    }

    @Test
    void shouldResolveCompletionFlagByUserId() {
        XmUserProfileMapper mapper = mock(XmUserProfileMapper.class);
        XmUserProfileServiceImpl service = new XmUserProfileServiceImpl(mapper);
        XmUserProfileVo profile = new XmUserProfileVo();
        profile.setIsCompleted(1L);

        when(mapper.selectVoOne(any(LambdaQueryWrapper.class), eq(false))).thenReturn(profile);

        assertTrue(service.isCompleted(2003L));

        profile.setIsCompleted(0L);
        assertFalse(service.isCompleted(2003L));
    }
}
