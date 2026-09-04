import { describe, expect, it } from 'vitest'
import { avatarCropRect, constrainAvatarCrop, profileAvatarSource } from './avatar'

describe('avatar do perfil', () => {
  it('resolve avatar predefinido e foto local', () => {
    expect(profileAvatarSource({ type: 'preset', presetId: 'lift' }, '/app/')).toBe('/app/avatars/avatar-lift.webp')
    expect(profileAvatarSource({ type: 'custom', dataUrl: 'data:image/webp;base64,abc' }, '/app/')).toBe('data:image/webp;base64,abc')
  })

  it('mantém o recorte quadrado dentro da imagem durante zoom e movimento', () => {
    const constrained = constrainAvatarCrop({ centerX: 0, centerY: 1, zoom: 2 }, { width: 1200, height: 800 })
    const rect = avatarCropRect(constrained, { width: 1200, height: 800 })
    expect(rect).toEqual({ x: 0, y: 400, size: 400 })
  })
})
