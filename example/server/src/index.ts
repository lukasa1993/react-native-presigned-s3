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
    console.log('create', payload)
    res.json(payload)
  } catch (e) {
    console.error('Create Error', req.body, e)
    res.sendStatus(400)
  }
})

app.get('/list', async (req, res) => {
  try {
    res.send(await s3.list(decodeURIComponent(`${req.query.prefix}`)))
  } catch (e) {
    console.error('list Error', req.params, e)
    res.sendStatus(400)
  }
})

app.get('/', async (req, res) => {
  try {
    res.send({
      uri: await s3.get(req.query.key),
      meta: await s3.meta(req.query.key),
    })
  } catch (e) {
    console.error('Key Error', req.query, e)
    res.sendStatus(400)
  }
})

app.delete('/', async (req, res) => {
  try {
    res.send(await s3.remove(decodeURIComponent(`${req.body.key}`)))
  } catch (e) {
    console.error('Delete Error', req.body, e)
    res.sendStatus(400)
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Listening on ${port}`)
})
