/**
 * TTS 语音配置
 * 
 * 基于硅基流动 FunAudioLLM/CosyVoice2-0.5B 模型的 8 种预置音色
 * @see https://docs.siliconflow.cn/capabilities/text-to-speech
 */

export interface Voice {
  /** 语音 ID（格式：模型名:音色ID） */
  id: string
  /** 显示名称 */
  label: string
  /** 性别 */
  gender: 'female' | 'male'
  /** 描述 */
  description?: string
}

/**
 * 系统预置音色列表
 */
export const VOICE_OPTIONS: Voice[] = [
  // 女声
  { 
    id: 'FunAudioLLM/CosyVoice2-0.5B:diana', 
    label: 'Diana',
    gender: 'female',
    description: '欢快女声',
  },
  { 
    id: 'FunAudioLLM/CosyVoice2-0.5B:claire', 
    label: 'Claire',
    gender: 'female',
    description: '温柔女声',
  },
  { 
    id: 'FunAudioLLM/CosyVoice2-0.5B:anna', 
    label: 'Anna',
    gender: 'female',
    description: '沉稳女声',
  },
  { 
    id: 'FunAudioLLM/CosyVoice2-0.5B:bella', 
    label: 'Bella',
    gender: 'female',
    description: '激情女声',
  },
  // 男声
  { 
    id: 'FunAudioLLM/CosyVoice2-0.5B:alex', 
    label: 'Alex',
    gender: 'male',
    description: '沉稳男声',
  },
  { 
    id: 'FunAudioLLM/CosyVoice2-0.5B:david', 
    label: 'David',
    gender: 'male',
    description: '欢快男声',
  },
  { 
    id: 'FunAudioLLM/CosyVoice2-0.5B:charles', 
    label: 'Charles',
    gender: 'male',
    description: '磁性男声',
  },
  { 
    id: 'FunAudioLLM/CosyVoice2-0.5B:benjamin', 
    label: 'Benjamin',
    gender: 'male',
    description: '低沉男声',
  },
]

/**
 * 获取默认语音
 */
export function getDefaultVoice(): Voice {
  return VOICE_OPTIONS[0] // Diana
}

/**
 * 根据 ID 获取语音
 */
export function getVoiceById(id: string): Voice | undefined {
  return VOICE_OPTIONS.find(v => v.id === id)
}

