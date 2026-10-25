import { ROTATION } from './streets-coordinates';

export const SUN_OFFSET = { x: -85, y: 110, z: 65 };
const { x, y, z } = SUN_OFFSET;
const length = Math.hypot(x, y, z);

// Streets GL stores incoming light in its northing/easting coordinate system.
export const NATIVE_SUN_DIRECTION: [number, number, number] = [
  (Math.sin(ROTATION) * x + Math.cos(ROTATION) * z) / length,
  -y / length,
  (-Math.cos(ROTATION) * x + Math.sin(ROTATION) * z) / length,
];
