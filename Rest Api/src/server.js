const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const Concert = require('./models/concert');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Menyajikan file statis dari folder public

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/ping', (req, res) => {
    res.send('pong');
});

// Routes
app.get('/concerts', async (req, res) => {
    const concerts = await Concert.find();
    res.json(concerts);
});

app.get('/concerts/:id', async (req, res) => {
    const concert = await Concert.findById(req.params.id);
    concert ? res.json(concert) : res.status(404).send('Concert not found');
});

app.post('/concerts', async (req, res) => {
    const newConcert = new Concert({
        name: req.body.name,
        location: req.body.location,
        date: req.body.date
    });
    await newConcert.save();
    res.status(201).json(newConcert);
});

app.put('/concerts/:id', async (req, res) => {
    const concert = await Concert.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!concert) return res.status(404).send('Concert not found');
    res.json(concert);
});

app.delete('/concerts/:id', async (req, res) => {
    const concert = await Concert.findByIdAndDelete(req.params.id);
    if (!concert) return res.status(404).send('Concert not found');
    res.send('Concert deleted');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});