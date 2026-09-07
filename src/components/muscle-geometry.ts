import type { MuscleRegion } from '../muscle-map'

// Original paths drawn for Brabita: relaxed stance, natural joints and continuous curves.
// The supplied silhouette is a proportions reference, not traced/imported artwork.
export const bodyOutline = 'M90 15 C79 15 73 22 74 34 C72 36 74 43 77 45 C79 50 82 54 81 61 C81 70 72 73 61 75 C48 77 46 90 45 105 C45 122 40 137 38 150 C33 164 33 186 28 204 C25 210 22 215 23 223 C23 229 27 234 30 232 L28 223 C28 220 30 216 31 216 C30 227 33 231 35 226 L36 215 C35 210 33 208 35 202 C42 184 47 170 48 157 C53 144 56 131 59 116 C61 125 65 133 66 141 C68 153 61 163 58 176 C53 193 55 211 60 230 C64 249 70 267 71 280 C69 294 66 305 69 324 C71 342 77 358 77 372 C77 379 70 382 70 387 C69 392 79 392 85 390 C89 388 89 383 88 377 L87 347 C86 332 90 315 88 302 C86 290 87 283 88 269 L89 231 Q90 222 91 231 L92 269 C93 283 94 290 92 302 C90 315 94 332 93 347 L92 377 C91 383 91 388 95 390 C101 392 111 392 110 387 C110 382 103 379 103 372 C103 358 109 342 111 324 C114 305 111 294 109 280 C110 267 116 249 120 230 C125 211 127 193 122 176 C119 163 112 153 114 141 C115 133 119 125 121 116 C124 131 127 144 132 157 C133 170 138 184 145 202 C147 208 145 210 144 215 L145 226 C147 231 150 227 149 216 C150 216 152 220 152 223 L150 232 C153 234 157 229 157 223 C158 215 155 210 152 204 C147 186 147 164 142 150 C140 137 135 122 135 105 C134 90 132 77 119 75 C108 73 99 70 99 61 C98 54 101 50 103 45 C106 43 108 36 106 34 C107 22 101 15 90 15Z'

export type MusclePatch = { region: MuscleRegion; path: string; mirrored?: boolean }
const shoulders = 'M60 79 C51 81 48 91 49 104 C52 108 56 108 59 104 C62 96 64 87 67 81 Q64 79 60 79Z'
const arm = 'M49 111 C48 124 43 140 42 149 Q45 153 48 150 C53 139 57 125 57 113 Q53 109 49 111Z'
const forearm = 'M40 157 C36 169 36 185 33 198 Q35 201 37 197 C42 184 46 170 45 160 Q44 157 40 157Z'
export const frontPatches: MusclePatch[] = [
  { region: 'shoulders', path: shoulders, mirrored: true },
  { region: 'chest', path: 'M69 83 C74 81 81 83 87 85 L87 107 C80 114 69 114 63 106 C63 98 66 88 69 83Z', mirrored: true },
  { region: 'biceps', path: arm, mirrored: true },
  { region: 'forearms', path: forearm, mirrored: true },
  { region: 'abs', path: 'M81 119 Q90 116 99 119 C98 133 97 146 98 158 Q96 171 90 176 Q84 171 82 158 C83 146 82 133 81 119Z' },
  { region: 'abs', path: 'M65 119 Q70 120 76 125 C78 138 76 149 78 160 L67 167 C70 151 72 143 65 119Z', mirrored: true },
  { region: 'abductors', path: 'M65 174 Q70 169 78 171 C76 181 67 190 59 199 Q57 186 65 174Z', mirrored: true },
  { region: 'quads', path: 'M63 205 C68 198 73 195 77 198 C82 215 83 238 82 253 C82 264 79 272 75 275 C73 261 66 242 63 226 Q60 213 63 205Z', mirrored: true },
  { region: 'adductors', path: 'M80 185 Q85 189 88 201 L86 237 Q84 248 83 247 C84 224 81 208 77 198Z', mirrored: true },
]
export const backPatches: MusclePatch[] = [
  { region: 'shoulders', path: shoulders, mirrored: true },
  { region: 'back', path: 'M84 71 Q78 77 69 80 C66 91 68 106 76 115 L87 129 L87 84Z', mirrored: true },
  { region: 'back', path: 'M63 111 Q72 119 83 132 L80 156 Q74 157 69 151 C70 137 66 127 63 111Z', mirrored: true },
  { region: 'lowerBack', path: 'M84 132 L88 136 L88 175 Q80 174 73 166 Q82 153 84 132Z', mirrored: true },
  { region: 'triceps', path: arm, mirrored: true },
  { region: 'forearms', path: forearm, mirrored: true },
  { region: 'abductors', path: 'M64 170 Q70 166 75 167 L73 179 Q63 183 59 195 Q58 181 64 170Z', mirrored: true },
  { region: 'glutes', path: 'M74 181 Q81 178 87 184 L87 210 C82 222 68 222 61 213 C58 199 64 186 74 181Z', mirrored: true },
  { region: 'hamstrings', path: 'M63 225 Q74 229 84 220 C85 235 83 251 81 264 L76 277 C73 263 66 245 63 225Z', mirrored: true },
  { region: 'calves', path: 'M74 291 Q81 288 83 296 C87 313 82 335 79 350 C75 339 71 324 72 311 Q71 300 74 291Z', mirrored: true },
]
