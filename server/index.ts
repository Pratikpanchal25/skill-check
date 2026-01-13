import dotenv from 'dotenv'
import express from 'express'
import connectDB from './database/db'
import cors from 'cors'

dotenv.config()

connectDB()

const app = express()
const PORT = process.env.PORT || 3000
app.use(express.json())
app.use(cors({
    origin: '*',
    credentials: true
}))

app.get('/', (req, res) => {
    res.send('API is running')
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})
