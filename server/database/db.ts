import mongoose from 'mongoose'

export default function connectDB(): void {
    mongoose.connect(process.env.MONGO_URI as string, {
        dbName: process.env.MONGO_DB_NAME || 'skill_check'
    }).then(() => {
        console.log('MongoDB connected')
    }).catch((err) => {
        console.log(err)
    })
}
