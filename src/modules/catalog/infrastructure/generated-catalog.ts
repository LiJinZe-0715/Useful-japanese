import catalogData from "../../../generated/catalog.json";
import type { CoursePackage } from "../domain/content";

export const coursePackages = catalogData as CoursePackage[];
