/**
 * UI Design System - Theme Configuration
 * Dark Gaming Theme: Deep, immersive, neon accents
 */

export const Theme = {
    // 核心色板
    colors: {
        // 品牌色 - 霓虹蓝紫
        primary: {
            start: '#00f2fe',
            end: '#4fadff',
            main: '#00c6ff',
            light: '#5be0ff',
            text: '#000000', // 主按钮文字用黑色
        },
        // 次要色 - 霓虹粉/紫
        secondary: {
            start: '#f093fb',
            end: '#f5576c',
            main: '#f093fb',
            text: '#ffffff',
        },
        // 强调色 - 赛博黄
        accent: {
            start: '#fce38a',
            end: '#f38181',
            main: '#fce38a',
        },
        // 背景色 - 深空黑蓝
        background: {
            // 复杂的深色渐变背景，代码里会处理，这里定义基础色
            main: '#0f0c29',
            gradientStart: '#0f0c29',
            gradientMiddle: '#302b63',
            gradientEnd: '#24243e',

            paper: '#1a1a2e', // 卡片背景 (深蓝灰)

            // 玻璃拟态 - 深色
            glass: 'rgba(255, 255, 255, 0.05)',
            glassLight: 'rgba(255, 255, 255, 0.1)',
            glassHeavy: 'rgba(0, 0, 0, 0.4)',
        },
        // 文字颜色
        text: {
            primary: '#ffffff',
            secondary: 'rgba(255, 255, 255, 0.7)',
            disabled: 'rgba(255, 255, 255, 0.3)',
            highlight: '#00f2fe',
        },
        // 功能色
        status: {
            success: '#00b09b', // Matrix Green
            warning: '#fc4a1a', // 橘红
            error: '#ff416c',
            info: '#00c6ff',
        },
        // 边框
        border: {
            light: 'rgba(255, 255, 255, 0.1)',
            glow: 'rgba(0, 242, 254, 0.3)',
        }
    },

    // 圆角系统
    radius: {
        small: 8,
        medium: 12, // 稍微硬朗一点
        large: 20,
        circle: 9999,
    },

    // 阴影系统 - 霓虹光晕
    shadows: {
        small: {
            color: 'rgba(0, 0, 0, 0.3)',
            blur: 8,
            offsetY: 2,
        },
        medium: {
            color: 'rgba(0, 0, 0, 0.5)',
            blur: 16,
            offsetY: 4,
        },
        large: {
            color: 'rgba(0, 0, 0, 0.7)',
            blur: 30,
            offsetY: 10,
        },
        glow: {
            color: 'rgba(0, 198, 255, 0.6)', // 蓝色霓虹光
            blur: 20,
            offsetY: 0,
        }
    },

    // 字体系统
    fonts: {
        default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        size: {
            h1: 36, // 更大
            h2: 28,
            h3: 20,
            body: 15,
            small: 13,
            tiny: 11,
        },
        weight: {
            regular: '400',
            medium: '600',
            bold: '800', // 更粗
        }
    }
};
