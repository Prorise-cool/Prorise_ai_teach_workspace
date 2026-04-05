/**
 * 文件说明：社区瀑布流 Mock 数据。
 * 为视频输入页与课堂输入页提供开发阶段的示例卡片。
 */
import type { CommunityWorkCard } from './community-feed-types';

/** 视频输入页 Mock 卡片。 */
export const VIDEO_FEED_MOCK_CARDS: CommunityWorkCard[] = [
  {
    id: 'v-001',
    title: '洛必达法则的完整推导',
    description: '从柯西中值定理出发，逐步推导洛必达法则，配合 Manim 动画演示极限过程。',
    coverUrl: '/entry/roboto.png',
    tag: '视频讲解',
    viewCount: 1247,
    authorName: '林嘉琪',
    authorAvatar: '/entry/teacher-humorous.jpg'
  },
  {
    id: 'v-002',
    title: '偏导数方程的几何意义',
    tag: '视频讲解',
    viewCount: 893,
    authorName: '陈老师'
  },
  {
    id: 'v-003',
    title: '傅里叶变换直觉解释',
    description: '用声波和频谱的类比，帮你在 5 分钟内理解傅里叶变换的核心思想。',
    coverUrl: '/entry/runner.png',
    tag: '视频讲解',
    viewCount: 2106,
    authorName: 'Ava Li',
    authorAvatar: '/entry/teacher-patient.jpg'
  },
  {
    id: 'v-004',
    title: '泰勒展开的收敛半径',
    tag: '视频讲解',
    viewCount: 567,
    authorName: '何文涛'
  },
  {
    id: 'v-005',
    title: '二重积分的极坐标变换',
    description: '通过 Manim 动画直观展示直角坐标系到极坐标系的积分区域变换过程。',
    coverUrl: '/entry/pacheco.png',
    tag: '视频讲解',
    viewCount: 1534,
    authorName: '黄教研员',
    authorAvatar: '/entry/teacher-serious.jpg'
  },
  {
    id: 'v-006',
    title: '矩阵特征值分解的实际应用',
    tag: '视频讲解',
    viewCount: 432,
    authorName: 'Sophia Zhou'
  }
];

/** 课堂输入页 Mock 卡片。 */
export const CLASSROOM_FEED_MOCK_CARDS: CommunityWorkCard[] = [
  {
    id: 'c-001',
    title: '微积分基本定理系统精讲',
    description: '从极限到导数再到积分，一堂完整的虚拟课堂带你走通微积分主线。',
    coverUrl: '/entry/roboto.png',
    tag: '互动课堂',
    viewCount: 3521,
    authorName: '陈老师'
  },
  {
    id: 'c-002',
    title: '数据结构：二叉树全景图',
    tag: '互动课堂',
    viewCount: 1876,
    authorName: '林嘉琪'
  },
  {
    id: 'c-003',
    title: '大学物理：电磁学入门',
    description: '覆盖库仑定律、高斯定理、安培定律三大核心主题的系统课堂。',
    coverUrl: '/entry/runner.png',
    tag: '互动课堂',
    viewCount: 2234,
    authorName: '何文涛',
    authorAvatar: '/entry/teacher-efficient.jpg'
  },
  {
    id: 'c-004',
    title: '概率论：条件概率与贝叶斯',
    tag: '互动课堂',
    viewCount: 998,
    authorName: 'Ava Li'
  },
  {
    id: 'c-005',
    title: '线性代数：向量空间与线性变换',
    description: '用几何直觉理解抽象代数概念，Manim 动画可视化每一步变换。',
    coverUrl: '/entry/pacheco.png',
    tag: '互动课堂',
    viewCount: 1456,
    authorName: '黄教研员'
  },
  {
    id: 'c-006',
    title: '离散数学：图论基础',
    tag: '互动课堂',
    viewCount: 743,
    authorName: 'Sophia Zhou'
  }
];
