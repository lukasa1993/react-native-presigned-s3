import express from 'express'
import s3 from './s3.js'
import bodyParser from 'body-parser'

const app = express()

app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.post('/create', async (req, res) => {
  try {
    const payload = await s3.create(req.body)
    res.json(payload)
  } catch (e) {
    console.error('Create Error', req.body, e)
    res.sendStatus(400)
  }
})

app.get('/:key', async (req, res) => {
  try {
    res.send(await s3.get(req.params.key))
  } catch (e) {
    console.error('Key Error', req.params, e)
    res.sendStatus(400)
  }
})
app.get('/list/:prefix', async (req, res) => {
  try {
    res.send(await s3.list(req.params.prefix))
  } catch (e) {
    console.error('list Error', req.params, e)
    res.sendStatus(400)
  }
})

app.delete('/:key', async (req, res) => {
  try {
    res.send(await s3.remove(req.params.key))
  } catch (e) {
    console.error('Delete Error', req.params, e)
    res.sendStatus(400)
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Listening on ${port}`)
})
