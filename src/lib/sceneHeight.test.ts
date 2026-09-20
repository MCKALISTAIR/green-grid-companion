import { describe, expect, it } from 'vitest';
import {
  getSceneIntrinsicHeight,
  IPHONE_DUO_VIEWPORTS,
  SCENE_HEIGHT_CLASSIC_FLOOR_PX,
} from './sceneHeight';

describe('getSceneIntrinsicHeight', () => {
  it('keeps a classic ~400px+ floor on tall phones', () => {
    // iPhone SE (tall aspect, even though height is under 700)
    expect(getSceneIntrinsicHeight(375, 667)).toBeGreaterThanOrEqual(SCENE_HEIGHT_CLASSIC_FLOOR_PX);
    // iPhone 14
    expect(getSceneIntrinsicHeight(390, 844)).toBeGreaterThanOrEqual(SCENE_HEIGHT_CLASSIC_FLOOR_PX);
    // iPhone 17 Pro Max
    expect(getSceneIntrinsicHeight(440, 956)).toBeGreaterThanOrEqual(SCENE_HEIGHT_CLASSIC_FLOOR_PX);
  });

  it('shrinks for iPhone Duo cover without eating the whole screen', () => {
    const { width, height } = IPHONE_DUO_VIEWPORTS.cover;
    const h = getSceneIntrinsicHeight(width, height);
    expect(h).toBeLessThan(height * 0.6);
    expect(h).toBeGreaterThanOrEqual(280);
  });

  it('fits iPhone Duo unfolded landscape under the chrome budget', () => {
    const { width, height } = IPHONE_DUO_VIEWPORTS.inner;
    const h = getSceneIntrinsicHeight(width, height);
    // Leave room for bottom nav (~64) + safe area + content peek
    expect(h).toBeLessThanOrEqual(height * 0.58);
    expect(h).toBeGreaterThanOrEqual(260);
  });

  it('handles Split View half-pane widths', () => {
    const { width, height } = IPHONE_DUO_VIEWPORTS.splitView;
    const h = getSceneIntrinsicHeight(width, height);
    expect(h).toBeGreaterThan(200);
    expect(h).toBeLessThan(height);
  });
});
