
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
    username: String,
    name: String,
    email: String,
    password_hash: String,
    created_at: { type: Date, default: Date.now }
});

const listingSchema = new mongoose.Schema({
    title: String,
    rent: Number,
    location: String,
    description: String,
    features: Object,
    images: [String],
    source_link: String,
    uploaded_at: Date
});

const favoriteSchema = new mongoose.Schema({
    user_id: mongoose.Schema.Types.ObjectId,
    listing_id: mongoose.Schema.Types.ObjectId,
    created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Listing = mongoose.model('Listing', listingSchema);
const Favorite = mongoose.model('Favorite', favoriteSchema);

// Routes
app.post('/register', async (req, res) => {
    const { username, name, email, password } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const user = new User({ username, name, email, password_hash });
    await user.save();
    res.json({ message: 'User registered' });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password_hash)) {
        res.json({ success: true, name: user.name, username: user.username });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/listings', async (req, res) => {
    const listings = await Listing.find().sort({ uploaded_at: -1 }).limit(100);
    res.json(listings);
});

app.post('/favorites', async (req, res) => {
    const { user_id, listing_id } = req.body;
    const favorite = new Favorite({ user_id, listing_id });
    await favorite.save();
    res.json({ message: 'Favorite saved' });
});

app.get('/favorites/:user_id', async (req, res) => {
    const favorites = await Favorite.find({ user_id: req.params.user_id });
    res.json(favorites);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
