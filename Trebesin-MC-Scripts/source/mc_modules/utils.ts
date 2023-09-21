import { Vector3 } from "../js_modules/vectorMath";

export function vec3ToString(vector: Vector3): string {
    return `${vector.x},${vector.y},${vector.z}`;
}