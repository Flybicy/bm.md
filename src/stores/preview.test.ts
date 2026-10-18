import { describe, expect, it } from 'vitest'
import { DEFAULT_MARKDOWN_STYLE_ID } from '@/themes/markdown-style/metadata'
import {
  migratePreviewState,
  partializePreviewState,
  PREVIEW_WIDTH_DESKTOP,
  PREVIEW_WIDTH_MOBILE,
  usePreviewStore,
} from './preview'

describe('preview store 持久化', () => {
  it('默认使用 Kami 主题', () => {
    expect(usePreviewStore.getState().markdownStyle).toBe(DEFAULT_MARKDOWN_STYLE_ID)
  })

  it('持久化 previewWidth', () => {
    const persisted = partializePreviewState({
      ...usePreviewStore.getState(),
      previewWidth: PREVIEW_WIDTH_DESKTOP,
    })

    expect(persisted.previewWidth).toBe(PREVIEW_WIDTH_DESKTOP)
    expect(persisted).not.toHaveProperty('userPreferredWidth')
  })

  it.each([PREVIEW_WIDTH_MOBILE, PREVIEW_WIDTH_DESKTOP])(
    '迁移 v0 userPreferredWidth %i',
    (userPreferredWidth) => {
      expect(migratePreviewState({ userPreferredWidth, previewWidth: 500 }, 0)).toEqual({
        previewWidth: userPreferredWidth,
        mermaidTheme: '',
      })
    },
  )

  it.each([undefined, null, 0, 500, '768'])(
    '非法 v0 宽度 %s 回退为手机宽度并保留其他设置',
    (userPreferredWidth) => {
      expect(migratePreviewState({
        userPreferredWidth,
        previewWidth: PREVIEW_WIDTH_DESKTOP,
        previewColorScheme: 'dark',
        markdownStyle: 'custom',
      }, 0)).toEqual({
        previewWidth: PREVIEW_WIDTH_MOBILE,
        previewColorScheme: 'dark',
        markdownStyle: 'custom',
        mermaidTheme: '',
      })
    },
  )

  it.each([PREVIEW_WIDTH_MOBILE, PREVIEW_WIDTH_DESKTOP])(
    '保留 v1 previewWidth %i 并移除旧宽度字段',
    (previewWidth) => {
      expect(migratePreviewState({ previewWidth, userPreferredWidth: 500 }, 1)).toEqual({
        previewWidth,
        mermaidTheme: '',
      })
    },
  )

  it.each([undefined, null, 0, 500, '768'])(
    '非法 v1 宽度 %s 回退为手机宽度',
    (previewWidth) => {
      expect(migratePreviewState({ previewWidth }, 1)).toEqual({
        previewWidth: PREVIEW_WIDTH_MOBILE,
        mermaidTheme: '',
      })
    },
  )

  describe.each([0, 1])('v%i 主题迁移', (version) => {
    it.each(['', 'dark'])('保留合法主题 %s 及其他偏好', (mermaidTheme) => {
      const preferences = {
        previewColorScheme: 'dark',
        markdownStyle: 'custom',
        codeTheme: 'github-dark',
        infographic: { theme: 'dark', palette: 'antv' },
        customCss: '#bm-md { color: red; }',
      }

      expect(migratePreviewState({
        ...preferences,
        userPreferredWidth: PREVIEW_WIDTH_DESKTOP,
        previewWidth: PREVIEW_WIDTH_DESKTOP,
        mermaidTheme,
      }, version)).toEqual({
        ...preferences,
        previewWidth: PREVIEW_WIDTH_DESKTOP,
        mermaidTheme,
      })
    })

    it.each([undefined, null, 'github-dark', 'tokyo-night', 'default', 1])(
      '非法旧主题 %s 只复位为默认主题',
      (mermaidTheme) => {
        expect(migratePreviewState({
          userPreferredWidth: PREVIEW_WIDTH_DESKTOP,
          previewWidth: PREVIEW_WIDTH_DESKTOP,
          mermaidTheme,
          codeTheme: 'github-dark',
        }, version)).toEqual({
          previewWidth: PREVIEW_WIDTH_DESKTOP,
          mermaidTheme: '',
          codeTheme: 'github-dark',
        })
      },
    )
  })

  it.each([0, 1])('v%i 非对象状态回退为手机宽度', (version) => {
    for (const persistedState of [undefined, null, false, 0, 'settings']) {
      expect(migratePreviewState(persistedState, version)).toEqual({
        previewWidth: PREVIEW_WIDTH_MOBILE,
      })
    }
  })
})
