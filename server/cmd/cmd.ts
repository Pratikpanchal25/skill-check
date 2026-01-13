import path from 'path'
import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: path.resolve(__dirname, '../.env') })
import mongoose from 'mongoose'
import UserClaimModel from '../models/user.claims.model'
import userTasksModel from '../models/user.tasks.model'

const parameters = process.argv.slice(2)
const param0 = parameters[0] || null
const param1 = parameters[1] || null
const databaseOptions = {
    dbName: process.env.MONGO_DB_NAME || 'claimcraft'
}

const removeClaimIndexes = async (indexName: string) => {
    try {
        await UserClaimModel.collection.dropIndex(indexName)
        console.log('Index removed successfully')
    } catch (error) {
        console.log('Error occurred in remove index: ', error)
    }
}

const updateCompletedTaskCount = async () => {
    try {
        const userClaims = await UserClaimModel.find({}, { _id: 1 }).lean()

        for (const claim of userClaims) {
            const claimId = claim._id

            // Count completed tasks for the current claim_id
            const completedTaskCount = await userTasksModel.countDocuments({
                claim_id: claimId,
                is_task_completed: true,
                task_title: { $ne: 'Proof of Loss' }
            })

            // Count total tasks for the current claim_id
            const totalTask = await userTasksModel.countDocuments({ claim_id: claimId, task_title: { $ne: 'Proof of Loss' } })

            // Update the completed_task field in the UserClaimModel
            await UserClaimModel.updateOne(
                { _id: claimId },
                { $set: { completed_task: completedTaskCount, total_tasks: totalTask } }
            )
        }

        console.log('Successfully updated completed task counts for all claims.')
    } catch (error) {
        console.error('Error occurred in update completed task count:', error)
    }
}

mongoose.set('strictQuery', false)
mongoose.connect(process.env.MONGO_URI!, databaseOptions)
    .then(async () => {
        if (param0 !== null) {
            switch (param0) {
                case 'removeClaimIndex':
                    if (param1) {
                        await removeClaimIndexes(param1)
                    }
                    else {
                        console.log('Command arguments found not properly')
                    }
                    break
                case 'updateCompletedTaskCount':
                    await updateCompletedTaskCount()
                    break
                default:
                    console.log('Command not exist')
                    break
            }
        }
        mongoose.disconnect()
    })
    .catch((err) => {
        console.log('Not Connected to Database ERROR! ', err)
    })
