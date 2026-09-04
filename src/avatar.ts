import type { AvatarPresetId, ProfileAvatar } from './types'

export type AvatarCrop = { centerX: number; centerY: number; zoom: number }
export type AvatarImageSize = { width: number; height: number }

export const avatarPresets: Array<{ id: AvatarPresetId; label: string; file: string }> = [
  { id: 'flex', label: 'Ratinha flexionando', file: 'avatars/avatar-flex.webp' },
  { id: 'bottle', label: 'Ratinha com garrafa', file: 'avatars/avatar-bottle.webp' },
  { id: 'lift', label: 'Ratinha levantando peso', file: 'avatars/avatar-lift.webp' },
  { id: 'run', label: 'Ratinha correndo', file: 'avatars/avatar-run.webp' },
]

export function profileAvatarSource(avatar: ProfileAvatar | undefined, baseUrl: string) {
  if (!avatar) return undefined
  if (avatar.type === 'custom') return avatar.dataUrl
  const preset = avatarPresets.find((candidate) => candidate.id === avatar.presetId)
  return preset ? `${baseUrl}${preset.file}` : undefined
}

export function constrainAvatarCrop(crop: AvatarCrop, size: AvatarImageSize): AvatarCrop {
  const zoom = Math.min(3, Math.max(1, crop.zoom))
  const cropSize = Math.min(size.width, size.height) / zoom
  const halfX = cropSize / size.width / 2
  const halfY = cropSize / size.height / 2
  return {
    zoom,
    centerX: Math.min(1 - halfX, Math.max(halfX, crop.centerX)),
    centerY: Math.min(1 - halfY, Math.max(halfY, crop.centerY)),
  }
}

export function avatarCropRect(crop: AvatarCrop, size: AvatarImageSize) {
  const constrained = constrainAvatarCrop(crop, size)
  const square = Math.min(size.width, size.height) / constrained.zoom
  return {
    x: constrained.centerX * size.width - square / 2,
    y: constrained.centerY * size.height - square / 2,
    size: square,
  }
}
