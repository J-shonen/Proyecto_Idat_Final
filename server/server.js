const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const expressSession = require('express-session');
require('dotenv').config();
const path = require('path');
const productsRoutes = require('./routes/products');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuración de sesión
app.use(expressSession({ 
    secret: process.env.SESSION_SECRET || 'secreto', 
    resave: false, 
    saveUninitialized: true 
}));
app.use(passport.initialize());
app.use(passport.session());

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/miDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error de conexión a MongoDB:', err));

// Modelo de Producto
const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number
});

const Product = mongoose.model('Product', productSchema);

// Modelo de Cupón
const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discount: { type: Number, required: true }, // En porcentaje
    isActive: { type: Boolean, default: true }, // Estado del cupón
    expiresAt: { type: Date, required: true } // Fecha de expiración
});

const Coupon = mongoose.model('Coupon', couponSchema);

// Rutas de productos
app.use('/api', productsRoutes);

// Ruta base
app.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.render('index', { user: req.user, products });
    } catch (err) {
        console.error('Error al obtener productos:', err);
        res.status(500).send('Error al cargar los productos');
    }
});

// Ruta para obtener la clave pública de Stripe
app.get('/get-stripe-key', (req, res) => {
    res.json({ publicKey: process.env.STRIPE_PUBLIC_KEY });
});

// Configuración de Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/google/callback`
}, (token, tokenSecret, profile, done) => {
    done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Rutas de autenticación
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/');
});
app.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect('/');
    });
});


// Rutas de cupones
app.post('/apply-coupon', async (req, res) => {
    const { couponCode } = req.body;

    try {
        const coupon = await Coupon.findOne({ code: couponCode });
        if (!coupon) {
            return res.status(400).json({ message: 'Cupón no válido' });
        }

        if (!coupon.isActive || new Date(coupon.expiresAt) < new Date()) {
            return res.status(400).json({ message: 'El cupón ha expirado o no está activo' });
        }

        res.json({ discount: coupon.discount });
    } catch (error) {
        console.error('Error al aplicar el cupón:', error);
        res.status(500).json({ message: 'Hubo un error al procesar el cupón' });
    }
});

app.post('/validate-coupon', (req, res) => {
    const { couponCode } = req.body;

    // Ejemplo de validación con una lista de cupones
    const coupons = {
        'DESCUENTO10': 10,
        'BLACKFRIDAY': 50,
    };

    if (coupons[couponCode]) {
        res.json({ valid: true, discount: coupons[couponCode] });
    } else {
        res.json({ valid: false });
    }
});

// Crear PaymentIntent
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, couponCode } = req.body;
        let discount = 0;

        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode });
            if (coupon && coupon.isActive && new Date(coupon.expiresAt) >= new Date()) {
                discount = coupon.discount;
            } else {
                return res.status(400).json({ message: 'Cupón no válido o expirado' });
            }
        }

        const discountedAmount = Math.round(amount - (amount * discount / 100));
        const paymentIntent = await stripe.paymentIntents.create({
            amount: discountedAmount * 100,
            currency: 'usd',
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
            discount
        });
    } catch (error) {
        console.error('Error al crear PaymentIntent:', error);
        res.status(500).send('Hubo un error al crear el intento de pago');
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
