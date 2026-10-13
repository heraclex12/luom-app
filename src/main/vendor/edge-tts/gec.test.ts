import { describe, expect, it } from 'vitest'
import { secMsGecV2 } from './gec'

// Expected values come from upstream edge-tts 7.3.1 (drm.generate_sec_ms_gec_v2) for the same timestamps.
describe('secMsGecV2', () => {
  it('matches upstream edge-tts for fixed timestamps', () => {
    expect(secMsGecV2(1_700_000_000)).toBe(
      '2CD23A2CA0B2595A-F3C846C370E05F9CC83ACC5F995C5F5D87A4D0F14CE8936A0F902E64099E38A2',
    )
    expect(secMsGecV2(1_760_000_000)).toBe(
      '6D50DDDB91812C33-DD68EFB01898B0750C9797D51A5FF93471DFDAE6888A1039D532CBDCCE54545D',
    )
  })

  it('is stable within a 5-minute bucket and changes across buckets', () => {
    const a = secMsGecV2(1_770_000_000)
    expect(a).toBe('00DDB33FD01602D8-87C1FE6B212DC02BD1C09F05EE72850D2069A3CC92C5F462FDD6DDE2B15E8B08')
    expect(secMsGecV2(1_770_000_299)).toBe(a)
    expect(secMsGecV2(1_770_000_300)).toBe(
      '69C73F060634D1A7-8D4BD99448C08C9FABA222D46C4CC4DAB3462B4093642C26690E3E51C9732CA6',
    )
  })

  it('has the <16 hex>-<64 hex> shape for the current time', () => {
    expect(secMsGecV2(Date.now() / 1000)).toMatch(/^[0-9A-F]{16}-[0-9A-F]{64}$/)
  })
})
