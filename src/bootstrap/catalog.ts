import { createCatalog } from "../modules/catalog/application/course-catalog";
import { coursePackages } from "../modules/catalog/infrastructure/generated-catalog";

export const catalog = createCatalog(coursePackages);
