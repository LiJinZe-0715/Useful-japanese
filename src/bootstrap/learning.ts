import {createLearningRecords} from "../modules/learning/application/learning-records";
import {localRecordStore} from "../modules/learning/infrastructure/local-record-store";

export const learning = createLearningRecords(localRecordStore);
