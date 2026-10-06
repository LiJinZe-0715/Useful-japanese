import { createCatalog } from "../modules/catalog/application/catalog";
import { packages } from "../modules/catalog/infrastructure/generated-catalog";
export const catalog = createCatalog(packages);
