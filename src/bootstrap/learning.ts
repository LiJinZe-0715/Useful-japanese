import { createLearning } from "../modules/learning/application/learning";
import { localRecordStore } from "../modules/learning/infrastructure/local-record-store";
export const learning = createLearning(localRecordStore);
