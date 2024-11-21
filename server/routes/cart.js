const express = require('express');
const User = require('../models/user');
const Product = require('../models/product');
const router = express.Router();

// Agregar producto al carrito
router.post('/add', async (req, res) => {
  const { userId, productId, quantity } = req.body;
  try {
    const user = await User.findById(userId);
    const product = await Product.findById(productId);

    if (!user || !product) return res.status(404).json({ message: 'Usuario o producto no encontrado' });

    const existingProduct = user.cart.find(item => item.productId.toString() === productId);
    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      user.cart.push({ productId, quantity });
    }

    await user.save();
    res.status(200).json(user.cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Eliminar producto del carrito
router.delete('/remove', async (req, res) => {
  const { userId, productId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    user.cart = user.cart.filter(item => item.productId.toString() !== productId);
    await user.save();

    res.status(200).json(user.cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
