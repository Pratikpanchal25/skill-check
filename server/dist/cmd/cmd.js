"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const mongoose_1 = __importDefault(require("mongoose"));
const user_claims_model_1 = __importDefault(require("../models/user.claims.model"));
const user_tasks_model_1 = __importDefault(require("../models/user.tasks.model"));
const parameters = process.argv.slice(2);
const param0 = parameters[0] || null;
const param1 = parameters[1] || null;
const databaseOptions = {
    dbName: process.env.MONGO_DB_NAME || 'claimcraft'
};
const removeClaimIndexes = async (indexName) => {
    try {
        await user_claims_model_1.default.collection.dropIndex(indexName);
        console.log('Index removed successfully');
    }
    catch (error) {
        console.log('Error occurred in remove index: ', error);
    }
};
const updateCompletedTaskCount = async () => {
    try {
        const userClaims = await user_claims_model_1.default.find({}, { _id: 1 }).lean();
        for (const claim of userClaims) {
            const claimId = claim._id;
            // Count completed tasks for the current claim_id
            const completedTaskCount = await user_tasks_model_1.default.countDocuments({
                claim_id: claimId,
                is_task_completed: true,
                task_title: { $ne: 'Proof of Loss' }
            });
            // Count total tasks for the current claim_id
            const totalTask = await user_tasks_model_1.default.countDocuments({ claim_id: claimId, task_title: { $ne: 'Proof of Loss' } });
            // Update the completed_task field in the UserClaimModel
            await user_claims_model_1.default.updateOne({ _id: claimId }, { $set: { completed_task: completedTaskCount, total_tasks: totalTask } });
        }
        console.log('Successfully updated completed task counts for all claims.');
    }
    catch (error) {
        console.error('Error occurred in update completed task count:', error);
    }
};
mongoose_1.default.set('strictQuery', false);
mongoose_1.default.connect(process.env.MONGO_URI, databaseOptions)
    .then(async () => {
    if (param0 !== null) {
        switch (param0) {
            case 'removeClaimIndex':
                if (param1) {
                    await removeClaimIndexes(param1);
                }
                else {
                    console.log('Command arguments found not properly');
                }
                break;
            case 'updateCompletedTaskCount':
                await updateCompletedTaskCount();
                break;
            default:
                console.log('Command not exist');
                break;
        }
    }
    mongoose_1.default.disconnect();
})
    .catch((err) => {
    console.log('Not Connected to Database ERROR! ', err);
});
