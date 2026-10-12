import {
  KEEP_DRAWER_KEYS,
  REMOVED_DRAWER_KEYS,
  KEEP_TAB_KEYS,
  REMOVED_TAB_KEYS,
  isKeepDrawerKey,
  canonicalizeTabKey,
} from '../ProductScope';

describe('web product scope', ()=>{
  test('local chart, case and memo drawers remain accessible', ()=>{
    ['chartlist', 'chartadd', 'chartedit', 'caselist', 'caseadd', 'caseedit', 'memo'].forEach((key)=>{
      expect(KEEP_DRAWER_KEYS).toContain(key);
      expect(isKeepDrawerKey(key)).toBe(true);
      expect(REMOVED_DRAWER_KEYS).not.toContain(key);
    });
  });

  test('cloud account and unrelated management drawers stay removed', ()=>{
    ['register', 'login', 'resetpwd', 'changepwd', 'changeparams', 'chartdeeplearn', 'chartsgps', 'commtools'].forEach((key)=>{
      expect(REMOVED_DRAWER_KEYS).toContain(key);
      expect(isKeepDrawerKey(key)).toBe(false);
    });
  });

  test('requested product tabs remain available while removed surfaces canonicalize away', ()=>{
    ['astrochart', 'direction', 'bazi', 'ziwei', 'guolao', 'indiachart', 'auxchart', 'relativechart', 'shusuan', 'mingother', 'jieqichart', 'sanshiunited', 'liureng', 'dunjia', 'guazhan', 'taiyi', 'cnyibu', 'aianalysis'].forEach((key)=>{
      expect(KEEP_TAB_KEYS).toContain(key);
      expect(canonicalizeTabKey(key)).toBe(key);
    });
    ['fengshui', 'planetarium', 'astrochart3D', 'calendar', 'cntradition', 'xuanshi', 'astrodata', 'zeri', 'astroreader', 'liveplayer', 'admintools'].forEach((key)=>{
      expect(REMOVED_TAB_KEYS).toContain(key);
      expect(canonicalizeTabKey(key)).toBe('astrochart');
    });
  });
});
