const express = require('express');
const Product = require('../models/product'); // Asegúrate de que la ruta al modelo sea correcta

const router = express.Router();

// Ruta para obtener todos los productos desde MongoDB
router.get('/products', async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const products = await Product.find();  // Obtener productos desde la base de datos
            res.status(200).json(products);  // Enviar la lista de productos
        } catch (err) {
            console.error('Error al obtener productos: ', err);
            res.status(500).json({ message: 'Error al obtener productos' });
        }
    } else {
        res.status(401).json({ message: 'No autenticado' });  // Si no está autenticado, se retorna error
    }
});

module.exports = router;
